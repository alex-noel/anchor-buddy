import { validateRegionPack, type Position, type RegionPack } from '@anchor-buddy/domain';

export interface LiveProviderStatus {
  id: string;
  name: string;
  status: 'available' | 'partial' | 'unavailable' | 'disabled' | 'not-covered';
  message: string;
  attribution?: string;
  documentationUrl?: string;
  retrievedAt?: string;
  validUntil?: string;
  license?: string;
}
export interface RegionalData {
  pack: RegionPack;
  providers: LiveProviderStatus[];
  notices: string[];
  partial: boolean;
  savedAt?: string;
}

export function providerBase(address: string) {
  const url = new URL(address.trim());
  if (url.username || url.password || url.search || url.hash)
    throw new Error('API address must not contain credentials, query parameters or fragments.');
  if (
    url.protocol !== 'https:' &&
    !(
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '10.0.2.2', '[::1]'].includes(url.hostname)
    )
  )
    throw new Error('Use HTTPS for a remote API, or a loopback address for local development.');
  return url.href.replace(/\/$/, '');
}

/** Display bounds only. Never use this rectangle as positive nautical coverage evidence. */
export function areaBounds(center: Position, radiusNm: number): RegionPack['bounds'] {
  const [lon, lat] = center;
  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    Math.abs(lon) > 180 ||
    Math.abs(lat) > 85 ||
    !Number.isFinite(radiusNm) ||
    radiusNm <= 0 ||
    radiusNm > 50
  )
    throw new Error('Choose a map centre between 85°S and 85°N and a radius up to 50 nm.');
  const dy = radiusNm / 60;
  const dx = dy / Math.cos((lat * Math.PI) / 180);
  if (lon - dx < -180 || lon + dx > 180)
    throw new Error('For areas crossing the date line, save one area on each side.');
  return [lon - dx, Math.max(-85, lat - dy), lon + dx, Math.min(85, lat + dy)];
}

export function createEmptyRegion(
  center: Position,
  radiusNm: number,
  name = 'Selected area',
): RegionPack {
  const now = new Date();
  return {
    id: 'unassessed-' + center.map((n) => n.toFixed(3)).join('-'),
    name,
    version: 'empty-' + now.getTime(),
    generatedAt: now.toISOString(),
    validUntil: new Date(now.getTime() + 3_600_000).toISOString(),
    timezone: 'UTC',
    bounds: areaBounds(center, radiusNm),
    validation: {
      status: 'unreviewed',
      notice:
        'No nautical analysis data is loaded for this area. A display map does not establish depth, clearance or permission to anchor.',
    },
    chart: { attribution: 'Map source attribution is shown on the map.', offlineAllowed: false },
    sources: [],
    coverage: [],
    depths: [],
    hazards: [],
    restrictions: [],
    tides: [],
    weather: [],
    places: [],
    marks: [],
    holdingAreas: [],
  };
}

export function readRegionalData(value: unknown): RegionalData {
  if (!value || typeof value !== 'object')
    throw new Error('The data service returned an invalid region.');
  const data = value as RegionalData;
  const errors = validateRegionPack(data.pack);
  if (errors.length || data.pack.validation.status === 'synthetic')
    throw new Error(
      'Live region validation failed: ' + (errors[0] ?? 'synthetic data is not a live response.'),
    );
  if (
    !Array.isArray(data.providers) ||
    data.providers.length > 20 ||
    data.providers.some(
      (p) =>
        !p ||
        typeof p.id !== 'string' ||
        typeof p.name !== 'string' ||
        typeof p.message !== 'string' ||
        !['available', 'partial', 'unavailable', 'disabled', 'not-covered'].includes(p.status),
    )
  )
    throw new Error('The data service returned invalid source status.');
  if (
    !Array.isArray(data.notices) ||
    data.notices.some((n) => typeof n !== 'string') ||
    typeof data.partial !== 'boolean'
  )
    throw new Error('The data service returned invalid coverage information.');
  return data;
}

export function readRegionCache(value: unknown): RegionalData[] {
  if (!Array.isArray(value)) return [];
  const result: RegionalData[] = [];
  for (const row of value.slice(0, 8)) {
    try {
      const next = readRegionalData(row);
      if (
        next.savedAt &&
        Number.isFinite(Date.parse(next.savedAt)) &&
        !result.some((r) => r.pack.id === next.pack.id)
      )
        result.push(next);
    } catch {
      /* Ignore corrupt cached records; never treat them as evidence. */
    }
  }
  return result;
}

export function regionContains(pack: RegionPack, center: Position, radiusNm: number) {
  try {
    // Discovery normalizes request coordinates/radius for stable provider caching. This only
    // selects a cache record; the assessment engine still requires exact positive coverage.
    const bounds =
      pack.id.startsWith('live-') && pack.validation.status === 'unreviewed'
        ? areaBounds(
            [Number(center[0].toFixed(4)), Number(center[1].toFixed(4))],
            Number(radiusNm.toFixed(3)),
          )
        : areaBounds(center, radiusNm);
    const epsilon = 1e-10;
    return (
      bounds[0] >= pack.bounds[0] - epsilon &&
      bounds[1] >= pack.bounds[1] - epsilon &&
      bounds[2] <= pack.bounds[2] + epsilon &&
      bounds[3] <= pack.bounds[3] + epsilon
    );
  } catch {
    return false;
  }
}

/** Recent evidence cache is bounded independently of map tiles; old dates remain unchanged. */
export function cacheRegion(previous: RegionalData[], next: RegionalData) {
  const entries = [next, ...previous.filter((p) => p.pack.id !== next.pack.id)].slice(0, 8);
  while (entries.length > 1 && JSON.stringify(entries).length > 2_500_000) entries.pop();
  if (JSON.stringify(entries).length > 2_500_000)
    throw new Error('This region is too large to save in the local evidence cache.');
  return entries;
}
