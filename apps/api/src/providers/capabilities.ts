import type { EvidenceRight } from '@anchor-buddy/domain';
import {
  PROVIDERS,
  PROVIDER_CAPABILITY_SCHEMA_VERSION,
  type ProviderCapabilityReport,
  type ProviderCapabilityStatus,
  type ProviderProductDescriptor,
  type PublicProviderProduct,
} from './contracts.js';
import { coordinate, type DiscoverRequest } from './live-types.js';
import { mayHaveOceanForecast } from './met-ocean.js';
import { usesEuropeExtract } from './place-router.js';

const verifiedAt = '2026-11-11T20:18:47Z';
const metPolicy = 'https://api.met.no/doc/TermsOfService';
const metLicense = 'https://api.met.no/doc/License';
const metUpdate = 'https://docs.api.met.no/doc/locationforecast/FAQ.html';
const emodnetPolicy =
  'https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products';
const osmLicense = 'https://www.openstreetmap.org/copyright';
const nominatimPolicy = 'https://operations.osmfoundation.org/policies/nominatim/';
const nwsPolicy = 'https://www.weather.gov/documentation/services-web-api';
const nwsDisclaimer = 'https://www.weather.gov/disclaimer';
const coopsPolicy = 'https://tidesandcurrents.noaa.gov/disclaimers.html';
const openMeteoPolicy = 'https://open-meteo.com/en/terms';
const openFreeMapPolicy = 'https://openfreemap.org/tos/';
const openFreeMapProduct = 'https://openfreemap.org/';
const legacyById = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

const unknownRight = (): EvidenceRight => ({
  status: 'unknown',
  policyUrl: null,
  verifiedAt: null,
  entitlementId: null,
});

const permitted = (policyUrl: string): EvidenceRight => ({
  status: 'permitted',
  policyUrl,
  verifiedAt,
  entitlementId: null,
});

function rights(
  onlineDisplay?: string,
  offlineStorage?: string,
  analysis?: string,
): ProviderProductDescriptor['rights'] {
  return {
    onlineDisplay: onlineDisplay ? permitted(onlineDisplay) : unknownRight(),
    offlineStorage: offlineStorage ? permitted(offlineStorage) : unknownRight(),
    analysis: analysis ? permitted(analysis) : unknownRight(),
  };
}

type ProductDetails = Pick<
  ProviderProductDescriptor,
  'productId' | 'role' | 'activation' | 'rights'
> & {
  extent: ProviderProductDescriptor['geography']['routingExtent'];
  policyUrls: readonly string[];
  policyConditions: string;
  refreshConditions: string;
  minRequerySeconds?: number;
  fallbackCacheSeconds?: number | null;
  name?: string;
  sourceUrl?: string;
};

function product(providerId: string, details: ProductDetails): ProviderProductDescriptor {
  const legacy = legacyById.get(providerId);
  if (!legacy) throw new Error('Provider registry references an unknown provider.');
  return {
    providerId,
    productId: details.productId,
    name: details.name ?? legacy.name,
    implementation: details.activation === 'pending' ? 'pending' : 'implemented',
    activation: details.activation,
    role: details.role,
    geography: { routingExtent: details.extent, description: legacy.coverage },
    authentication: legacy.authentication,
    sourceUrl: details.sourceUrl ?? legacy.documentationUrl,
    policy: {
      urls: details.policyUrls,
      lastVerifiedAt: details.policyUrls.length ? verifiedAt : null,
      conditions: details.policyConditions,
    },
    attribution: legacy.attribution,
    refresh: {
      minRequerySeconds: details.minRequerySeconds ?? null,
      fallbackCacheSeconds:
        details.fallbackCacheSeconds === undefined
          ? legacy.freshnessSeconds
          : details.fallbackCacheSeconds,
      conditions: details.refreshConditions,
    },
    rights: details.rights,
  };
}

