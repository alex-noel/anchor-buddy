import type { AreaGeometry, Position } from './types.ts';

const EARTH_RADIUS_M = 6_371_008.8;
const RAD = Math.PI / 180;
type XY = [number, number];

export function distanceM(a: Position, b: Position): number {
  const dLat = (b[1] - a[1]) * RAD;
  const dLon = (b[0] - a[0]) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

/** Azimuthal equidistant projection centred on the queried anchor. */
function project(origin: Position, point: Position): XY {
  const lat1 = origin[1] * RAD,
    lat2 = point[1] * RAD,
    dl = (point[0] - origin[0]) * RAD;
  const bearing = Math.atan2(
    Math.sin(dl) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dl),
  );
  const d = distanceM(origin, point);
  return [d * Math.sin(bearing), d * Math.cos(bearing)];
}

export function destination(origin: Position, bearingDeg: number, metres: number): Position {
  const d = metres / EARTH_RADIUS_M,
    bearing = bearingDeg * RAD,
    lat = origin[1] * RAD,
    lon = origin[0] * RAD;
  const nextLat = Math.asin(
    Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing),
  );
  const nextLon =
    lon +
    Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat),
      Math.cos(d) - Math.sin(lat) * Math.sin(nextLat),
    );
  return [nextLon / RAD, nextLat / RAD];
}

function segmentDistance(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const denom = dx * dx + dy * dy;
  const t =
    denom === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / denom));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function insideRing(point: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

function polygons(geometry: AreaGeometry): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function insidePolygon(point: Position, rings: Position[][]): boolean {
  return (
    !!rings[0] &&
    insideRing(point, rings[0]) &&
    !rings.slice(1).some((ring) => insideRing(point, ring))
  );
}

function boundaryDistance(point: Position, rings: Position[][]): number {
  let minimum = Infinity;
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      // GeoJSON segments are linear in longitude/latitude. Densifying before projection
      // limits curvature error; a separate 2m geometry guard makes tests conservative.
      const a = ring[i - 1]!,
        b = ring[i]!;
      const divisions = Math.max(1, Math.ceil(distanceM(a, b) / 100));
      let last = project(point, a);
      for (let j = 1; j <= divisions; j++) {
        const t = j / divisions;
        const next = project(point, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        minimum = Math.min(minimum, segmentDistance([0, 0], last, next));
        last = next;
      }
    }
  }
  return minimum;
}

export function pointInArea(point: Position, geometry: AreaGeometry): boolean {
  return polygons(geometry).some((rings) => insidePolygon(point, rings));
}

/** Includes hole boundaries and tiny enclosed hazards, rather than sampling the circumference. */
export function diskIntersectsArea(
  point: Position,
  radiusM: number,
  geometry: AreaGeometry,
): boolean {
  return polygons(geometry).some(
    (rings) => insidePolygon(point, rings) || boundaryDistance(point, rings) <= radiusM + 2,
  );
}

/** Conservative across seams: one unsimplified polygon must prove complete disk coverage. */
export function areaContainsDisk(
  point: Position,
  radiusM: number,
  geometry: AreaGeometry,
): boolean {
  return polygons(geometry).some(
    (rings) => insidePolygon(point, rings) && boundaryDistance(point, rings) > radiusM + 2,
  );
}

export function circlePolygon(point: Position, radiusM: number, steps = 72): AreaGeometry {
  const ring = Array.from({ length: steps }, (_, index) =>
    destination(point, (index * 360) / steps, radiusM),
  );
  if (ring[0]) ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}

export function rectangle(west: number, south: number, east: number, north: number): AreaGeometry {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}
