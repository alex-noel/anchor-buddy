import Fastify, { LogController } from 'fastify';
import {
  createDemoPack,
  DEFAULT_VESSEL,
  createDefaultSearch,
  searchRegion,
  estimateCost,
  validateVessel,
  validateSearch,
  validateRegionPack,
  type VesselProfile,
  type SearchRequest,
  type SearchOptions,
  type RegionPack,
} from '@anchor-buddy/domain';
import { FilePackStore, PackError, type PackStore } from './packs.js';
import { PROVIDERS } from './providers/contracts.js';
import { GovernmentHttp, ProviderError } from './providers/http.js';
import { NwsProvider } from './providers/nws.js';
import { CoopsProvider, type StationMapping } from './providers/coops.js';
import { createLiveServices } from './providers/live-factory.js';
import { DiscoveryService, DISCOVERY_CAPABILITIES } from './providers/discovery.js';
import { NominatimProvider } from './providers/geocode.js';
import { OpenFreeMapProxy } from './providers/map-proxy.js';
import { PROJECT_USER_AGENT } from './providers/live-types.js';

export interface AppOptions {
  packStore?: PackStore;
  logger?: boolean;
  now?: () => Date;
  weather?: NwsProvider;
  tide?: CoopsProvider;
  stationMappings?: StationMapping[];
  discovery?: DiscoveryService;
  geocoder?: NominatimProvider;
  mapFetch?: typeof fetch;
}
interface SearchBody {
  regionId: string;
  version?: string;
  vessel: VesselProfile;
  search: SearchRequest;
  options?: SearchOptions;
}
const DEMO_ID = 'florida-keys-demo';

function optionsErrors(value: unknown): string[] {
  if (value === undefined) return [];
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return ['options must be an object'];
  const options = value as SearchOptions;
  if (options.sortBy && !['distance', 'price', 'depth', 'exposure'].includes(options.sortBy))
    return ['Unknown sort order'];
  for (const [key, minimum, maximum] of [
    ['gridSpacingM', 100, 5000],
    ['clusterDistanceM', 0, 10000],
    ['maxGeneratedCandidates', 1, 2000],
  ] as const) {
    const numeric = options[key];
    if (
      numeric !== undefined &&
      (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum)
    )
      return [`${key} is outside server limits`];
  }
  if (options.filters !== undefined) {
    if (!options.filters || typeof options.filters !== 'object')
      return ['filters must be an object'];
    const allowed = {
      fee: ['free', 'paid', 'unknown'],
      kinds: ['marina', 'dock', 'mooring', 'anchorage', 'generated'],
      statuses: ['passes', 'excluded', 'insufficient_evidence'],
    };
    for (const key of ['fee', 'kinds', 'statuses'] as const) {
      const items = options.filters[key];
      if (
        items !== undefined &&
        (!Array.isArray(items) || items.some((item) => !(allowed[key] as string[]).includes(item)))
      )
        return [`Invalid ${key} filter`];
    }
  }
  return [];
}