export const PROVIDER_PRODUCTS: readonly ProviderProductDescriptor[] = [
  product('met-norway', {
    productId: 'met-locationforecast-wind',
    role: 'point-forecast',
    activation: 'default',
    extent: 'global',
    policyUrls: [metPolicy, metLicense, metUpdate],
    policyConditions:
      'Credit MET Norway, link the license, identify changes and identify the app to the service.',
    refreshConditions:
      'Wait at least three hours or until a later provider expiry. The request delay never extends usable evidence.',
    minRequerySeconds: 10800,
    fallbackCacheSeconds: 900,
    rights: rights(metLicense, metLicense, metLicense),
  }),
  product('met-ocean', {
    productId: 'met-oceanforecast-waves',
    role: 'point-forecast',
    activation: 'default',
    extent: 'northwestern-europe',
    policyUrls: [metPolicy, metLicense],
    policyConditions:
      'Credit MET Norway and preserve the returned model point. Significant wave height does not bound individual waves.',
    refreshConditions:
      'Respect provider expiry and retain original model issue and retrieval times.',
    fallbackCacheSeconds: 3600,
    rights: rights(metLicense, metLicense, metLicense),
  }),
  product('emodnet-context', {
    productId: 'emodnet-dtm-context',
    name: 'EMODnet DTM point depth',
    sourceUrl: 'https://emodnet.ec.europa.eu/en/bathymetry',
    role: 'scientific-context',
    activation: 'default',
    extent: 'europe-context',
    policyUrls: [emodnetPolicy],
    policyConditions:
      'EU-created products generally use CC BY 4.0. Confirm the sampled dataset and any originator terms before offline redistribution or analytical reuse.',
    refreshConditions: 'Retain original source dates, LAT reference and signed model values.',
    rights: rights(emodnetPolicy),
  }),
  product('emodnet-context', {
    productId: 'emodnet-seabed-context',
    name: 'EMODnet seabed substrate point classification',
    sourceUrl: 'https://emodnet.ec.europa.eu/en/geology',
    role: 'scientific-context',
    activation: 'default',
    extent: 'europe-context',
    policyUrls: [emodnetPolicy],
    policyConditions:
      'Credit EMODnet and the cited dataset originator. Individual geology records may have their own conditions. Confirm them before redistribution or analytical reuse.',
    refreshConditions: 'Retain original source dates, class, scale and originator references.',
    rights: rights(emodnetPolicy),
  }),
  product('osm-overpass', {
    productId: 'osm-overpass-global',
    name: 'OpenStreetMap boating places and seamarks, global endpoint',
    role: 'place-context',
    activation: 'overpass-global',
    extent: 'global',
    policyUrls: [osmLicense, 'https://dev.overpass-api.de/overpass-doc/en/preface/commons.html'],
    policyConditions:
      'OSM data carry attribution and ODbL obligations. The actual selected endpoint requires separate service policy review.',
    refreshConditions:
      'Use bounded requests, cache results and respect provider cooldown. Community coverage can be incomplete.',
    rights: rights(),
  }),
  product('osm-overpass', {
    productId: 'osm-overpass-europe',
    name: 'OpenStreetMap boating places and seamarks, Europe extract',
    role: 'place-context',
    activation: 'overpass-europe',
    extent: 'europe-extract',
    policyUrls: [osmLicense, 'https://dev.overpass-api.de/overpass-doc/en/preface/commons.html'],
    policyConditions:
      'OSM data carry attribution and ODbL obligations. The Europe extract host requires separate service policy review.',
    refreshConditions:
      'Use bounded requests, cache results and respect provider cooldown. Route only if the full search disk fits the extract.',
    rights: rights(),
  }),
  product('nominatim', {
    productId: 'nominatim-submitted-search',
    role: 'place-context',
    activation: 'default',
    extent: 'global',
    policyUrls: [nominatimPolicy, osmLicense],
    policyConditions:
      'Public service allows moderate user-submitted searches with attribution and identification, with an app-wide limit of one request per second. Review terms for alternate endpoints.',
    refreshConditions:
      'Cache submitted searches. Never use background polling, autocomplete or bulk POI extraction.',
    rights: rights(nominatimPolicy, osmLicense),
  }),
  product('open-meteo-marine', {
    productId: 'open-meteo-marine-waves',
    sourceUrl: 'https://open-meteo.com/en/docs/marine-weather-api',
    role: 'point-forecast',
    activation: 'open-meteo',
    extent: 'global',
    policyUrls: [openMeteoPolicy],
    policyConditions:
      'Free hosted access is non-commercial. Commercial hosted access needs a suitable plan and server credential. Review self-hosted data and model terms separately.',
    refreshConditions:
      'Preserve model attribution and returned hourly intervals. An outage does not extend usable evidence.',
    rights: rights(),
  }),
  product('noaa-enc', {
    productId: 'noaa-enc-regional-analysis',
    role: 'analytical-coverage',
    activation: 'review-required',
    extent: 'reviewed-local',
    policyUrls: [
      'https://nauticalcharts.noaa.gov/charts/noaa-enc.html',
      'https://www.nauticalcharts.noaa.gov/data/data-licensing.html',
    ],
    policyConditions:
      'Official cells are downloadable. Verify source and derived pack terms, local coverage, currency and quality before activation.',
    refreshConditions:
      'Retain cell edition, updates, datum and source currency. Each changed pack requires its review gates.',
    fallbackCacheSeconds: null,
    rights: rights(),
  }),
  product('nws-grid', {
    productId: 'nws-marine-grid',
    name: 'NWS marine grid values at selected point',
    role: 'point-forecast',
    activation: 'default',
    extent: 'us-nws',
    policyUrls: [nwsPolicy, nwsDisclaimer],
    policyConditions:
      'NWS API data are open. Preserve attribution and label transformed values. Verify any separately identified third-party material.',
    refreshConditions:
      'Retain issue and expiry times and respect response expiry. Missing parameters remain unknown.',
    rights: rights(nwsPolicy, nwsPolicy, nwsPolicy),
  }),
  product('nws-grid', {
    productId: 'nws-active-alerts',
    name: 'NWS active alerts at selected point',
    role: 'warning-context',
    activation: 'default',
    extent: 'us-nws',
    policyUrls: [nwsPolicy, nwsDisclaimer],
    policyConditions:
      'NWS API data are open. Preserve attribution and official wording or label transformations.',
    refreshConditions:
      'Preserve alert issue, effective and expiry times. An empty active response gives no assurance about future warnings.',
    rights: rights(nwsPolicy, nwsPolicy, nwsPolicy),
  }),
  product('coops', {
    productId: 'noaa-coops-tide-predictions',
    name: 'NOAA CO-OPS astronomical tide predictions',
    role: 'point-forecast',
    activation: 'review-required',
    extent: 'reviewed-local',
    policyUrls: [coopsPolicy],
    policyConditions:
      'NOS government data are public domain unless annotated otherwise. Retain source attribution and identify derived material.',
    refreshConditions:
      'Retain station, datum, source dates and mapping expiry. Astronomical tide does not bound total water level.',
    rights: rights(coopsPolicy, coopsPolicy, coopsPolicy),
  }),
  product('coops', {
    productId: 'noaa-coops-current-predictions',
    name: 'NOAA CO-OPS current predictions',
    role: 'point-forecast',
    activation: 'review-required',
    extent: 'reviewed-local',
    policyUrls: [coopsPolicy],
    policyConditions:
      'NOS government data are public domain unless annotated otherwise. Retain station/product attribution and identify derived material.',
    refreshConditions: 'Retain station, product, bin, dates and reviewed mapping validity.',
    rights: rights(coopsPolicy, coopsPolicy, coopsPolicy),
  }),
  product('official-places', {
    productId: 'official-place-register',
    role: 'place-context',
    activation: 'pending',
    extent: 'reviewed-local',
    policyUrls: [],
    policyConditions:
      'Source-specific terms and locally reviewed operator or municipal facts are required.',
    refreshConditions: 'Retain original verification and expiry of each source fact.',
    rights: rights(),
  }),
  product('official-tariffs', {
    productId: 'official-tariff-register',
    role: 'tariff-estimate',
    activation: 'pending',
    extent: 'reviewed-local',
    policyUrls: [],
    policyConditions:
      'Source-specific tariff rights and complete published charge rules are required.',
    refreshConditions: 'Retain source revision, currency and effective dates.',
    rights: rights(),
  }),
  product('local-tiles', {
    productId: 'regional-display-tiles',
    role: 'chart-display',
    activation: 'review-required',
    extent: 'reviewed-local',
    policyUrls: [],
    policyConditions:
      'MapLibre supplies rendering. Display and offline rights depend on the exact source and pack.',
    refreshConditions:
      'Version and verify pack assets. Keep display assets separate from analysis.',
    rights: rights(),
  }),
  product('openfreemap', {
    productId: 'openfreemap-world-basemap',
    role: 'chart-display',
    activation: 'default',
    extent: 'global',
    policyUrls: [openFreeMapPolicy, openFreeMapProduct],
    policyConditions:
      'Public service permits map display and bounded offline downloads. Keep attribution and use an identifying User-Agent with at most four parallel requests and both app area limits.',
    refreshConditions:
      'Store verified user-selected resources within 3,000 tiles and 50 MB per area. Avoid automatic bulk collection.',
    rights: rights(openFreeMapProduct, openFreeMapPolicy),
  }),
  product('chatgpt', {
    productId: 'chatgpt-subscription-assistant',
    role: 'assistant',
    activation: 'pending',
    extent: 'not-applicable',
    policyUrls: ['https://developers.openai.com/siwc/request-client-id'],
    policyConditions:
      'Client access and approved authorization are prerequisites. No adapter or approved use is configured.',
    refreshConditions: 'The assistant has no data refresh role.',
    rights: rights(),
  }),
];

