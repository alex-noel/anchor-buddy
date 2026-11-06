import type { Position, RegionPack, SourceRecord, WeatherInterval } from '@anchor-buddy/domain';

export const PROJECT_USER_AGENT = 'AnchorBuddy/0.1 (https://github.com/alex-noel/anchor-buddy)';
export interface DiscoverRequest {
  center: Position;
  radiusNm: number;
  name?: string;
  from?: string;
  until?: string;
}
export interface ProviderStatus {
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
export interface DiscoveryResult {
  pack: RegionPack;
  providers: ProviderStatus[];
  notices: string[];
  partial: boolean;
  requestedArea: { center: Position; radiusNm: number; bounds: RegionPack['bounds'] };
}
export interface ForecastResult {
  frames: WeatherInterval[];
  source: SourceRecord;
  status: ProviderStatus;
  position: Position;
}
export function coordinate(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 85
  );
}
export function around(center: Position, radiusNm: number): RegionPack['bounds'] {
  const latitude = radiusNm / 60;
  const longitude = latitude / Math.max(0.087, Math.cos((center[1] * Math.PI) / 180));
  return [
    Math.max(-180, center[0] - longitude),
    Math.max(-85, center[1] - latitude),
    Math.min(180, center[0] + longitude),
    Math.min(85, center[1] + latitude),
  ];
}
export function boundsGeometry(bounds: RegionPack['bounds']) {
  const [w, s, e, n] = bounds;
  return {
    type: 'Polygon' as const,
    coordinates: [
      [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
        [w, s],
      ] as Position[],
    ],
  };
}
export function dateWindow(input: DiscoverRequest, now: Date) {
  const from = input.from ? new Date(input.from) : now;
  const until = input.until ? new Date(input.until) : new Date(from.valueOf() + 72 * 3600000);
  return { from: from.toISOString(), until: until.toISOString() };
}
export function sourceRecord(
  id: string,
  name: string,
  url: string,
  retrievedAt: string,
  validUntil: string,
  attribution: string,
  license: string,
): SourceRecord {
  return { id, name, url, retrievedAt, validUntil, attribution, license, synthetic: false };
}
export const finiteOrNull = (value: unknown, min = 0, max = 500): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
export function distanceNm(a: Position, b: Position) {
  const rad = Math.PI / 180,
    dLat = (a[1] - b[1]) * rad,
    dLon = (a[0] - b[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
