import type { Position, SourceRecord } from './types.ts';

/** Regional scientific map context. Deliberately separate from assessment inputs. */
export interface MapContext {
  position: Position;
  notice: string;
  depth?: {
    /** Signed values exactly as returned by the DTM service, not chart clearance bounds. */
    meanM: number;
    minM: number;
    maxM: number;
    datum: 'LAT';
    interpolated: boolean | null;
    reference?: string;
    metadataUrl?: string;
  };
  seabed?: {
    label: string;
    scale: number | null;
    originator: string;
    reference: string;
    notes: string;
  };
  sources: SourceRecord[];
}

function publicHttps(value: unknown) {
  if (typeof value !== 'string' || value.length > 4000) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isMapContext(value: unknown): value is MapContext {
  if (!value || typeof value !== 'object') return false;
  const c = value as MapContext;
  if (
    !Array.isArray(c.position) ||
    c.position.length !== 2 ||
    !c.position.every(Number.isFinite) ||
    Math.abs(c.position[0]) > 180 ||
    Math.abs(c.position[1]) > 85 ||
    typeof c.notice !== 'string' ||
    c.notice.length > 2000 ||
    !Array.isArray(c.sources) ||
    c.sources.length > 4 ||
    ((c.depth !== undefined || c.seabed !== undefined) && c.sources.length === 0)
  )
    return false;
  if (
    c.sources.some(
      (s) =>
        !s ||
        typeof s.id !== 'string' ||
        typeof s.name !== 'string' ||
        typeof s.attribution !== 'string' ||
        typeof s.license !== 'string' ||
        !publicHttps(s.url) ||
        !Number.isFinite(Date.parse(s.retrievedAt)) ||
        !Number.isFinite(Date.parse(s.validUntil)) ||
        s.synthetic !== false,
    )
  )
    return false;
  if (c.depth !== undefined) {
    const d = c.depth;
    if (!d || typeof d !== 'object') return false;
    if (
      ![d.meanM, d.minM, d.maxM].every((n) => Number.isFinite(n) && Math.abs(n) <= 12000) ||
      d.minM > d.meanM ||
      d.meanM > d.maxM ||
      d.datum !== 'LAT' ||
      !(d.interpolated === null || typeof d.interpolated === 'boolean') ||
      (d.reference !== undefined && typeof d.reference !== 'string') ||
      (d.metadataUrl !== undefined && !publicHttps(d.metadataUrl))
    )
      return false;
  }
  if (c.seabed !== undefined) {
    const s = c.seabed;
    if (!s || typeof s !== 'object') return false;
    if (
      ![s.label, s.originator, s.reference, s.notes].every(
        (t) => typeof t === 'string' && t.length <= 2000,
      ) ||
      !(s.scale === null || (Number.isFinite(s.scale) && s.scale > 0))
    )
      return false;
  }
  return true;
}
