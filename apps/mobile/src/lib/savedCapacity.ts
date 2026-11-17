import type { SavedSearch } from './workspace';

export const SAVED_SEARCH_LIMIT = 30;
/** A replacement is authorized by the exact existing ID; no implicit eviction. */
export function addSavedSnapshot(
  existing: SavedSearch[],
  snapshot: SavedSearch,
  replaceId?: string,
): SavedSearch[] {
  if (existing.length > SAVED_SEARCH_LIMIT)
    throw new Error(
      'This library exceeds 30 saved searches. Delete existing searches until there are 30 or fewer before saving.',
    );
  if (existing.length < SAVED_SEARCH_LIMIT) return [snapshot, ...existing];
  if (!replaceId)
    throw new Error('Choose a saved search to replace, or cancel and delete one in Saved.');
  if (!existing.some((item) => item.id === replaceId))
    throw new Error('The selected search is no longer available. Choose another replacement.');
  return [snapshot, ...existing.filter((item) => item.id !== replaceId)];
}
