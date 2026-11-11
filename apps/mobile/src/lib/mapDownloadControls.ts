import type { RegionPack, UnitSystem } from '@anchor-buddy/domain';
import { parseInputDecimal } from './inputNumbers';

export interface RadiusDraft {
  text: string;
  units: UnitSystem;
  referenceNm?: number;
}
const ratio = (units: UnitSystem) =>
  units === 'metric' ? 1.852 : units === 'imperial' ? 1.15078 : 1;
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
