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

/** Engineering bounds pending qualified review; never a source positional uncertainty. */
export const PRIMITIVE_GEOMETRY_LIMITS = Object.freeze({
  maxVertices: 4096,
  maxDistanceFromQueryM: 50_000,
  maxDistanceEvaluations: 50_000,
  distanceResolutionM: 0.25,
  guardM: 2,
});
export interface GeometryWorkBudget {
  remaining: number;
}
export type PrimitiveDistanceBounds =
  | { status: 'bounded'; lowerM: number; upperM: number }
  | { status: 'unsupported'; reason: 'complexity' | 'extent' | 'coordinates' };

/**
 * Bound WGS84 distance to original lon/lat-linear geometry, not a rendered simplification.
 * Spherical curve minima use an adaptive path-length bound (triangle inequality).
 * WGS84/sphere metric factors 0.994..1.006 enclose the ellipsoid's metric extrema;
 * the test-only PROJ corpus verifies this engineering envelope, not maritime approval.
 */
export function primitiveDistanceBounds(
  origin: Position,
  geometry: import('./contracts.ts').HazardPrimitive['geometry'],
  budget: GeometryWorkBudget = { remaining: PRIMITIVE_GEOMETRY_LIMITS.maxDistanceEvaluations },
): PrimitiveDistanceBounds {
  const valid = (p: Position) =>
    Array.isArray(p) &&
    p.length === 2 &&
    p.every(Number.isFinite) &&
    Math.abs(p[0]) <= 180 &&
    Math.abs(p[1]) <= 85;
  if (!valid(origin)) return { status: 'unsupported', reason: 'coordinates' };
  const lines =
    geometry.type === 'Point'
      ? [[geometry.coordinates]]
      : geometry.type === 'LineString'
        ? [geometry.coordinates]
        : geometry.type === 'Polygon'
          ? geometry.coordinates
          : geometry.coordinates.flat();
  let count = 0;
  let best = Infinity;
  const segments: [Position, Position][] = [];
  const compare = (a: Position, b: Position) => a[0] - b[0] || a[1] - b[1];
  const distance = (p: Position): number | null => {
    if (budget.remaining <= 0) return null;
    budget.remaining--;
    return distanceM(origin, p);
  };
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const p = line[i]!;
      if (++count > PRIMITIVE_GEOMETRY_LIMITS.maxVertices)
        return { status: 'unsupported', reason: 'complexity' };
      if (!valid(p) || Math.abs(p[0] - origin[0]) > 180)
        return { status: 'unsupported', reason: 'coordinates' };
      const d = distance(p);
      if (d === null) return { status: 'unsupported', reason: 'complexity' };
      if (d > PRIMITIVE_GEOMETRY_LIMITS.maxDistanceFromQueryM)
        return { status: 'unsupported', reason: 'extent' };
      best = Math.min(best, d);
      if (i) {
        const previous = line[i - 1]!;
        if (Math.abs(p[0] - previous[0]) > 180)
          return { status: 'unsupported', reason: 'coordinates' };
        segments.push(compare(previous, p) <= 0 ? [previous, p] : [p, previous]);
      }
    }
  }
  if (!count) return { status: 'unsupported', reason: 'coordinates' };
  if (
    (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') &&
    pointInArea(origin, geometry)
  )
    return { status: 'bounded', lowerM: 0, upperM: 0 };
  segments.sort((a, b) => compare(a[0], b[0]) || compare(a[1], b[1]));
  const resolution = PRIMITIVE_GEOMETRY_LIMITS.distanceResolutionM;
  for (const [start, end] of segments) {
    const da = distance(start),
      db = distance(end);
    if (da === null || db === null) return { status: 'unsupported', reason: 'complexity' };
    const pending: [Position, Position, number, number][] = [[start, end, da, db]];
    while (pending.length) {
      const [a, b, distanceA, distanceB] = pending.pop()!;
      // cos(latitude) is largest at the latitude closest to zero on this segment.
      const minLatitude = a[1] * b[1] <= 0 ? 0 : Math.min(Math.abs(a[1]), Math.abs(b[1]));
      const pathUpper =
        EARTH_RADIUS_M * RAD * Math.hypot(b[1] - a[1], (b[0] - a[0]) * Math.cos(minLatitude * RAD));
      const lower = Math.max(0, (distanceA + distanceB - pathUpper) / 2);
      if (lower >= best - resolution || pathUpper <= 2 * resolution) continue;
      const middle: Position = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const dm = distance(middle);
      if (dm === null) return { status: 'unsupported', reason: 'complexity' };
      best = Math.min(best, dm);
      pending.push([middle, b, dm, distanceB], [a, middle, distanceA, dm]);
    }
  }
  return {
    status: 'bounded',
    lowerM: Math.max(0, best - resolution) * 0.994,
    upperM: best * 1.006,
  };
}
