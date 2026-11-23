import { CANONICAL_CONVERSIONS, type RegionPack, type UnitSystem } from '@anchor-buddy/domain';
import { parseInputDecimal } from './inputNumbers';

export interface RadiusDraft {
  text: string;
  units: UnitSystem;
  referenceNm?: number;
}

export type MapDownloadProgressPhase =
  | 'preparing'
  | 'map'
  | 'evidence'
  | 'map-paused'
  | 'map-failed'
  | 'complete'
  | 'evidence-complete'
  | 'evidence-failed';
export interface MapDownloadProgressState {
  phase: MapDownloadProgressPhase;
  completedTiles?: number;
  tileCount?: number;
  usableZoom?: number;
  mapStatus?: 'partial' | 'complete';
}

export function mapTileProgressPercent(completedTiles?: number, tileCount?: number): number | null {
  if (
    !Number.isFinite(completedTiles) ||
    !Number.isFinite(tileCount) ||
    tileCount === undefined ||
    completedTiles === undefined ||
    tileCount <= 0 ||
    completedTiles < 0
  )
    return null;
  return Math.min(100, Math.floor((completedTiles / tileCount) * 100));
}

/** Announce stage changes, readiness changes, completion, or at most each 10% of known tiles. */
export function shouldAnnounceMapDownloadProgress(
  previous: MapDownloadProgressState | null,
  current: MapDownloadProgressState,
): boolean {
  if (!previous || previous.phase !== current.phase) return true;
  if (current.phase !== 'map') return false;
  if (previous.mapStatus !== current.mapStatus && current.mapStatus === 'complete') return true;
  if (previous.usableZoom !== current.usableZoom && current.usableZoom !== undefined) return true;
  const before = mapTileProgressPercent(previous.completedTiles, previous.tileCount);
  const now = mapTileProgressPercent(current.completedTiles, current.tileCount);
  if (before === null && now !== null) return true;
  return before !== null && now !== null && now >= before + 10;
}

export function mapDownloadProgressAnnouncement(state: MapDownloadProgressState): string {
  switch (state.phase) {
    case 'preparing':
      return 'Preparing the map download.';
    case 'evidence':
      return 'Map files are complete. Saving available regional places and weather.';
    case 'map-paused':
      return 'Map download paused. Completed resources are retained for resume.';
    case 'map-failed':
      return 'Map download stopped before completion. Review the error and resume when ready.';
    case 'complete':
      return 'Map files complete. Required tiles and fonts are ready.';
    case 'evidence-complete':
      return 'Map files and available regional evidence are saved.';
    case 'evidence-failed':
      return 'Map files are saved, but regional evidence download failed.';
    case 'map': {
      if (state.mapStatus === 'complete')
        return 'Map files complete. Required tiles and fonts are ready.';
      const percent = mapTileProgressPercent(state.completedTiles, state.tileCount);
      const count =
        state.completedTiles !== undefined && state.tileCount !== undefined
          ? `${state.completedTiles} of ${state.tileCount} tiles`
          : 'tile count unavailable';
      const progress = percent === null ? count : `${count} (${percent}%)`;
      if (
        state.completedTiles !== undefined &&
        state.tileCount !== undefined &&
        state.completedTiles >= state.tileCount
      )
        return `All map tiles downloaded (${progress}). Completing required fonts and map checks.`;
      return `Map download progress: ${progress}.${
        state.usableZoom !== undefined
          ? ` Coarse coverage is ready through zoom ${state.usableZoom}.`
          : ''
      }`;
    }
  }
}
const ratio = (units: UnitSystem) =>
  units === 'metric'
    ? CANONICAL_CONVERSIONS.kilometresPerNauticalMile
    : units === 'imperial'
      ? CANONICAL_CONVERSIONS.metresPerNauticalMile / CANONICAL_CONVERSIONS.metresPerStatuteMile
      : 1;
export const radiusInputUnit = (units: UnitSystem) =>
  units === 'metric' ? 'km' : units === 'imperial' ? 'mi' : 'nm';
export function createRadiusDraft(nauticalMiles: number, units: UnitSystem): RadiusDraft {
  return {
    text: Number.isFinite(nauticalMiles)
      ? String(Number((nauticalMiles * ratio(units)).toFixed(3)))
      : '',
    units,
    referenceNm: nauticalMiles,
  };
}
export function readRadiusDraft(draft: RadiusDraft): number {
  const parsed = parseInputDecimal(draft.text);
  if (!Number.isFinite(parsed)) return NaN;
  if (
    draft.referenceNm !== undefined &&
    parsed === parseInputDecimal(createRadiusDraft(draft.referenceNm, draft.units).text)
  )
    return draft.referenceNm;
  return parsed / ratio(draft.units);
}
export function convertRadiusDraft(draft: RadiusDraft, units: UnitSystem): RadiusDraft {
  if (draft.units === units) return draft;
  const nauticalMiles = readRadiusDraft(draft);
  return Number.isFinite(nauticalMiles)
    ? createRadiusDraft(nauticalMiles, units)
    : { text: draft.text, units };
}

/** Discovery supports a bounded circle even when a display-map selection is smaller/larger. */
export function evidenceRadiusNm(bounds: RegionPack['bounds']): number {
  return Math.max(0.25, Math.min(25, (bounds[3] - bounds[1]) * 30));
}