const roles = [
  'chart-display',
  'scientific-context',
  'point-forecast',
  'analytical-coverage',
  'place-context',
  'warning-context',
  'tariff-estimate',
  'assistant',
] as const;
const activations = [
  'default',
  'overpass-global',
  'overpass-europe',
  'open-meteo',
  'review-required',
  'pending',
] as const;
const extents = [
  'global',
  'europe-context',
  'europe-extract',
  'northwestern-europe',
  'us-nws',
  'reviewed-local',
  'not-applicable',
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function member<const T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && list.includes(value);
}

function isPublicUrl(value: unknown): value is string {
  if (!hasText(value) || !/^https:\/\/[a-z\d]/i.test(value) || /[\s\\@?#]/u.test(value))
    return false;
  try {
    const url = new URL(value);
    return (
      url.hostname.includes('.') &&
      /[a-z]$/i.test(url.hostname) &&
      !/\.(?:localhost|local|internal)$/i.test(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port
    );
  } catch {
    return false;
  }
}

function isUtcInstant(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
  );
}

function isSeconds(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0);
}

function validateLegacyProviders(): void {
  const ids = new Set<string>();
  for (const provider of PROVIDERS) {
    if (ids.has(provider.id)) throw new Error('Duplicate legacy provider ID: ' + provider.id + '.');
    ids.add(provider.id);
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(provider.id) ||
      !hasText(provider.name) ||
      !hasText(provider.coverage) ||
      !hasText(provider.attribution) ||
      !isPublicUrl(provider.documentationUrl) ||
      !member(
        [
          'chart-display',
          'bathymetry-hazards',
          'weather',
          'tide-current',
          'places',
          'tariffs',
          'ai',
        ],
        provider.kind,
      ) ||
      !member(['implemented', 'review-required', 'partner-access-pending'], provider.status) ||
      !member(['none', 'api-key', 'oauth'], provider.authentication) ||
      typeof provider.offline.allowed !== 'boolean' ||
      !hasText(provider.offline.conditions) ||
      !isSeconds(provider.freshnessSeconds)
    )
      throw new Error('Invalid legacy metadata for provider ' + provider.id + '.');
  }
}

