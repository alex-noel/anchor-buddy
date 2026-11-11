import type { Candidate, Position, SearchRequest } from '@anchor-buddy/domain';
import { DEFAULT_FILTERS, type ResultFilters } from './workspace';

export type Tab = 'explore' | 'saved' | 'settings';
export type Flow = 'base' | 'plan' | 'watch';
export type DraftArea = { confirmed: boolean; name?: string; timezone?: string };
export type PreviewArea = { center: Position; radiusNm: number };
export type Plan = {
  instance: number;
  candidate: Candidate;
  allowance: 0 | 20 | 30;
  search: SearchRequest;
};
export type DetailSelection = { candidate: Candidate; allowance: 0 | 20 | 30 };
export type ModalName =
  | 'profile'
  | 'defaults'
  | 'advanced'
  | 'layers'
  | 'setup'
  | 'tour'
  | 'save'
  | 'data'
  | 'search'
  | 'download'
  | 'detail';
export type Modal = { name: ModalName; parent?: 'setup' } | null;
export interface WorkspaceState {
  activeSearch: SearchRequest | null;
  activeAreaName?: string;
  activeAreaTimezone?: string;
  searchDraft: SearchRequest | null;
  searchDraftArea: DraftArea;
  draftRestore?: { filters?: ResultFilters; pin?: Position };
  tab: Tab;
  flow: Flow;
  previewArea: PreviewArea | null;
  mapPreview: boolean;
  view: 'map' | 'list';
  filters: ResultFilters;
  selectedId?: string;
  detail: DetailSelection | null;
  detailSearch: SearchRequest | null;
  customPin: Candidate | null;
  choosingPin: boolean;
  plan: Plan | null;
  watchSetup?: { position: Position; radius?: number };
  modal: Modal;
}
export const initialWorkspace: WorkspaceState = {
  activeSearch: null,
  searchDraft: null,
  searchDraftArea: { confirmed: false },
  tab: 'explore',
  flow: 'base',
  previewArea: null,
  mapPreview: false,
  view: 'map',
  filters: DEFAULT_FILTERS,
  detail: null,
  detailSearch: null,
  customPin: null,
  choosingPin: false,
  plan: null,
  modal: null,
};
type FieldKey = Exclude<keyof WorkspaceState, 'modal'>;
type FieldAction = { [K in FieldKey]: { type: 'set'; key: K; value: WorkspaceState[K] } }[FieldKey];
export type WorkspaceAction =
  | { type: 'openModal'; name: ModalName }
  | { type: 'closeModal'; name: ModalName }
  | { type: 'changeTab'; tab: Tab }
  | { type: 'changeView'; view: 'map' | 'list' }
  | { type: 'back' }
  | { type: 'invalidateEvidence' }
  | { type: 'openPreview'; area: PreviewArea; name?: string; timezone?: string }
  | { type: 'closePreview' }
  | {
      type: 'beginSearch';
      draft: SearchRequest;
      area: DraftArea;
      restore?: { filters?: ResultFilters; pin?: Position };
    }
  | { type: 'cancelSearch' }
  | {
      type: 'commitSearch';
      search: SearchRequest;
      area?: { regionName: string; timezone: string };
      filters?: ResultFilters;
      pin?: Position;
    }
  | { type: 'openDetails'; selection: DetailSelection; search: SearchRequest | null }
  | { type: 'closeDetails' }
  | { type: 'openPlan'; plan: Plan }
  | { type: 'showWatch'; setup?: { position: Position; radius?: number } }
  | { type: 'commitProfile' }
  | { type: 'closeSearch' };
