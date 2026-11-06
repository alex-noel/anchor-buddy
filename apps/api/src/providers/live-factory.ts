import { GovernmentHttp, ProviderError } from './http.js';
import { PROJECT_USER_AGENT } from './live-types.js';
import { OverpassProvider } from './overpass.js';
import { MetNorwayProvider } from './met-norway.js';
import { OpenMeteoMarineProvider, type OpenMeteoOptions } from './open-meteo.js';
import { NominatimProvider } from './geocode.js';
import { NwsLiveProvider } from './nws-live.js';
import { DiscoveryService } from './discovery.js';
import type { NwsProvider } from './nws.js';

function endpoint(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search)
    throw new ProviderError(
      'CONFIGURATION_REQUIRED',
      'Provider endpoints must use HTTPS without embedded credentials or query parameters',
    );
  return url;
}
export function createLiveServices(nws: NwsProvider, now: () => Date) {
  const userAgent = process.env.PUBLIC_DATA_USER_AGENT ?? PROJECT_USER_AGENT;
  const overpassUrl = endpoint(
    process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter',
  );
  const geocodeUrl = endpoint(
    process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org/search',
  );
  const mode = process.env.OPEN_METEO_MODE ?? 'disabled';
  if (!['disabled', 'noncommercial', 'commercial', 'self-hosted'].includes(mode))
    throw new ProviderError('CONFIGURATION_REQUIRED', 'Invalid OPEN_METEO_MODE');
  const marineUrl = endpoint(
    process.env.OPEN_METEO_MARINE_URL ??
      (mode === 'commercial'
        ? 'https://customer-marine-api.open-meteo.com/v1/marine'
        : 'https://marine-api.open-meteo.com/v1/marine'),
  );
  const places = new OverpassProvider(
    new GovernmentHttp({
      providerId: 'osm-overpass',
      userAgent,
      hosts: [overpassUrl.hostname],
      ttlSeconds: 86400,
      minIntervalMs: 1100,
      timeoutMs: 22000,
      maxPending: 2,
      maxBytes: 8 * 1024 * 1024,
      postForm: true,
    }),
    overpassUrl.href,
    process.env.NODE_ENV !== 'production' || !!process.env.OVERPASS_URL,
  );
  const wind = new MetNorwayProvider(
    new GovernmentHttp({
      providerId: 'met-norway',
      userAgent,
      hosts: ['api.met.no'],
      respectServerExpiry: true,
      ttlSeconds: 900,
      minIntervalMs: 150,
      timeoutMs: 12000,
      maxPending: 8,
    }),
  );
  const marine =
    mode === 'disabled'
      ? undefined
      : new OpenMeteoMarineProvider(
          new GovernmentHttp({
            providerId: 'open-meteo-marine',
            userAgent,
            hosts: [marineUrl.hostname],
            ttlSeconds: 3600,
            minIntervalMs: 1000,
            timeoutMs: 12000,
          }),
          {
            mode: mode as OpenMeteoOptions['mode'],
            endpoint: marineUrl.href,
            ...(process.env.OPEN_METEO_API_KEY ? { apiKey: process.env.OPEN_METEO_API_KEY } : {}),
          },
        );
  const geocoder = new NominatimProvider(
    new GovernmentHttp({
      providerId: 'nominatim',
      userAgent,
      hosts: [geocodeUrl.hostname],
      ttlSeconds: 86400,
      minIntervalMs: 1100,
      timeoutMs: 12000,
      maxPending: 4,
      maxBytes: 512 * 1024,
    }),
    geocodeUrl.href,
  );
  return {
    discovery: new DiscoveryService(
      { places, wind, ...(marine ? { marine } : {}), nws: new NwsLiveProvider(nws) },
      now,
    ),
    geocoder,
  };
}