/** A malformed entry reports fields and known provider IDs only, never input values. */
export function validateProviderRegistry(
  value: unknown,
): asserts value is readonly ProviderProductDescriptor[] {
  if (!Array.isArray(value)) throw new Error('Provider registry must be an array.');
  const ids = new Set<string>();
  const seenProviders = new Set<string>();
  for (const item of value) {
    if (!record(item) || !hasText(item.providerId) || !legacyById.has(item.providerId))
      throw new Error('Provider registry entry must reference a known provider ID.');
    const providerId = item.providerId;
    const invalid = (field: string): never => {
      throw new Error('Provider ' + providerId + ': invalid ' + field + '.');
    };
    if (
      !hasText(item.productId) ||
      item.productId.length > 80 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.productId) ||
      ids.has(item.productId)
    )
      invalid('or duplicate product ID');
    ids.add(item.productId as string);
    seenProviders.add(providerId);
    if (!hasText(item.name) || !hasText(item.attribution)) invalid('name or attribution');
    if (!member(['implemented', 'pending'], item.implementation)) invalid('implementation');
    if (
      !member(activations, item.activation) ||
      (item.implementation === 'pending') !== (item.activation === 'pending')
    )
      invalid('activation');
    if (!member(roles, item.role)) invalid('role');
    if (!member(['none', 'api-key', 'oauth'], item.authentication)) invalid('authentication');
    if (
      !record(item.geography) ||
      !member(extents, item.geography.routingExtent) ||
      !hasText(item.geography.description)
    )
      invalid('geography');
    if (!isPublicUrl(item.sourceUrl)) invalid('public source URL');
    const policy = item.policy;
    if (
      !record(policy) ||
      !Array.isArray(policy.urls) ||
      !policy.urls.every(isPublicUrl) ||
      new Set(policy.urls).size !== policy.urls.length ||
      !hasText(policy.conditions) ||
      (policy.urls.length ? !isUtcInstant(policy.lastVerifiedAt) : policy.lastVerifiedAt !== null)
    )
      invalid('policy URLs, date or conditions');
    if (
      !record(item.refresh) ||
      !isSeconds(item.refresh.minRequerySeconds) ||
      !isSeconds(item.refresh.fallbackCacheSeconds) ||
      !hasText(item.refresh.conditions)
    )
      invalid('refresh policy');
    if (!record(item.rights)) invalid('rights');
    for (const use of ['onlineDisplay', 'offlineStorage', 'analysis'] as const) {
      const right = (item.rights as Record<string, unknown>)[use];
      if (
        !record(right) ||
        !member(['permitted', 'prohibited', 'unknown'], right.status) ||
        !(right.policyUrl === null || isPublicUrl(right.policyUrl)) ||
        !(right.verifiedAt === null || isUtcInstant(right.verifiedAt)) ||
        !(right.entitlementId === null || hasText(right.entitlementId)) ||
        (right.status !== 'unknown' &&
          (!isPublicUrl(right.policyUrl) ||
            !isUtcInstant(right.verifiedAt) ||
            !(policy as { urls: string[] }).urls.includes(right.policyUrl)))
      )
        invalid(use + ' rights provenance');
    }
  }
  for (const { id } of PROVIDERS) {
    if (!seenProviders.has(id)) throw new Error('Provider ' + id + ': missing product descriptor.');
  }
}

