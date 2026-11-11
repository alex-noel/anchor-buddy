import {
  assessCandidate,
  type Assessment,
  type AssessmentContext,
  type Candidate,
  type RegionPack,
  type SearchRequest,
  type VesselProfile,
} from '@anchor-buddy/domain';

/** Refreshes may remove or move a selected place. Keep the UI usable without silently moving the pin. */
export function reassessSelection(
  candidate: Candidate,
  vessel: VesselProfile,
  search: SearchRequest,
  pack: RegionPack,
  context: AssessmentContext,
  allowance: 0 | 20 | 30 = 0,
): { assessment: Assessment | null; error: string } {
  if (
    candidate.kind !== 'generated' &&
    !pack.places.some(
      (place) =>
        place.id === candidate.id &&
        place.kind === candidate.kind &&
        place.position.every((coordinate, index) => coordinate === candidate.position[index]),
    )
  )
    return {
      assessment: null,
      error:
        'This place changed or is no longer present in the current source data. Close these details and select a current result.',
    };
  try {
    return {
      assessment: assessCandidate(candidate, vessel, search, pack, context, allowance),
      error: '',
    };
  } catch {
    return {
      assessment: null,
      error:
        'This selection could not be reassessed with the current boat, search and source data. Close these details and review your search.',
    };
  }
}
