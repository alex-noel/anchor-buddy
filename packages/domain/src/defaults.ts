import type { Position, SearchRequest, VesselProfile } from './types.ts';

/** Form draft only: unknown measurements remain zero and validation blocks use. */
export function createVesselDraft(): VesselProfile {
  return {
    id: 'unconfigured-vessel',
    name: '',
    type: 'sailboat',
    lengthM: 0,
    beamM: 0,
    loadedDraftM: 0,
    displacementKg: 0,
    anchor: {
      type: '',
      rodeType: 'chain',
      usableLengthM: 0,
      bowRollerHeightM: 0,
      scopeGuidance: null,
    },
  };
}

/** Adjustable starting preferences, not equipment guidance or a confirmed location.
 * The caller must supply a map position and obtain the user's search confirmation. */
export function createDefaultSearch(
  origin: Position,
  now: Date | string = new Date(),
): SearchRequest {
  const time = (now instanceof Date ? now : new Date(now)).getTime();
  if (!Number.isFinite(time)) throw new Error('A valid date is required for search preferences.');
  if (
    !Array.isArray(origin) ||
    origin.length !== 2 ||
    !origin.every(Number.isFinite) ||
    Math.abs(origin[0]) > 180 ||
    Math.abs(origin[1]) > 85
  ) {
    throw new Error('An explicit valid map position is required for search preferences.');
  }
  const hour = 3_600_000;
  return {
    origin: [...origin],
    maxDistanceNm: 3,
    arrival: new Date(time + hour).toISOString(),
    departure: new Date(time + 19 * hour).toISOString(),
    departureContingencyHours: 3,
    preferredMaxDepthM: 5,
    preferredBeddings: [],
    minUnderKeelClearanceM: 0.6,
    maxWindKnots: 15,
    maxGustKnots: 20,
    maxWaveM: 0.5,
    maxCurrentKnots: 1,
    visitMode: 'overnight',
    safetyMarginM: 5,
  };
}
