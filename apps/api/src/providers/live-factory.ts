import { GovernmentHttp, ProviderError } from './http.js';
import { PROJECT_USER_AGENT } from './live-types.js';
import { OverpassProvider } from './overpass.js';
import { MetNorwayProvider } from './met-norway.js';
import { OpenMeteoMarineProvider, type OpenMeteoOptions } from './open-meteo.js';
import { NominatimProvider } from './geocode.js';
import { NwsLiveProvider } from './nws-live.js';
import { DiscoveryService } from './discovery.js';
import type { NwsProvider } from './nws.js';
import { join } from 'node:path';
import { JsonDiskCache } from './disk-cache.js';
import { MetOceanProvider } from './met-ocean.js';
import { EmodnetContextProvider } from './emodnet-context.js';
import { RegionalPlacesProvider } from './place-router.js';

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
  const cacheRoot = process.env.LIVE_CACHE_ROOT ?? './data/live-cache';
  const diskCache = new JsonDiskCache(join(cacheRoot, 'http'));
  const snapshotCache = new JsonDiskCache(join(cacheRoot, 'snapshots'), {
    entries: 128,
    totalBytes: 64 * 1024 * 1024,
    entryBytes: 4 * 1024 * 1024,
  });
  const overpassUrl = endpoint(
    process.env.OVERPASS_URL ?? 'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  );
  const europeAddress =
    process.env.OVERPASS_EUROPE_URL ??
    (process.env.OVERPASS_URL ? undefined : 'https://ovp.dresel.systems/api/interpreter');
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
  function overpass(url: URL, enabled: boolean) {
    return new OverpassProvider(
      new GovernmentHttp({
        providerId: 'osm-overpass',
        userAgent,
        hosts: [url.hostname],
        ttlSeconds: 86400,
        minIntervalMs: 1100,
        timeoutMs: 22000,
        maxPending: 2,
        maxBytes: 8 * 1024 * 1024,
        postForm: true,
        diskCache,
      }),
      url.href,
      enabled,
    );
  }
  const places = new RegionalPlacesProvider(
    overpass(overpassUrl, process.env.NODE_ENV !== 'production' || !!process.env.OVERPASS_URL),
    europeAddress
      ? overpass(
          endpoint(europeAddress),
          process.env.NODE_ENV !== 'production' || !!process.env.OVERPASS_EUROPE_URL,
        )
      : undefined,
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
      diskCache,
      // MET's 2026-11-05 policy: outside Nordic forecasts wait at least3h per point.
      // A conservative3h floor also avoids assuming an unverified Nordic model boundary.
      minimumCacheSeconds: 10800,
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
            diskCache,
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
      diskCache,
    }),
    geocodeUrl.href,
  );
  return {
    discovery: new DiscoveryService(
      {
        places,
        wind,
        ...(marine ? { marine } : {}),
        nws: new NwsLiveProvider(nws),
        ocean: new MetOceanProvider(
          new GovernmentHttp({
            providerId: 'met-ocean',
            userAgent,
            hosts: ['api.met.no'],
            ttlSeconds: 3600,
            respectServerExpiry: true,
            minIntervalMs: 200,
            timeoutMs: 10000,
            maxPending: 4,
            diskCache,
          }),
        ),
        context: new EmodnetContextProvider(
          new GovernmentHttp({
            providerId: 'emodnet-bathymetry-context',
            userAgent,
            hosts: ['rest.emodnet-bathymetry.eu'],
            ttlSeconds: 86400,
            minIntervalMs: 250,
            timeoutMs: 8000,
            maxPending: 4,
            maxBytes: 64 * 1024,
            diskCache,
          }),
          new GovernmentHttp({
            providerId: 'emodnet-seabed-context',
            userAgent,
            hosts: ['drive.emodnet-geology.eu'],
            ttlSeconds: 86400,
            minIntervalMs: 250,
            timeoutMs: 8000,
            maxPending: 4,
            maxBytes: 64 * 1024,
            diskCache,
          }),
        ),
      },
      now,
      snapshotCache,
    ),
    geocoder,
  };
}