export function createApp(options: AppOptions = {}) {
  const app = Fastify({
    logger: options.logger
      ? { redact: ['req.headers.authorization', 'req.headers.cookie', 'body.token', 'body.apiKey'] }
      : false,
    bodyLimit: 256 * 1024,
    logController: new LogController({ disableRequestLogging: true }),
  });
  const store = options.packStore ?? new FilePackStore(process.env.PACK_ROOT ?? './data/packs');
  const now = options.now ?? (() => new Date());
  const userAgent = process.env.NWS_USER_AGENT ?? PROJECT_USER_AGENT;
  const weather =
    options.weather ??
    new NwsProvider(
      new GovernmentHttp({ providerId: 'nws-grid', userAgent, hosts: ['api.weather.gov'] }),
    );
  const tide =
    options.tide ??
    new CoopsProvider(
      new GovernmentHttp({
        providerId: 'coops',
        userAgent,
        hosts: ['api.tidesandcurrents.noaa.gov'],
        ttlSeconds: 3600,
      }),
      options.stationMappings,
    );
  const live = createLiveServices(weather, now);
  const discovery = options.discovery ?? live.discovery;
  const geocoder = options.geocoder ?? live.geocoder;
  const mapProxy = new OpenFreeMapProxy(options.mapFetch);
  const allowedOrigins = new Set(
    (
      process.env.CORS_ALLOWED_ORIGINS ??
      'http://localhost:8081,http://localhost:8082,http://127.0.0.1:8081,http://127.0.0.1:8082'
    )
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (!origin) return;
    if (!allowedOrigins.has(origin)) return reply.code(403).send({ error: 'ORIGIN_NOT_ALLOWED' });
    reply.header('Access-Control-Allow-Origin', origin).header('Vary', 'Origin');
    if (request.method === 'OPTIONS') {
      const method = request.headers['access-control-request-method'];
      const headers = String(request.headers['access-control-request-headers'] ?? '')
        .toLowerCase()
        .split(',')
        .map((header) => header.trim())
        .filter(Boolean);
      if (
        !['GET', 'POST'].includes(String(method)) ||
        headers.some((header) => header !== 'content-type')
      )
        return reply.code(403).send({ error: 'PREFLIGHT_NOT_ALLOWED' });
      if (!app.findRoute({ method: method as 'GET' | 'POST', url: request.url }))
        return reply.code(403).send({ error: 'PREFLIGHT_ROUTE_NOT_ALLOWED' });
      return reply
        .header('Access-Control-Allow-Methods', 'GET, POST')
        .header('Access-Control-Allow-Headers', 'Content-Type')
        .header('Access-Control-Max-Age', '600')
        .code(204)
        .send();
    }
  });
  app.options('/*', async (_request, reply) => reply.code(204).send());

  async function pack(regionId: string, version?: string): Promise<RegionPack> {
    const livePack = discovery.get(regionId, version);
    if (livePack) return livePack;
    const value =
      regionId === DEMO_ID ? createDemoPack(now()) : await store.assessment(regionId, version);
    const errors = validateRegionPack(value);
    if (errors.length)
      throw new PackError('INVALID_ASSESSMENT', 'Regional assessment data failed validation', 503);
    if (regionId !== DEMO_ID && value.validation.status !== 'reviewed')
      throw new PackError('REVIEW_REQUIRED', 'Assessment snapshot is not reviewed', 503);
    return value;
  }
  function validate(body: SearchBody) {
    const errors = [
      ...validateVessel(body?.vessel),
      ...validateSearch(body?.search),
      ...optionsErrors(body?.options),
    ];
    if (
      !body ||
      typeof body.regionId !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(body.regionId)
    )
      errors.push('regionId is required');
    if (body?.search?.maxDistanceNm > 30)
      errors.push('Search radius exceeds this regional service limit (30 nm)');
    if (Date.parse(body?.search?.departure) - Date.parse(body?.search?.arrival) > 7 * 86400000)
      errors.push('Search stay exceeds seven days');
    return errors;
  }
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof PackError)
      return reply.code(error.status).send({ error: error.code, message: error.message });
    if (error instanceof ProviderError)
      return reply
        .code(
          error.status === 400
            ? 400
            : error.status === 429 || error.code === 'RATE_LIMITED'
              ? 429
              : 502,
        )
        .send({ error: error.code, message: error.message });
    const known = error as { statusCode?: number };
    if (known.statusCode && known.statusCode >= 400 && known.statusCode < 500)
      return reply
        .code(known.statusCode)
        .send({ error: 'INVALID_REQUEST', message: 'Request does not match the API contract' });
    app.log.error({ err: error }, 'Request failed');
    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Request could not be completed; no assessment was produced',
    });
  });
  app.get('/health', async () => ({
    status: 'ok',
    service: 'anchorbuddy-api',
    assistant: 'partner-access-pending',
    nauticalRelease: 'review-required',
    liveDiscovery: DISCOVERY_CAPABILITIES,
  }));
  app.get('/v1/providers', async () => ({ providers: PROVIDERS }));
  app.get('/v1/regions', async () => ({
    discovery: DISCOVERY_CAPABILITIES,
    regions: [
      {
        id: DEMO_ID,
        version: 'synthetic',
        label: 'Florida Keys demonstration — invented data',
        synthetic: true,
        releaseStatus: 'demo-only',
      },
      ...(await store.regions()),
    ],
  }));
  app.post<{ Body: unknown }>('/v1/regions/discover', async (request, reply) =>
    reply.header('Cache-Control', 'no-store').send(await discovery.discover(request.body)),
  );
  app.get<{ Querystring: { q?: string } }>('/v1/geocode', async (request, reply) => {
    if (typeof request.query.q !== 'string')
      return reply
        .code(400)
        .send({ error: 'INVALID_QUERY', message: 'Submit a place name using q' });
    return geocoder.search(request.query.q);
  });
  app.get<{ Querystring: { url?: string } }>('/v1/maps/resource', async (request, reply) => {
    const resource = await mapProxy.resource(request.query.url);
    return reply
      .header('Content-Type', resource.contentType)
      .header('Cache-Control', resource.cacheControl)
      .send(resource.bytes);
  });
  app.get('/v1/demo', async () => ({
    pack: createDemoPack(now()),
    vessel: DEFAULT_VESSEL,
    search: createDefaultSearch(now()),
    warning:
      'Synthetic demonstration. Do not use these positions, depths, tariffs or forecasts for navigation or anchoring.',
  }));
  app.get<{ Params: { regionId: string }; Querystring: { version?: string } }>(
    '/v1/regions/:regionId/manifest',
    async (request, reply) => {
      const manifest = await store.manifest(request.params.regionId, request.query.version);
      return reply
        .header(
          'Cache-Control',
          request.query.version ? 'public, max-age=31536000, immutable' : 'no-cache',
        )
        .send(manifest);
    },
  );
  app.get<{ Params: { regionId: string; version: string; name: string } }>(
    '/v1/regions/:regionId/:version/assets/:name',
    async (request, reply) => {
      const { buffer, asset } = await store.asset(
        request.params.regionId,
        request.params.version,
        request.params.name,
      );
      return reply
        .header('Content-Type', asset.mediaType)
        .header('ETag', `"${asset.sha256}"`)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(buffer);
    },
  );
  app.post<{ Body: SearchBody }>('/v1/search', async (request, reply) => {
    const errors = validate(request.body);
    if (errors.length) return reply.code(400).send({ error: 'INVALID_SEARCH', details: errors });
    const body = request.body;
    const snapshot = await pack(body.regionId, body.version);
    return searchRegion(
      snapshot,
      body.vessel,
      body.search,
      {
        ...body.options,
        gridSpacingM: body.options?.gridSpacingM ?? 500,
        maxGeneratedCandidates: body.options?.maxGeneratedCandidates ?? 500,
      },
      { assessedAt: now().toISOString(), purpose: 'current' },
    );
  });
  app.post<{ Body: SearchBody & { placeId: string } }>('/v1/estimate', async (request, reply) => {
    const errors = validate(request.body);
    if (errors.length) return reply.code(400).send({ error: 'INVALID_ESTIMATE', details: errors });
    const body = request.body;
    const snapshot = await pack(body.regionId, body.version);
    const place = snapshot.places.find((item) => item.id === body.placeId);
    if (!place) return reply.code(404).send({ error: 'PLACE_NOT_FOUND' });
    return {
      estimate: estimateCost(place, body.vessel, body.search),
      simulated: snapshot.validation.status === 'synthetic',
      availability: place.availability,
      notice: 'Estimate does not imply berth availability.',
    };
  });
  app.get<{ Querystring: { latitude: string; longitude: string } }>(
    '/v1/weather',
    async (request, reply) => {
      const latitude = Number(request.query.latitude),
        longitude = Number(request.query.longitude);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < 24 ||
        latitude > 26 ||
        longitude < -83 ||
        longitude > -79
      )
        return reply
          .code(400)
          .send({ error: 'OUTSIDE_REGION', message: 'A Florida Keys coordinate is required' });
      return weather.marine(latitude, longitude);
    },
  );
  app.post<{ Body: Parameters<CoopsProvider['predictions']>[0] }>(
    '/v1/tides',
    async (request, reply) => {
      if (!request.body || typeof request.body.mappingId !== 'string')
        return reply.code(400).send({ error: 'MAPPING_REQUIRED' });
      return tide.predictions(request.body, now());
    },
  );
  app.post('/v1/assistant', async (_request, reply) =>
    reply.code(503).send({
      error: 'PARTNER_ACCESS_PENDING',
      message:
        'ChatGPT subscription authorization is not enabled. Partner approval and approved mobile authorization must be verified before activation.',
      billingFallback: false,
      coreAvailable: true,
    }),
  );
  return app;
}
