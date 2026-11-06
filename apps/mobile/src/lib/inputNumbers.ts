/** Accept decimal-pad commas without discarding unfinished drafts while the user types. */
export function parseInputDecimal(value: string): number {
  const trimmed = value.trim().replace(/^−/, '-');
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return NaN;
  return Number(trimmed.replace(',', '.'));
}

export interface LengthDraft {
  text: string;
  units: 'nautical' | 'metric' | 'imperial';
  /** Preserve exact metres when a rounded display value has not been edited. */
  referenceM?: number;
}
const lengthRatio = (units: LengthDraft['units']) => (units === 'imperial' ? 1 / 0.3048 : 1);
export function lengthInputUnit(units: LengthDraft['units']) {
  return units === 'imperial' ? 'ft' : 'm';
}
export function createLengthDraft(
  metres: number | undefined,
  units: LengthDraft['units'],
): LengthDraft {
  return {
    text:
      metres === undefined || !Number.isFinite(metres)
        ? ''
        : String(Number((metres * lengthRatio(units)).toFixed(3))),
    units,
    referenceM: metres,
  };
}
export function readLengthDraft(draft: LengthDraft): number {
  const parsed = parseInputDecimal(draft.text);
  if (!Number.isFinite(parsed)) return NaN;
  if (
    draft.referenceM !== undefined &&
    parsed === parseInputDecimal(createLengthDraft(draft.referenceM, draft.units).text)
  )
    return draft.referenceM;
  return parsed / lengthRatio(draft.units);
}
export function convertLengthDraft(draft: LengthDraft, units: LengthDraft['units']): LengthDraft {
  if (draft.units === units) return draft;
  const metres = readLengthDraft(draft);
  return Number.isFinite(metres) ? createLengthDraft(metres, units) : { text: draft.text, units };
}
