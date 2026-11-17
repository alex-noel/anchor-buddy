import { utf8Bytes, type RegionalData } from './regionalDataCore';
import type { MapArea } from './worldMapsCore';
/** Per-area downloaded resource bytes; evidence is an encoded JSON estimate, not device quota. */
export function knownStorageUsage(areas: MapArea[], evidence: RegionalData[]) {
  const seen = new Set<string>();
  let mapBytes = 0;
  for (const area of areas) {
    if (seen.has(area.id)) continue;
    seen.add(area.id);
    if (Number.isFinite(area.bytes) && area.bytes > 0) mapBytes += area.bytes;
  }
  return { mapBytes, evidenceBytes: utf8Bytes(JSON.stringify(evidence)) };
}
export function storageBytes(bytes: number): string {
  return bytes < 1_000_000
    ? `${(bytes / 1000).toFixed(1)} kB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
}