validateLegacyProviders();
validateProviderRegistry(PROVIDER_PRODUCTS);

type WaveMode = 'disabled' | 'noncommercial' | 'commercial' | 'self-hosted';
type Presence = 'configured' | 'missing';

export interface ProviderDeployment {
  overpassGlobal: boolean;
  overpassEurope: boolean;
  nominatimPublic: boolean;
  openMeteoMode: WaveMode;
  openMeteoEndpoint: 'ineligible' | 'official-free' | 'eligible';
  openMeteoCredential: Presence;
}

export type ProviderCapabilityArea = Pick<DiscoverRequest, 'center' | 'radiusNm'>;
export type ProviderObservations = Readonly<
  Partial<Record<string, Exclude<ProviderCapabilityStatus, 'disabled'>>>
>;

export function parseProviderCapabilityArea(
  query: unknown,
): { status: 'valid'; area?: ProviderCapabilityArea } | { status: 'invalid' } {
  if (query === undefined) return { status: 'valid' };
  if (!record(query)) return { status: 'invalid' };
  const { latitude, longitude, radiusNm } = query;
  if (latitude === undefined && longitude === undefined && radiusNm === undefined)
    return { status: 'valid' };
  const decimal = (value: unknown) =>
    typeof value === 'string' && /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)
      ? Number(value)
      : Number.NaN;
  const center = [decimal(longitude), decimal(latitude)];
  const radius = radiusNm === undefined ? 0.25 : decimal(radiusNm);
  if (!coordinate(center) || !Number.isFinite(radius) || radius < 0.25 || radius > 25)
    return { status: 'invalid' };
  return {
    status: 'valid',
    area: {
      center: [Number(center[0].toFixed(4)), Number(center[1].toFixed(4))],
      radiusNm: Number(radius.toFixed(3)),
    },
  };
}