export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction | FieldAction,
): WorkspaceState {
  switch (action.type) {
    case 'set':
      return { ...state, [action.key]: action.value };
    case 'openModal':
      return {
        ...state,
        modal: {
          name: action.name,
          ...((action.name === 'profile' || action.name === 'defaults') &&
          state.modal?.name === 'setup'
            ? { parent: 'setup' as const }
            : {}),
        },
      };
    case 'closeModal':
      if (state.modal?.name !== action.name) return state;
      return { ...state, modal: state.modal.parent ? { name: state.modal.parent } : null };
    case 'changeTab':
      return {
        ...state,
        tab: action.tab,
        flow: 'base',
        detail: null,
        detailSearch: null,
        choosingPin: false,
        modal: state.modal?.name === 'detail' ? null : state.modal,
      };
    case 'changeView':
      return { ...state, view: action.view };
    case 'back':
      return { ...state, flow: state.flow === 'watch' && state.plan ? 'plan' : 'base' };
    case 'invalidateEvidence':
      return {
        ...state,
        detail: null,
        detailSearch: null,
        plan: null,
        watchSetup: undefined,
        flow: 'base',
        modal: state.modal?.name === 'detail' ? null : state.modal,
      };
    case 'openPreview':
      return {
        ...workspaceReducer(state, { type: 'closeSearch' }),
        previewArea: action.area,
        mapPreview: true,
        activeAreaName: action.name,
        activeAreaTimezone: action.timezone,
        view: 'map',
        tab: 'explore',
      };
    case 'closePreview':
      return state.mapPreview && !state.activeSearch
        ? workspaceReducer(state, { type: 'closeSearch' })
        : state;
    case 'beginSearch':
      return {
        ...state,
        searchDraft: action.draft,
        searchDraftArea: action.area,
        draftRestore: action.restore,
        modal: { name: 'search' },
      };
    case 'cancelSearch':
      return state.modal?.name === 'search'
        ? { ...state, searchDraft: null, draftRestore: undefined, modal: null }
        : state;
    case 'commitSearch': {
      const restore =
        action.pin || action.filters
          ? { pin: action.pin, filters: action.filters }
          : state.draftRestore;
      return {
        ...state,
        searchDraft: null,
        draftRestore: undefined,
        modal: state.modal?.name === 'search' ? null : state.modal,
        activeSearch: action.search,
        activeAreaName: action.area?.regionName,
        activeAreaTimezone: action.area?.timezone,
        customPin: restore?.pin
          ? {
              id: 'custom-pin',
              name: 'Selected anchor position',
              kind: 'generated',
              position: restore.pin,
            }
          : null,
        selectedId: restore?.pin ? 'custom-pin' : undefined,
        filters: restore?.filters ?? state.filters,
        choosingPin: false,
        detail: null,
        detailSearch: null,
        plan: null,
        watchSetup: undefined,
        mapPreview: false,
        previewArea: null,
        tab: 'explore',
        flow: 'base',
      };
    }
    case 'openDetails':
      return {
        ...state,
        selectedId: action.selection.candidate.id,
        detail: action.selection,
        detailSearch: action.search,
        modal: { name: 'detail' },
      };
    case 'closeDetails':
      return state.modal?.name === 'detail'
        ? { ...state, detail: null, detailSearch: null, modal: null }
        : state;
    case 'openPlan':
      return {
        ...state,
        plan: action.plan,
        detail: null,
        detailSearch: null,
        modal: state.modal?.name === 'detail' ? null : state.modal,
        flow: 'plan',
      };
    case 'showWatch':
      return {
        ...state,
        detail: null,
        detailSearch: null,
        modal: state.modal?.name === 'detail' ? null : state.modal,
        flow: 'watch',
        watchSetup: action.setup ?? state.watchSetup,
      };
    case 'commitProfile':
      return {
        ...state,
        plan: null,
        watchSetup: undefined,
        flow: state.flow === 'plan' ? 'base' : state.flow,
      };
    case 'closeSearch':
      return {
        ...state,
        modal:
          state.modal?.name === 'detail' || state.modal?.name === 'search' ? null : state.modal,
        searchDraft: null,
        draftRestore: undefined,
        activeSearch: null,
        activeAreaName: undefined,
        activeAreaTimezone: undefined,
        customPin: null,
        selectedId: undefined,
        detail: null,
        detailSearch: null,
        plan: null,
        watchSetup: undefined,
        mapPreview: false,
        previewArea: null,
        choosingPin: false,
        flow: 'base',
      };
  }
}

/** Invalidating a generation also invalidates in-flight source completions. */
export class RequestGeneration {
  private value = 0;
  private live = true;
  mount() {
    this.live = true;
  }
  begin() {
    return ++this.value;
  }
  current(generation: number) {
    return this.live && generation === this.value;
  }
  cancel() {
    ++this.value;
  }
  dispose() {
    this.live = false;
    ++this.value;
  }
}

/** A cache write may finish after cancellation; only a current request may use its result. */
export async function cacheCurrentEvidence<T>(
  value: T,
  cache: (value: T) => Promise<T>,
  current: () => boolean,
  onCurrent: (stored: T) => void,
): Promise<void> {
  const stored = await cache(value);
  if (current()) onCurrent(stored);
}

/** Owns status observation only; the narrow bridge cannot issue native watch commands. */
export function observeWatchStatus<T>(
  bridge: { getStatus: () => Promise<T>; subscribe: (listener: (status: T) => void) => () => void },
  accept: (status: T) => void,
  unavailable: () => void,
) {
  let live = true;
  let version = 0;
  const unsubscribe = bridge.subscribe((status) => {
    version++;
    if (live) accept(status);
  });
  return {
    async refresh() {
      const request = ++version;
      try {
        const status = await bridge.getStatus();
        if (live && request === version) accept(status);
      } catch {
        if (live && request === version) unavailable();
      }
    },
    invalidate() {
      version++;
    },
    dispose() {
      live = false;
      version++;
      unsubscribe();
    },
  };
}

/** Request cancellation and teardown never touch the independently running native watch. */
export function cancelWorkspaceRequest(
  generation: RequestGeneration,
  request: AbortController | null,
) {
  generation.cancel();
  request?.abort();
}
export function disposeWorkspaceRequest(
  generation: RequestGeneration,
  request: AbortController | null,
) {
  generation.dispose();
  request?.abort();
}
