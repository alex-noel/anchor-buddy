import { createHash } from 'node:crypto';
import {
  validateRegionPack,
  type RegionPack,
  type WeatherInterval,
  type SourceRecord,
  type MapContext,
  isMapContext,
} from '@anchor-buddy/domain';
import { ProviderError } from './http.js';
import {
  around,
  boundsGeometry,
  coordinate,
  dateWindow,
  type DiscoverRequest,
  type DiscoveryResult,
  type ForecastResult,
  type ProviderStatus,
} from './live-types.js';
import type { PlacesResult } from './overpass.js';
import type { JsonDiskCache } from './disk-cache.js';

export interface LiveProviders {
  places: { discover(input: DiscoverRequest): Promise<PlacesResult> };
  wind: { forecast(input: DiscoverRequest): Promise<ForecastResult> };
  marine?: { forecast(input: DiscoverRequest): Promise<ForecastResult> };
  ocean?: { forecast(input: DiscoverRequest): Promise<ForecastResult> };
  context?: {
    sample(input: DiscoverRequest): Promise<{
      context?: MapContext;
      sources: SourceRecord[];
      status: ProviderStatus;
      failures?: ('depth' | 'seabed')[];
    }>;
  };
  nws?: {
    forecast(
      input: DiscoverRequest,
    ): Promise<{ frames: WeatherInterval[]; sources: SourceRecord[]; status: ProviderStatus }>;
  };
}
export const DISCOVERY_CAPABILITIES = {
  supported: true,
  worldwide: true,
  maxRadiusNm: 25,
  maxStayDays: 30,
  available: [
    'community boating places',
    'global model wind',
    'US NWS grid forecasts and active alerts',
    'MET Norway significant wave estimates in Northwestern European model coverage',
  ],
  missing: [
    'reviewed bathymetry',
    'complete hazard and habitat coverage',
    'local anchoring permissions',
    'operator tariffs and availability',
    'reviewed tide/current relationships',
  ],
  nauticalAnalysis:
    'Requires separately ingested and locally reviewed regional packs. Live discovery is insufficient evidence for anchoring approval.',
};

/** Retain only failed components, with the corresponding original EMODnet source. */
export function retainMapContext(
  previous: MapContext | undefined,
  current: MapContext | undefined,
  failures: ('depth' | 'seabed')[],
  center: DiscoverRequest['center'],
): { context?: MapContext; retained: string[] } {
  if (
    !previous ||
    !isMapContext(previous) ||
    previous.position[0] !== center[0] ||
    previous.position[1] !== center[1]
  )
    return { context: current, retained: [] };
  const result: MapContext = current
    ? { ...current, sources: [...current.sources] }
    : { position: center, notice: previous.notice, sources: [] };
  const retained: string[] = [];
  for (const field of failures) {
    const source = previous.sources.find(
      (source) =>
        source.id === (field === 'depth' ? 'emodnet-dtm-context' : 'emodnet-seabed-context'),
    );
    if (!source) continue;
    if (field === 'depth' && !result.depth && previous.depth) {
      result.depth = previous.depth;
      result.sources.push(source);
      retained.push(field);
    }
    if (field === 'seabed' && !result.seabed && previous.seabed) {
      result.seabed = previous.seabed;
      result.sources.push(source);
      retained.push(field);
    }
  }
  if (retained.length)
    result.notice =
      `Cached ${retained.join(' and ')} context after an unavailable refresh; original source dates retained. ` +
      result.notice.replace(
        /^Cached .*? context after an unavailable refresh; original source dates retained\. /,
        '',
      );
  return { context: result.depth || result.seabed ? result : undefined, retained };
}

