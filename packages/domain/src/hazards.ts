import type { HazardPrimitive } from './contracts.ts';
import type { AssessmentReason, Position } from './types.ts';
import { primitiveDistanceBounds, PRIMITIVE_GEOMETRY_LIMITS } from './geo.ts';

export const MAX_HAZARD_PRIMITIVES = 256;
/** Same evidence rules for real inputs and test fixtures. No approval/test-mode switch. */
export function assessHazardPrimitives(
  position: Position,
  footprintRadiusM: number,
  primitives: readonly HazardPrimitive[],
): { reasons: AssessmentReason[]; complete: boolean } {
  if (!primitives.length) return { reasons: [], complete: true };
  const reasons: AssessmentReason[] = [
    {
      code: 'hazard_model_review_required',
      message:
        'Primitive-hazard numerical assumptions require qualified review and a version-bound approval before clearance can be established.',
      severity: 'insufficient_evidence',
    },
  ];
  if (
    primitives.length > MAX_HAZARD_PRIMITIVES ||
    !Number.isFinite(footprintRadiusM) ||
    footprintRadiusM < 0
  ) {
    reasons.push({
      code: 'hazard_primitive_unsupported',
      message:
        'Primitive hazard work or footprint exceeds the supported assessment limits; no geometry was simplified.',
      severity: 'insufficient_evidence',
    });
    return { reasons, complete: false };
  }
  reasons[0]!.sourceIds = [...new Set(primitives.flatMap((hazard) => hazard.sourceIds))].sort();
  const budget = { remaining: PRIMITIVE_GEOMETRY_LIMITS.maxDistanceEvaluations };
  for (const hazard of [...primitives].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const sourceIds = [...hazard.sourceIds].sort();
    if (hazard.extentM === null || hazard.positionalUncertaintyM === null) {
      reasons.push({
        code: 'hazard_primitive_uncertainty',
        message: `Hazard ${hazard.id}: physical extent or positional uncertainty is unresolved.`,
        severity: 'insufficient_evidence',
        sourceIds,
      });
    }
    const bound = primitiveDistanceBounds(position, hazard.geometry, budget);
    if (bound.status === 'unsupported') {
      reasons.push({
        code: 'hazard_primitive_unsupported',
        message: `Hazard ${hazard.id}: unsupported ${bound.reason}; the original geometry remains unresolved.`,
        severity: 'insufficient_evidence',
        sourceIds,
      });
      continue;
    }
    // Unknown quantities never support clearance. An original-geometry intersection still
    // excludes; add only separately known bounds without overwriting unknown source values.
    let threshold = footprintRadiusM + PRIMITIVE_GEOMETRY_LIMITS.guardM;
    if (hazard.extentM !== null) threshold += hazard.extentM;
    if (hazard.positionalUncertaintyM !== null) threshold += hazard.positionalUncertaintyM;
    if (bound.lowerM <= threshold)
      reasons.push({
        code: `hazard_${hazard.kind}`,
        message: `The full footprint intersects the conservative bounds of ${hazard.name} (${hazard.id}).`,
        severity: 'excluded',
        sourceIds,
      });
  }
  // No numerical-model approval binding exists in the current contract. Never self-approve.
  return { reasons, complete: false };
}
