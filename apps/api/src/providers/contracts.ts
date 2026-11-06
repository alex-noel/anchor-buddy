/** Public provider metadata contains capabilities, never credentials. */
export interface ProviderDescriptor {
  id: string;
  name: string;
  kind:
    | 'chart-display'
    | 'bathymetry-hazards'
    | 'weather'
    | 'tide-current'
    | 'places'
    | 'tariffs'
    | 'ai';
  status: 'implemented' | 'review-required' | 'partner-access-pending';
  authentication: 'none' | 'api-key' | 'oauth';
  coverage: string;
  attribution: string;
  documentationUrl: string;
  offline: { allowed: boolean; conditions: string };
  freshnessSeconds: number | null;
}

export interface Sourced<T> {
  data: T;
  provenance: {
    providerId: string;
    url: string;
    retrievedAt: string;
    validUntil: string;
    etag?: string;
  };
}

export interface HttpTransport {
  json<T>(url: string): Promise<Sourced<T>>;
}

export const PROVIDERS: readonly ProviderDescriptor[] = [
  {
    id: 'met-norway',
    name: 'MET Norway global wind forecast',
    kind: 'weather',
    status: 'implemented',
    authentication: 'none',
    coverage:
      'Global model forecasts at selected coordinates; gust coverage varies; no verified shelter, current or wave coverage',
    attribution: 'Norwegian Meteorological Institute (CC BY 4.0)',
    documentationUrl: 'https://api.met.no/weatherapi/locationforecast/2.0/documentation',
    offline: {
      allowed: true,
      conditions:
        'Retain source, retrieval and expiry. CC BY attribution; values converted to knots. Cache responses until provider Expires; identifying User-Agent required.',
    },
    freshnessSeconds: 3600,
  },
  {
    id: 'osm-overpass',
    name: 'OpenStreetMap boating places and seamarks',
    kind: 'places',
    status: 'implemented',
    authentication: 'none',
    coverage:
      'Worldwide community coverage; incomplete POIs and marks, unverified position/fee/depth/permission tags',
    attribution: '© OpenStreetMap contributors, ODbL 1.0',
    documentationUrl: 'https://dev.overpass-api.de/overpass-doc/en/preface/commons.html',
    offline: {
      allowed: true,
      conditions:
        'Retain ODbL attribution and comply with database share-alike requirements. Production needs an explicitly configured service, with app-wide quotas and caching.',
    },
    freshnessSeconds: 86400,
  },
  {
    id: 'nominatim',
    name: 'Submitted place-name search',
    kind: 'places',
    status: 'implemented',
    authentication: 'none',
    coverage:
      'Worldwide geocoding; explicit user-submit only, never autocomplete or POI extraction',
    attribution: '© OpenStreetMap contributors, ODbL 1.0',
    documentationUrl: 'https://operations.osmfoundation.org/policies/nominatim/',
    offline: {
      allowed: true,
      conditions:
        'Cache results; public instance absolute limit 1 request/sec across the app; use one gateway instance or shared limiter. Production endpoint is configurable.',
    },
    freshnessSeconds: 86400,
  },
  {
    id: 'open-meteo-marine',
    name: 'Optional Open-Meteo wave model',
    kind: 'weather',
    status: 'review-required',
    authentication: 'api-key',
    coverage:
      'Global model waves when configured; disabled by default. Free hosted API is non-commercial only; commercial hosted or self-hosted access is explicit.',
    attribution: 'Open-Meteo and model providers, CC BY 4.0',
    documentationUrl: 'https://open-meteo.com/en/terms',
    offline: {
      allowed: true,
      conditions:
        'Data CC BY 4.0 with model attribution; hosted-service use depends on deployment license. Coastal model tides/currents are not used for clearance.',
    },
    freshnessSeconds: 3600,
  },
  {
    id: 'noaa-enc',
    name: 'NOAA Electronic Navigational Charts',
    kind: 'bathymetry-hazards',
    status: 'review-required',
    authentication: 'none',
    coverage: 'US ENC cells; regional packs require coverage and quality review',
    attribution: 'NOAA Office of Coast Survey',
    documentationUrl: 'https://charts.noaa.gov/ENCs/ENCs.shtml',
    offline: {
      allowed: true,
      conditions:
        'Retain NOAA notices, source edition, update sequence, datum and attribution; derived products are not certified navigation charts.',
    },
    freshnessSeconds: 86400,
  },
  {
    id: 'nws-grid',
    name: 'NWS marine grids and alerts',
    kind: 'weather',
    status: 'implemented',
    authentication: 'none',
    coverage: 'NWS grid coverage; individual marine parameters may be unavailable',
    attribution: 'NOAA National Weather Service',
    documentationUrl: 'https://www.weather.gov/documentation/services-web-api',
    offline: {
      allowed: true,
      conditions: 'Retain issue and expiry times; expired forecasts cannot establish suitability.',
    },
    freshnessSeconds: 900,
  },
  {
    id: 'coops',
    name: 'NOAA CO-OPS',
    kind: 'tide-current',
    status: 'review-required',
    authentication: 'none',
    coverage: 'Explicitly validated station-area mappings only',
    attribution: 'NOAA Center for Operational Oceanographic Products and Services',
    documentationUrl: 'https://api.tidesandcurrents.noaa.gov/api/prod/',
    offline: {
      allowed: true,
      conditions:
        'Retain station, datum, units and mapping review. Tide predictions are not total water-level forecasts.',
    },
    freshnessSeconds: 3600,
  },
  {
    id: 'official-places',
    name: 'Official place and tariff register',
    kind: 'places',
    status: 'review-required',
    authentication: 'none',
    coverage: 'Individually reviewed operator and municipal records',
    attribution: 'Individual source records',
    documentationUrl: 'https://floridakeys.noaa.gov/',
    offline: {
      allowed: true,
      conditions: 'Only factual records with permitted reuse; keep verification and expiry dates.',
    },
    freshnessSeconds: null,
  },
  {
    id: 'official-tariffs',
    name: 'Operator tariff register',
    kind: 'tariffs',
    status: 'review-required',
    authentication: 'none',
    coverage: 'Individually reviewed tariffs; availability never inferred',
    attribution: 'Individual operator source records',
    documentationUrl: 'https://floridakeys.noaa.gov/',
    offline: {
      allowed: true,
      conditions: 'Factual itemized estimates with source currency and validity periods.',
    },
    freshnessSeconds: null,
  },
  {
    id: 'local-tiles',
    name: 'Regional MapLibre display tiles',
    kind: 'chart-display',
    status: 'implemented',
    authentication: 'none',
    coverage: 'Pack geometry coverage only',
    attribution: 'NOAA and pack-specific attribution',
    documentationUrl: 'https://maplibre.org/',
    offline: {
      allowed: true,
      conditions: 'Display layer only; never use tile geometry for clearance calculations.',
    },
    freshnessSeconds: null,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT subscription assistant',
    kind: 'ai',
    status: 'partner-access-pending',
    authentication: 'oauth',
    coverage: 'Disabled until partner access and approved mobile authorization are verified',
    attribution: 'OpenAI',
    documentationUrl: 'https://developers.openai.com/siwc/request-client-id',
    offline: {
      allowed: false,
      conditions: 'Core calculations and watch never depend on this adapter.',
    },
    freshnessSeconds: null,
  },
];
