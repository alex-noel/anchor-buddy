import type { Assessment } from '@anchor-buddy/domain';
import { colors } from '../theme';

export const MAP_RESULT_LIMIT = 50;

const statusLabels = {
  passes: { label: 'Checks pass', icon: 'check-circle', glyph: '✓', color: colors.success },
  excluded: { label: 'Excluded', icon: 'x-circle', glyph: '×', color: colors.error },
  insufficient_evidence: {
    label: 'Needs more evidence',
    icon: 'alert-circle',
    glyph: '?',
    color: colors.neutral,
  },
} as const;

export const assessmentStatus = (status: Assessment['status']) => statusLabels[status];
export const resultStatuses = Object.values(statusLabels);

export interface PresentedPlace {
  assessment: Assessment;
  selected: boolean;
  status: ReturnType<typeof assessmentStatus>;
}

export interface RankedResult extends PresentedPlace {
  rank: number;
}

export interface ManualPin extends PresentedPlace {
  rank: null;
}

export function createResultPresentation(
  assessments: readonly Assessment[],
  selectedId?: string,
  manualAssessment?: Assessment | null,
) {
  const present = (assessment: Assessment): PresentedPlace => ({
    assessment,
    selected: assessment.id === selectedId,
    status: assessmentStatus(assessment.status),
  });
  const results: RankedResult[] = assessments.map((a, index) => ({
    ...present(a),
    rank: index + 1,
  }));
  const rankedSelection = results.find((result) => result.selected);
  const manualPin: ManualPin | null = manualAssessment
    ? { ...present(manualAssessment), rank: null }
    : null;
  const selectedBeyondLimit = Boolean(rankedSelection && rankedSelection.rank > MAP_RESULT_LIMIT);
  const markers: Array<RankedResult | ManualPin> = results.slice(0, MAP_RESULT_LIMIT);
  if (rankedSelection && selectedBeyondLimit) markers.push(rankedSelection);
  if (manualPin) markers.push(manualPin);
  return {
    results,
    markers,
    selected: manualPin?.selected ? manualPin : rankedSelection,
    selectedBeyondLimit,
  };
}

export type ResultPresentation = ReturnType<typeof createResultPresentation>;
export const MANUAL_PIN_GLYPH = '◆';

export function markerLabel(result: RankedResult | ManualPin): string {
  return `${result.assessment.candidate.name}. ${result.rank === null ? 'Manual pin' : `Rank ${result.rank}`}. ${result.status.label}.`;
}

export function markerText(result: RankedResult | ManualPin): string {
  return `${result.rank ?? MANUAL_PIN_GLYPH} ${result.status.glyph}`;
}
