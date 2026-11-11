import type { EvidenceEnvelope, EvidenceRole } from '@anchor-buddy/domain';

/** Legacy provider metadata retained for existing /v1/providers clients. */
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

export const PROVIDER_CAPABILITY_SCHEMA_VERSION = 2 as const;
export type ProviderCapabilityRole =
  EvidenceRole | 'place-context' | 'warning-context' | 'tariff-estimate' | 'assistant';
export type ProviderRoutingExtent =
  | 'global'
  | 'europe-context'
  | 'europe-extract'
  | 'northwestern-europe'
  | 'us-nws'
  | 'reviewed-local'
  | 'not-applicable';
export type ProviderActivation =
  'default' | 'overpass-global' | 'overpass-europe' | 'open-meteo' | 'review-required' | 'pending';
export type ProviderCapabilityStatus =
  'available' | 'partial' | 'unavailable' | 'disabled' | 'not-covered';

export interface ProviderProductDescriptor {
  providerId: string;
  /** Stable product identity across deployments. */
  productId: string;
  name: string;
  implementation: 'implemented' | 'pending';
  activation: ProviderActivation;
  role: ProviderCapabilityRole;
  geography: { routingExtent: ProviderRoutingExtent; description: string };
  authentication: ProviderDescriptor['authentication'];
  sourceUrl: string;
  policy: { urls: readonly string[]; lastVerifiedAt: string | null; conditions: string };
  attribution: string;
  refresh: {
    minRequerySeconds: number | null;
    fallbackCacheSeconds: number | null;
    conditions: string;
  };
  rights: EvidenceEnvelope['rights'];
}

export interface PublicProviderProduct extends Omit<
  ProviderProductDescriptor,
  'activation' | 'authentication'
> {
  authentication: {
    mode: ProviderDescriptor['authentication'];
    credential?: 'configured' | 'missing';
  };
  status: ProviderCapabilityStatus;
  statusBasis: 'configuration' | 'routing' | 'response';
  /** A routing decision does not establish positive spatial evidence. */
  routing: 'eligible' | 'outside' | 'unchecked' | 'requires-review' | 'not-selected';
}

export interface ProviderCapabilityReport {
  providers: readonly ProviderDescriptor[];
  capabilities: {
    schemaVersion: typeof PROVIDER_CAPABILITY_SCHEMA_VERSION;
    products: PublicProviderProduct[];
  };
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
        'Retain source, retrieval and provider expiry. CC BY attribution; values converted to knots. Identical requests wait at least three hours or until a later provider expiry; this requery limit never extends evidence freshness. Identifying User-Agent required.',
    },
    freshnessSeconds: null,
  },
  {
    id: 'met-ocean',
    name: 'MET Norway Northwestern Europe significant waves',
    kind: 'weather',
    status: 'implemented',
    authentication: 'none',
    coverage:
      'Northwestern European model seas only; the API returns the actual sea-grid coordinate. Model estimates do not establish shelter or nautical coverage.',
    attribution: 'MET Norway, CC BY4.0 / NLOD2.0',
    documentationUrl: 'https://api.met.no/weatherapi/oceanforecast/2.0/documentation',
    offline: {
      allowed: true,
      conditions:
        'Retain model point, retrieval and expiry. Significant wave height is not a maximum individual-wave or verified local-shelter assessment.',
    },
    freshnessSeconds: null,
  },
  {
    id: 'emodnet-context',
    name: 'EMODnet European point depth and seabed context',
    kind: 'chart-display',
    status: 'implemented',
    authentication: 'none',
    coverage:
      'Available European DTM and seabed samples at a selected point only. Outside coverage remains unknown.',
    attribution: 'EMODnet Bathymetry and Geology, European Union and referenced originators',
    documentationUrl: 'https://emodnet.ec.europa.eu/en/emodnet-web-service-documentation',
    offline: {
      allowed: false,
      conditions:
        'Verify product and originator terms before redistribution. Preserve signed values, datum, scale and vintage. Scientific context supplies no assessment coverage.',
    },
    freshnessSeconds: 86400,
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
      allowed: false,
      conditions:
        'OSM reuse is subject to ODbL. Review selected endpoint terms for storage, attribution and share-alike requirements.',
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
      allowed: false,
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
      allowed: false,
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
      allowed: false,
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
      allowed: false,
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
      allowed: false,
      conditions: 'Pack-specific rights required. Display tiles supply no clearance evidence.',
    },
    freshnessSeconds: null,
  },
  {
    id: 'openfreemap',
    name: 'OpenFreeMap global vector basemap',
    kind: 'chart-display',
    status: 'implemented',
    authentication: 'none',
    coverage: 'Worldwide basemap display; does not describe reviewed chart coverage',
    attribution: 'OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors',
    documentationUrl: 'https://openfreemap.org/',
    offline: {
      allowed: true,
      conditions:
        'User-selected areas only. App limits each area to 3,000 tiles and 50 MB with at most four parallel requests and an identifying User-Agent.',
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