/** Only nonsecret state reaches the pure resolver. Endpoint values are never public. */
export function capabilityDeploymentFromEnvironment(
  env: Readonly<NodeJS.ProcessEnv>,
): ProviderDeployment {
  const production = env.NODE_ENV === 'production';
  const mode = env.OPEN_METEO_MODE;
  const openMeteoMode = member(['noncommercial', 'commercial', 'self-hosted'], mode)
    ? mode
    : 'disabled';
  const freeMarineHost = 'marine-api.open-meteo.com';
  const defaultMarineHost =
    openMeteoMode === 'commercial' ? 'customer-marine-api.open-meteo.com' : freeMarineHost;
  let openMeteoEndpoint: ProviderDeployment['openMeteoEndpoint'] = 'ineligible';
  try {
    const marineUrl = new URL(
      env.OPEN_METEO_MARINE_URL ?? 'https://' + defaultMarineHost + '/v1/marine',
    );
    const endpointEligible =
      marineUrl.protocol === 'https:' &&
      !marineUrl.username &&
      !marineUrl.password &&
      !marineUrl.search &&
      !marineUrl.hash &&
      (openMeteoMode === 'commercial'
        ? marineUrl.hostname === defaultMarineHost
        : openMeteoMode === 'self-hosted'
          ? !marineUrl.hostname.endsWith('open-meteo.com')
          : openMeteoMode === 'noncommercial');
    if (endpointEligible) {
      openMeteoEndpoint =
        openMeteoMode === 'noncommercial' &&
        marineUrl.hostname === freeMarineHost &&
        !marineUrl.port &&
        marineUrl.pathname === '/v1/marine'
          ? 'official-free'
          : 'eligible';
    }
  } catch {
    // Malformed endpoint never enables a capability.
  }
  return {
    overpassGlobal: !production || !!env.OVERPASS_URL,
    overpassEurope: !!env.OVERPASS_EUROPE_URL || (!production && !env.OVERPASS_URL),
    nominatimPublic: !env.NOMINATIM_URL,
    openMeteoMode,
    openMeteoEndpoint,
    openMeteoCredential: env.OPEN_METEO_API_KEY ? 'configured' : 'missing',
  };
}

function routing(
  extent: ProviderProductDescriptor['geography']['routingExtent'],
  area?: ProviderCapabilityArea,
): PublicProviderProduct['routing'] {
  if (extent === 'reviewed-local') return 'requires-review';
  if (extent === 'not-applicable' || !area) return 'unchecked';
  const [lon, lat] = area.center;
  if (extent === 'global') return 'eligible';
  if (extent === 'northwestern-europe')
    return mayHaveOceanForecast(area.center) ? 'eligible' : 'outside';
  if (extent === 'europe-extract') return usesEuropeExtract(area) ? 'eligible' : 'outside';
  if (extent === 'europe-context') {
    // Same conservative request envelope and four-decimal precision as EmodnetContextProvider.
    const x = Number(lon.toFixed(4)),
      y = Number(lat.toFixed(4));
    return x >= -36 && x <= 43 && y >= 15 && y <= 85 ? 'eligible' : 'outside';
  }
  // Mirror DiscoveryService's NWS request gate. This extent is not forecast or alert coverage.
  return (lon >= -130 && lon <= -60 && lat >= 17 && lat <= 51) ||
    (lon <= -130 && lat >= 50) ||
    (lon >= -161 && lon <= -154 && lat >= 18 && lat <= 23)
    ? 'eligible'
    : 'outside';
}

function enabled(product: ProviderProductDescriptor, deployment: ProviderDeployment): boolean {
  switch (product.activation) {
    case 'default':
      return true;
    case 'overpass-global':
      return deployment.overpassGlobal;
    case 'overpass-europe':
      return deployment.overpassEurope;
    case 'open-meteo':
      return (
        deployment.openMeteoMode !== 'disabled' &&
        deployment.openMeteoEndpoint !== 'ineligible' &&
        (deployment.openMeteoMode !== 'commercial' ||
          deployment.openMeteoCredential === 'configured')
      );
    case 'review-required':
    case 'pending':
      return false;
  }
}

