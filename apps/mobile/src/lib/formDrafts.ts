import type { Position, SearchRequest, VesselProfile } from '@anchor-buddy/domain';
import { parseInputDecimal } from './inputNumbers';
import { fromIsoToLocalHour, localHourToIso, type LocalDateHour } from './localDateHour';

/** Half-entered coordinates are drafts, never a fallback to a previous map centre. */
export function readCoordinateDraft(latitude: string, longitude: string): Position | null {
  const lat = parseInputDecimal(latitude),
    lon = parseInputDecimal(longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 85 && Math.abs(lon) <= 180
    ? [lon, lat]
    : null;
}

/** Retain exact stored thresholds when a rounded display value has not been edited. */
export function parseUnitDraft(text: string, reference: number, ratio: number): number {
  return text === String(Number((reference * ratio).toFixed(2)))
    ? reference
    : parseInputDecimal(text) / ratio;
}

/** Preserve elapsed duration; round departure up if a half-hour DST change prevents an exact hour. */
export function moveStayArrival(
  arrival: LocalDateHour,
  departure: LocalDateHour,
  nextArrival: LocalDateHour,
): LocalDateHour {
  try {
    const duration = Date.parse(localHourToIso(departure)) - Date.parse(localHourToIso(arrival));
    if (duration <= 0) return departure;
    const target = new Date(Date.parse(localHourToIso(nextArrival)) + duration);
    // An hour-only control must not silently shorten the stay at half-hour DST changes.
    if (target.getMinutes()) target.setTime(target.getTime() + (60 - target.getMinutes()) * 60_000);
    return fromIsoToLocalHour(target.toISOString());
  } catch {
    // Keep incomplete/ambiguous selections visible until the user resolves them.
    return departure;
  }
}

export function withDefaultStayDuration(search: SearchRequest, text: string): SearchRequest {
  const hours = parseInputDecimal(text);
  if (!Number.isInteger(hours) || hours < 1 || hours > 168)
    throw new Error(
      'Default stay duration must be a whole number from 1 to 168 hours (seven days).',
    );
  return {
    ...search,
    departure: new Date(Date.parse(search.arrival) + hours * 3_600_000).toISOString(),
  };
}

/** Guidance is specific to the configured boat and equipment, not just its design family. */
export function equipmentChanged(previous: VesselProfile, next: VesselProfile): boolean {
  return (
    (['type', 'lengthM', 'beamM', 'loadedDraftM', 'displacementKg', 'airDraftM'] as const).some(
      (key) => previous[key] !== next[key],
    ) ||
    (['type', 'rodeType', 'usableLengthM', 'bowRollerHeightM'] as const).some(
      (key) => previous.anchor[key] !== next.anchor[key],
    )
  );
}

export const formFieldNames = {
  maxDistanceNm: 'radius',
  departureContingencyHours: 'departure contingency',
  airDraftM: 'air draft',
  usableLengthM: 'usable rode length',
  bowRollerHeightM: 'bow roller height',
  lengthM: 'length overall',
  beamM: 'beam',
  loadedDraftM: 'loaded draft',
  displacementKg: 'displacement',
  preferredMaxDepthM: 'preferred maximum depth',
  minUnderKeelClearanceM: 'under-keel clearance',
  maxWindKnots: 'sustained-wind limit',
  maxGustKnots: 'gust limit',
  maxWaveM: 'wave-height limit',
  maxCurrentKnots: 'current limit',
  safetyMarginM: 'swing-footprint margin',
} as const;
export type FormFieldKey = keyof typeof formFieldNames;

function fieldKeysInError(error: string): FormFieldKey[] {
  return (Object.keys(formFieldNames) as FormFieldKey[]).filter((key) =>
    new RegExp(`\\b${key}\\b`).test(error),
  );
}

function replaceFieldTokens(error: string): string {
  return error.replace(
    /\b[a-zA-Z][a-zA-Z0-9]*(?:M|Kg|Knots|Nm|Hours)\b/g,
    (key) => formFieldNames[key as FormFieldKey] ?? key,
  );
}

/** Split recognized field errors from the summary without losing unknown messages. */
export function partitionFormErrors(errors: string[]): {
  fields: Partial<Record<FormFieldKey, string[]>>;
  summary: string[];
} {
  const fields: Partial<Record<FormFieldKey, string[]>> = {};
  const summary: string[] = [];
  for (const error of errors) {
    const keys = fieldKeysInError(error);
    if (!keys.length) {
      summary.push(replaceFieldTokens(error));
      continue;
    }
    const readable = replaceFieldTokens(error);
    for (const key of keys) fields[key] = [...(fields[key] ?? []), readable];
  }
  return { fields, summary };
}

export function readableFormErrors(errors: string[]): string {
  return errors.map(replaceFieldTokens).join(' ');
}
