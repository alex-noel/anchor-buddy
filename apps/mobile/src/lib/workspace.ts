import {
  validateSearch,
  type Assessment,
  type FeeStatus,
  type PlaceKind,
  type Position,
  type SearchRequest,
} from '@anchor-buddy/domain';
export interface MapLayers {
  depth: boolean;
  bedding: boolean;
  marks: boolean;
}
export interface ResultFilters {
  kind: PlaceKind | 'all';
  fee: FeeStatus | 'all';
  assessment: 'recommended' | 'complete' | 'all';
  compatibleOnly: boolean;
  sort: 'distance' | 'price' | 'depth' | 'exposure';
}
export const DEFAULT_LAYERS: MapLayers = { depth: true, bedding: true, marks: true };
export const DEFAULT_FILTERS: ResultFilters = {
  kind: 'all',
  fee: 'all',
  assessment: 'recommended',
  compatibleOnly: false,
  sort: 'distance',
};
export interface SavedSearch {
  id: string;
  name: string;
  savedAt: string;
  evidence?: 'non-synthetic';
  requiresReassessment?: boolean;
  packId: string;
  packVersion: string;
  vesselName: string;
  search: SearchRequest;
  filters: ResultFilters;
  results: {
    id: string;
    name: string;
    status: Assessment['status'];
    depthM: number | null;
    total: number | null;
    currency: string | null;
  }[];
  selectedPosition?: Position;
}
/** Start a new search at the next local whole hour, preserving the configured stay duration. */
export function freshSearch(defaults: SearchRequest, now = new Date()): SearchRequest {
  const arrival = new Date(now);
  arrival.setHours(arrival.getHours() + 1, 0, 0, 0);
  const duration = Math.max(
    3_600_000,
    Date.parse(defaults.departure) - Date.parse(defaults.arrival),
  );
  const { deployedRodeM: _deployedRodeM, ...preferences } = defaults;
  return {
    ...preferences,
    arrival: arrival.toISOString(),
    departure: new Date(arrival.getTime() + duration).toISOString(),
  };
}

/** An expired saved stay needs an explicit date review, not a search in the past. */
export function prepareSavedSearch(search: SearchRequest, now = new Date()) {
  const needsDateReview = Date.parse(search.departure) <= now.getTime();
  return { needsDateReview, search: needsDateReview ? freshSearch(search, now) : { ...search } };
}
export function readSavedSearches(value: unknown): SavedSearch[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value
    .filter((item): item is SavedSearch => {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.id !== 'string' ||
        ids.has(item.id) ||
        typeof item.name !== 'string' ||
        typeof item.packId !== 'string' ||
        typeof item.packVersion !== 'string' ||
        typeof item.vesselName !== 'string' ||
        !Number.isFinite(Date.parse(item.savedAt)) ||
        !item.search ||
        validateSearch(item.search).length ||
        !Array.isArray(item.results) ||
        !item.filters ||
        !['all', 'anchorage', 'generated', 'marina', 'mooring', 'dock'].includes(
          item.filters.kind,
        ) ||
        !['all', 'free', 'paid', 'unknown'].includes(item.filters.fee) ||
        !['recommended', 'complete', 'all'].includes(item.filters.assessment) ||
        !['distance', 'price', 'depth', 'exposure'].includes(item.filters.sort) ||
        typeof item.filters.compatibleOnly !== 'boolean'
      )
        return false;
      if (
        item.selectedPosition !== undefined &&
        (!Array.isArray(item.selectedPosition) ||
          item.selectedPosition.length !== 2 ||
          !item.selectedPosition.every(Number.isFinite) ||
          Math.abs(item.selectedPosition[0]) > 180 ||
          Math.abs(item.selectedPosition[1]) > 85)
      )
        return false;
      if (
        item.results.length > 300 ||
        item.results.some(
          (r: SavedSearch['results'][number]) =>
            !r ||
            typeof r.id !== 'string' ||
            typeof r.name !== 'string' ||
            !['passes', 'excluded', 'insufficient_evidence'].includes(r.status) ||
            (r.total !== null && (!Number.isFinite(r.total) || r.total < 0)) ||
            (r.depthM !== null && !Number.isFinite(r.depthM)) ||
            (r.currency !== null &&
              (typeof r.currency !== 'string' || !/^[A-Z]{3}$/.test(r.currency))),
        )
      )
        return false;
      ids.add(item.id);
      return true;
    })
    .slice(0, 30)
    .map((item) =>
      item.evidence === 'non-synthetic'
        ? item
        : { ...item, results: [], requiresReassessment: true },
    );
}
export function stayLabel(search: SearchRequest) {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric' };
  return (
    new Date(search.arrival).toLocaleString('en-US', options) +
    ' – ' +
    new Date(search.departure).toLocaleString('en-US', options)
  );
}
