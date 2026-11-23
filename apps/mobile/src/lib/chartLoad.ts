export type ChartSourceFailure = { sourceId?: string; tileKey?: string };
type Issue = 'partial' | 'renderer';

export interface ChartLoad {
  phase: 'loading' | 'ready' | 'failed';
  failures: ChartSourceFailure[];
  recovering?: Issue;
  slow: boolean;
}

export const initialChartLoad: ChartLoad = { phase: 'loading', failures: [], slow: false };

export function chartIssue(state: ChartLoad): Issue | undefined {
  if (state.phase === 'failed') return 'renderer';
  return state.recovering ?? (state.failures.length ? 'partial' : undefined);
}

type ChartEvent =
  | { type: 'start' | 'rendered' | 'rendererFailed' | 'slow' }
  | { type: 'sourceFailed' | 'sourceRecovered'; source: ChartSourceFailure }
  | { type: 'sourcesDisplayed'; ids: ReadonlySet<string> };

const sameResource = (a: ChartSourceFailure, b: ChartSourceFailure) =>
  a.sourceId === b.sourceId && a.tileKey === b.tileKey;

export function chartLoadReducer(state: ChartLoad, event: ChartEvent): ChartLoad {
  switch (event.type) {
    case 'start':
      return { ...initialChartLoad, recovering: chartIssue(state) };
    case 'rendererFailed':
      return state.phase === 'failed'
        ? state
        : { ...state, phase: 'failed', recovering: undefined };
    case 'rendered':
      // Rendering cannot recover a lost context until the renderer explicitly restarts.
      return state.phase === 'loading'
        ? { ...state, phase: 'ready', recovering: undefined, slow: false }
        : state;
    case 'sourceFailed':
      return state.failures.some((item) => sameResource(item, event.source))
        ? state
        : { ...state, failures: [...state.failures, event.source] };
    case 'sourceRecovered': {
      const failures = state.failures.filter((item) => !sameResource(item, event.source));
      return failures.length < state.failures.length ? { ...state, failures } : state;
    }
    case 'sourcesDisplayed': {
      const failures = state.failures.filter(
        (item) => !item.sourceId || event.ids.has(item.sourceId),
      );
      return failures.length < state.failures.length ? { ...state, failures } : state;
    }
    case 'slow':
      return state.phase === 'loading' && !state.slow ? { ...state, slow: true } : state;
  }
}