function observedStatus(
  product: ProviderProductDescriptor,
  deployment: ProviderDeployment,
  route: PublicProviderProduct['routing'],
  observations: ProviderObservations,
): Pick<PublicProviderProduct, 'status' | 'statusBasis'> {
  if (!enabled(product, deployment)) return { status: 'disabled', statusBasis: 'configuration' };
  if (route === 'not-selected') return { status: 'disabled', statusBasis: 'routing' };
  if (route === 'outside') return { status: 'not-covered', statusBasis: 'routing' };
  const observed = Object.hasOwn(observations, product.productId)
    ? observations[product.productId]
    : undefined;
  if (member(['available', 'partial', 'unavailable', 'not-covered'], observed))
    return { status: observed, statusBasis: 'response' };
  return { status: 'available', statusBasis: 'configuration' };
}

function publicRights(
  descriptor: ProviderProductDescriptor,
  deployment: ProviderDeployment,
  status: ProviderCapabilityStatus,
): ProviderProductDescriptor['rights'] {
  let source = descriptor.rights;
  if (descriptor.providerId === 'nominatim' && !deployment.nominatimPublic) source = rights();
  if (
    descriptor.providerId === 'open-meteo-marine' &&
    status !== 'disabled' &&
    deployment.openMeteoEndpoint === 'official-free'
  )
    source = rights(openMeteoPolicy, openMeteoPolicy, openMeteoPolicy);
  // Credential and entitlement records are private. Project precisely the public contract fields.
  function project(right: EvidenceRight): EvidenceRight {
    return {
      status: right.status,
      policyUrl: right.policyUrl,
      verifiedAt: right.verifiedAt,
      entitlementId: null,
    };
  }
  return {
    onlineDisplay: project(source.onlineDisplay),
    offlineStorage: project(source.offlineStorage),
    analysis: project(source.analysis),
  };
}

export function resolveProviderCapabilities(
  deployment: ProviderDeployment,
  area?: ProviderCapabilityArea,
  observations: ProviderObservations = {},
  descriptors: readonly ProviderProductDescriptor[] = PROVIDER_PRODUCTS,
): ProviderCapabilityReport {
  if (descriptors !== PROVIDER_PRODUCTS) validateProviderRegistry(descriptors);
  const routeToEurope = !!area && deployment.overpassEurope && usesEuropeExtract(area);
  const products = descriptors
    .map((descriptor): PublicProviderProduct => {
      const route =
        descriptor.activation === 'overpass-global' && routeToEurope
          ? 'not-selected'
          : routing(descriptor.geography.routingExtent, area);
      const availability = observedStatus(descriptor, deployment, route, observations);
      const mode =
        descriptor.providerId === 'open-meteo-marine' &&
        (deployment.openMeteoMode === 'noncommercial' || deployment.openMeteoMode === 'self-hosted')
          ? 'none'
          : descriptor.authentication;
      return {
        providerId: descriptor.providerId,
        productId: descriptor.productId,
        name: descriptor.name,
        role: descriptor.role,
        implementation: descriptor.implementation,
        geography: {
          routingExtent: descriptor.geography.routingExtent,
          description: descriptor.geography.description,
        },
        authentication:
          mode === 'none'
            ? { mode }
            : {
                mode,
                credential:
                  descriptor.providerId === 'open-meteo-marine'
                    ? deployment.openMeteoCredential
                    : 'missing',
              },
        sourceUrl: descriptor.sourceUrl,
        policy: {
          urls: [...descriptor.policy.urls].sort(),
          lastVerifiedAt: descriptor.policy.lastVerifiedAt,
          conditions: descriptor.policy.conditions,
        },
        attribution: descriptor.attribution,
        refresh: {
          minRequerySeconds: descriptor.refresh.minRequerySeconds,
          fallbackCacheSeconds: descriptor.refresh.fallbackCacheSeconds,
          conditions: descriptor.refresh.conditions,
        },
        rights: publicRights(descriptor, deployment, availability.status),
        routing: route,
        ...availability,
      };
    })
    .sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));

  return {
    providers: PROVIDERS.map((provider) =>
      provider.id === 'nominatim' && !deployment.nominatimPublic
        ? {
            ...provider,
            offline: {
              allowed: false,
              conditions: 'The configured geocoder endpoint requires separate terms review.',
            },
          }
        : provider,
    ),
    capabilities: { schemaVersion: PROVIDER_CAPABILITY_SCHEMA_VERSION, products },
  };
}
