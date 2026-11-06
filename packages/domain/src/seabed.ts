import { BEDDINGS, type Bedding, type SearchRequest } from './types.ts';

/** Migrate legacy single preferences without changing an explicit new empty/all selection. */
export function getPreferredBeddings(
  search: Pick<SearchRequest, 'preferredBeddings' | 'preferredBedding'>,
): Bedding[] {
  const selected =
    search.preferredBeddings !== undefined
      ? search.preferredBeddings
      : search.preferredBedding && search.preferredBedding !== 'any'
        ? [search.preferredBedding]
        : [];
  return BEDDINGS.filter((bedding) => selected.includes(bedding));
}