function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}
export function validateDiscovery(value: unknown, now = new Date()): DiscoverRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ProviderError('INVALID_DISCOVERY', 'Discovery requires a centre and radius', 400);
  const input = value as DiscoverRequest;
  if (
    !coordinate(input.center) ||
    typeof input.radiusNm !== 'number' ||
    !Number.isFinite(input.radiusNm) ||
    input.radiusNm < 0.25 ||
    input.radiusNm > 25
  )
    throw new ProviderError(
      'INVALID_DISCOVERY',
      'Centre must be within ±85° latitude and radius between 0.25 and 25 nautical miles',
      400,
    );
  if (
    input.name !== undefined &&
    (typeof input.name !== 'string' || input.name.length > 100 || /[\x00-\x1f]/.test(input.name))
  )
    throw new ProviderError('INVALID_DISCOVERY', 'Region name must be at most 100 characters', 400);
  if (input.timezone !== undefined) {
    try {
      if (typeof input.timezone !== 'string' || input.timezone.length > 100) throw new Error();
      new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format(now);
    } catch {
      throw new ProviderError('INVALID_DISCOVERY', 'timezone must be a valid IANA timezone', 400);
    }
  }
  if (
    (input.from !== undefined && !validDate(input.from)) ||
    (input.until !== undefined && !validDate(input.until))
  )
    throw new ProviderError(
      'INVALID_DISCOVERY',
      'Dates must be ISO timestamps with a timezone',
      400,
    );
  const window = dateWindow(input, now),
    start = Date.parse(window.from),
    end = Date.parse(window.until);
  if (
    end <= start ||
    end - start > 30 * 86400000 ||
    start < now.valueOf() - 86400000 ||
    start > now.valueOf() + 365 * 86400000
  )
    throw new ProviderError(
      'INVALID_DISCOVERY',
      'Stay must be positive, at most 30 days, and start within the next year (or past 24 hours)',
      400,
    );
  const rounded: DiscoverRequest = {
    center: [Number(input.center[0].toFixed(4)), Number(input.center[1].toFixed(4))],
    radiusNm: Number(input.radiusNm.toFixed(3)),
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.timezone ? { timezone: input.timezone } : {}),
    ...window,
  };
  return rounded;
}

/** Only combines intervals where a provider actually returned values. Missing values stay null. */
export function mergeForecasts(
  wind: WeatherInterval[],
  marine: WeatherInterval[],
  nws: WeatherInterval[],
  input: DiscoverRequest,
  ocean: WeatherInterval[] = [],
): WeatherInterval[] {
  const start = Date.parse(input.from!),
    end = Date.parse(input.until!);
  const times = [
    ...new Set([
      start,
      end,
      ...[wind, marine, nws, ocean].flatMap((frames) =>
        frames.flatMap((frame) => [Date.parse(frame.validFrom), Date.parse(frame.validUntil)]),
      ),
    ]),
  ]
    .filter((time) => time >= start && time <= end)
    .sort((a, b) => a - b);
  const at = (frames: WeatherInterval[], time: number) =>
    frames.find(
      (frame) => Date.parse(frame.validFrom) <= time && Date.parse(frame.validUntil) > time,
    );
  const merged: WeatherInterval[] = [];
  for (let index = 0; index < times.length - 1; index++) {
    const from = times[index]!,
      until = times[index + 1]!;
    const global = at(wind, from),
      sea = at(marine, from),
      local = at(nws, from),
      regionalSea = at(ocean, from);
    if (!global && !sea && !local && !regionalSea) continue;
    const contributors = [global, sea, local, regionalSea].filter(
      (item): item is WeatherInterval => !!item,
    );
    merged.push({
      validFrom: new Date(from).toISOString(),
      validUntil: new Date(until).toISOString(),
      windKnots: local?.windKnots ?? global?.windKnots ?? null,
      gustKnots: local?.gustKnots ?? global?.gustKnots ?? null,
      windDirectionDeg: local?.windDirectionDeg ?? global?.windDirectionDeg ?? null,
      waveM: local?.waveM ?? regionalSea?.waveM ?? sea?.waveM ?? null,
      swellM: sea?.swellM ?? null,
      currentKnots: null,
      currentDirectionDeg: null,
      warnings: [...new Set(contributors.flatMap((item) => item.warnings))],
      sourceIds: [...new Set(contributors.flatMap((item) => item.sourceIds))],
      coverageAreaIds: ['live-weather-request'],
    });
  }
  return merged;
}

export class DiscoveryService {
  private readonly packs = new Map<string, RegionPack>();
  private readonly pending = new Map<string, Promise<DiscoveryResult>>();
  private readonly recent = new Map<string, DiscoveryResult>();
  constructor(
    private readonly providers: LiveProviders,
    private readonly now: () => Date = () => new Date(),
    private readonly diskCache?: JsonDiskCache,
  ) {}
  get(regionId: string, version?: string): RegionPack | undefined {
    return version
      ? this.packs.get(`${regionId}/${version}`)
      : [...this.packs.values()].reverse().find((pack) => pack.id === regionId);
  }
  async restore(regionId: string, version?: string): Promise<RegionPack | undefined> {
    const memory = this.get(regionId, version);
    if (memory) return memory;
    const stored = version
      ? await this.diskCache?.read<{ provenanceVersion?: number; value?: RegionPack }>(
          `pack:${regionId}/${version}`,
        )
      : undefined;
    const result = version
      ? stored?.provenanceVersion === 2
        ? stored.value
        : undefined
      : (await this.previous(regionId))?.pack;
    if (
      result &&
      result.id === regionId &&
      (!version || result.version === version) &&
      validateRegionPack(result).length === 0 &&
      result.validation.status === 'unreviewed' &&
      result.sources.every((source) => source.synthetic === false)
    ) {
      this.remember(result);
      return result;
    }
    return undefined;
  }
  private remember(pack: RegionPack) {
    if (this.packs.size >= 64) this.packs.delete(this.packs.keys().next().value!);
    this.packs.set(`${pack.id}/${pack.version}`, pack);
  }
  private async previous(id: string): Promise<DiscoveryResult | undefined> {
    const stored = await this.diskCache?.read<
      { provenanceVersion?: number; value?: DiscoveryResult } & Partial<DiscoveryResult>
    >(`latest:${id}`);
    let value = this.recent.get(id) ?? (stored?.provenanceVersion === 2 ? stored.value : undefined);
    // Earlier development caches conflated expiry with requery limits. Keep valid POIs/context,
    // but never replay their forecast dates as trustworthy evidence.
    if (!value && stored?.pack && validateRegionPack(stored.pack).length === 0) {
      value = structuredClone(stored) as DiscoveryResult;
      const ids = new Set(
        [...value.pack.places, ...(value.pack.marks ?? [])].flatMap((item) => item.sourceIds),
      );
      value.pack.weather = [];
      value.pack.coverage = [];
      value.pack.sources = value.pack.sources.filter((source) => ids.has(source.id));
      value.pack.version += '-expiry-unverified';
    }
    if (
      !value?.pack ||
      value.pack.id !== id ||
      value.pack.validation.status !== 'unreviewed' ||
      validateRegionPack(value.pack).length ||
      value.pack.sources.some((source) => source.synthetic !== false) ||
      Date.parse(value.pack.generatedAt) < this.now().valueOf() - 30 * 86400000 ||
      Date.parse(value.pack.generatedAt) > this.now().valueOf() + 300000
    )
      return undefined;
    return value;
  }
  async discover(value: unknown): Promise<DiscoveryResult> {
    const input = validateDiscovery(value, this.now());
    const key = JSON.stringify(input);
    const pending = this.pending.get(key);
    if (pending) return pending;
    if (this.pending.size >= 8)
      throw new ProviderError('RATE_LIMITED', 'Live discovery is busy; retry shortly', 429);
    const operation = this.load(input);
    this.pending.set(key, operation);
    try {
      return await operation;
    } finally {
      this.pending.delete(key);
    }
  }
  private async load(input: DiscoverRequest): Promise<DiscoveryResult> {
    const id =
      'live-' +
      createHash('sha256')
        .update(JSON.stringify({ center: input.center, radiusNm: input.radiusNm }))
        .digest('hex')
        .slice(0, 20);
    const previous = await this.previous(id);
    const providers: ProviderStatus[] = [];
    const sources: SourceRecord[] = [];
    const inUs =
      (input.center[0] >= -130 &&
        input.center[0] <= -60 &&
        input.center[1] >= 17 &&
        input.center[1] <= 51) ||
      (input.center[0] <= -130 && input.center[1] >= 50) ||
      (input.center[0] >= -161 &&
        input.center[0] <= -154 &&
        input.center[1] >= 18 &&
        input.center[1] <= 23);
    async function safe<T>(
      id: string,
      name: string,
      action: () => Promise<T>,
    ): Promise<T | undefined> {
      try {
        return await action();
      } catch (error) {
        const disabled = error instanceof ProviderError && error.code === 'CONFIGURATION_REQUIRED';
        providers.push({
          id,
          name,
          status: disabled
            ? 'disabled'
            : error instanceof ProviderError && error.code === 'OUTSIDE_COVERAGE'
              ? 'not-covered'
              : 'unavailable',
          message:
            error instanceof ProviderError
              ? error.message
              : 'Provider unavailable or timed out; missing data remains unknown.',
        });
        return undefined;
      }
    }
    const [places, wind, marine, nws, ocean, context] = await Promise.all([
      safe('osm-overpass', 'OpenStreetMap boating places', () =>
        this.providers.places.discover(input),
      ),
      safe('met-norway', 'MET Norway global wind forecast', () =>
        this.providers.wind.forecast(input),
      ),
      this.providers.marine
        ? safe('open-meteo-marine', 'Open-Meteo marine waves', () =>
            this.providers.marine!.forecast(input),
          )
        : undefined,
      inUs && this.providers.nws
        ? safe('nws-grid', 'NWS marine grids and active alerts', () =>
            this.providers.nws!.forecast(input),
          )
        : undefined,
      this.providers.ocean
        ? safe('met-ocean', 'MET Norway Northwestern Europe waves', () =>
            this.providers.ocean!.forecast(input),
          )
        : undefined,
      this.providers.context
        ? safe('emodnet-context', 'EMODnet European map context', () =>
            this.providers.context!.sample(input),
          )
        : undefined,
    ]);
    for (const result of [places, wind, marine, ocean])
      if (result) {
        sources.push(result.source);
        providers.push(result.status);
      }
    if (nws) {
      sources.push(...nws.sources);
      providers.push(nws.status);
    }
    if (context) providers.push(context.status);
    if (!inUs)
      providers.push({
        id: 'nws-grid',
        name: 'NWS marine grids and active alerts',
        status: 'not-covered',
        message:
          'NWS point forecasts and alerts are regional US services; no global official warnings are assumed.',
      });
    if (!this.providers.marine)
      providers.push({
        id: 'open-meteo-marine',
        name: 'Optional global wave forecasts',
        status: 'disabled',
        message:
          'Global marine wave adapter requires an explicitly licensed deployment. Free hosted Open-Meteo access is non-commercial only.',
        documentationUrl: 'https://open-meteo.com/en/terms',
      });
    providers.push({
      id: 'coops',
      name: 'NOAA tides and currents',
      status: 'not-covered',
      message:
        'Automatic nearest-station extrapolation is disabled. Use the tide endpoint only with a configured, reviewed station-area relationship; no such evidence is assembled by live discovery.',
      documentationUrl: 'https://api.tidesandcurrents.noaa.gov/api/dev/',
    });
    providers.push({
      id: 'nautical-analysis',
      name: 'Reviewed depth, hazards and anchoring rules',
      status: 'not-covered',
      message:
        'No reviewed global chart, habitat, jurisdiction or tariff evidence is supplied by live discovery. Download a separately reviewed regional analysis pack.',
    });
    const generatedAt = this.now().toISOString();
    const bounds = around(input.center, input.radiusNm);
    let weather = mergeForecasts(
      wind?.frames ?? [],
      marine?.frames ?? [],
      nws?.frames ?? [],
      input,
      ocean?.frames ?? [],
    );
    const notices = [
      'Real public source data, with incomplete nautical evidence. Every place needs local verification; no safe drop positions can be generated from these sources.',
      'Forecasts describe the requested coordinate, not shelter or all positions in the search radius. Gaps beyond forecast horizons remain unknown.',
      'Community-mapped buoys and harbours do not establish overnight permission, available berths, depth or price. Prices remain unknown.',
      'Distance is straight-line distance. No navigation route or verified approach is provided.',
    ];
    let retainedPlaces = places?.places ?? [],
      retainedMarks = places?.marks ?? [];
    if (
      previous &&
      (!places || places.status.status === 'partial') &&
      (previous.pack.places.length || (previous.pack.marks?.length ?? 0))
    ) {
      const freshIds = new Set(retainedPlaces.map((place) => place.id));
      const freshMarkIds = new Set(retainedMarks.map((mark) => mark.id));
      const oldPlaces = previous.pack.places.filter((place) => !freshIds.has(place.id));
      const oldMarks = (previous.pack.marks ?? []).filter((mark) => !freshMarkIds.has(mark.id));
      if (oldPlaces.length || oldMarks.length) {
        retainedPlaces = [...retainedPlaces, ...oldPlaces];
        retainedMarks = [...retainedMarks, ...oldMarks];
        const ids = new Set([...oldPlaces, ...oldMarks].flatMap((item) => item.sourceIds));
        sources.push(...previous.pack.sources.filter((source) => ids.has(source.id)));
        const message = `${oldPlaces.length} cached places and ${oldMarks.length} cached marks retained because the refresh was unavailable or incomplete. Their original source dates and unknown permissions remain unchanged.`;
        notices.push(message);
        providers.push({
          id: 'cached-places',
          name: 'Retained boating places',
          status: 'partial',
          message,
          retrievedAt:
            previous.pack.sources
              .filter((source) => ids.has(source.id))
              .map((source) => source.retrievedAt)
              .sort()[0] ?? previous.pack.generatedAt,
          validUntil:
            previous.pack.sources
              .filter((source) => ids.has(source.id))
              .map((source) => source.validUntil)
              .sort()[0] ?? previous.pack.validUntil,
        });
      }
    }
    if (!weather.length && previous) {
      weather = previous.pack.weather.filter(
        (frame) =>
          Date.parse(frame.validUntil) > Date.parse(input.from!) &&
          Date.parse(frame.validFrom) < Date.parse(input.until!),
      );
      if (weather.length) {
        const ids = new Set(weather.flatMap((frame) => frame.sourceIds));
        sources.push(...previous.pack.sources.filter((source) => ids.has(source.id)));
        const message =
          'Cached forecast intervals retained after a failed refresh. Original retrieval and expiry dates remain unchanged; expired forecasts cannot establish suitability.';
        notices.push(message);
        providers.push({
          id: 'cached-weather',
          name: 'Retained weather evidence',
          status: 'partial',
          message,
          retrievedAt:
            previous.pack.sources
              .filter((source) => ids.has(source.id))
              .map((source) => source.retrievedAt)
              .sort()[0] ?? previous.pack.generatedAt,
          validUntil:
            previous.pack.sources
              .filter((source) => ids.has(source.id))
              .map((source) => source.validUntil)
              .sort()[0] ?? previous.pack.validUntil,
        });
      }
    }
    const recoveredContext = retainMapContext(
      previous?.mapContext,
      context?.context,
      context?.failures ?? (!context && this.providers.context ? ['depth', 'seabed'] : []),
      input.center,
    );
    const mapContext = recoveredContext.context;
    if (recoveredContext.retained.length) {
      const message = `Cached ${recoveredContext.retained.join(' and ')} context retained after an unavailable refresh; original source dates remain unchanged.`;
      notices.push(message);
      providers.push({
        id: 'cached-context',
        name: 'Retained European map context',
        status: 'partial',
        message,
      });
    }
    if (bounds[0] === -180 || bounds[2] === 180)
      notices.push(
        'The displayed request bounds are clipped at the date line; coordinates on the opposite side may be returned by the radius query. No complete coverage is implied.',
      );
    const pack: RegionPack = {
      id,
      version: generatedAt.replace(/[^0-9]/g, ''),
      name: input.name ?? `Live area ${input.center[1].toFixed(3)}, ${input.center[0].toFixed(3)}`,
      generatedAt,
      validUntil: new Date(Date.parse(generatedAt) + 900000).toISOString(),
      timezone: input.timezone ?? 'UTC',
      bounds,
      validation: { status: 'unreviewed', notice: notices[0]! },
      sources: [...new Map(sources.map((source) => [source.id, source])).values()],
      coverage: weather.length
        ? [
            {
              id: 'live-weather-request',
              layer: 'weather',
              geometry: boundsGeometry(bounds),
              sourceIds: [...new Set(weather.flatMap((frame) => frame.sourceIds))],
              validFrom: weather[0]!.validFrom,
              validUntil: weather[weather.length - 1]!.validUntil,
              complete: false,
            },
          ]
        : [],
      depths: [],
      hazards: [],
      restrictions: [],
      tides: [],
      weather,
      places: retainedPlaces,
      marks: retainedMarks,
      holdingAreas: [],
      chart: {
        attribution:
          '© OpenStreetMap contributors. Public boating features; no navigational chart.',
        offlineAllowed: true,
      },
    };
    pack.version +=
      '-' + createHash('sha256').update(JSON.stringify(pack)).digest('hex').slice(0, 10);
    const errors = validateRegionPack(pack);
    if (errors.length || pack.sources.some((source) => source.synthetic !== false))
      throw new ProviderError(
        'INVALID_LIVE_DATA',
        'Live data failed validation; no assessment was produced',
      );
    this.remember(pack);
    const result: DiscoveryResult = {
      pack,
      providers,
      notices,
      requestedArea: { center: input.center, radiusNm: input.radiusNm, bounds },
      partial: true,
      ...(mapContext ? { mapContext } : {}),
    };
    if (this.recent.size >= 64) this.recent.delete(this.recent.keys().next().value!);
    this.recent.set(id, result);
    try {
      await this.diskCache?.write(`pack:${id}/${pack.version}`, {
        provenanceVersion: 2,
        value: pack,
      });
      await this.diskCache?.write(`latest:${id}`, { provenanceVersion: 2, value: result });
    } catch {
      result.notices.push(
        'Server disk cache could not be updated. The returned source data is available for the device to save locally.',
      );
    }
    return result;
  }
}
