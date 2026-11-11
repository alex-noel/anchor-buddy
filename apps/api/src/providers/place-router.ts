import { areaContainsDisk } from '@anchor-buddy/domain';
import type { DiscoverRequest } from './live-types.js';
import { EUROPE_EXTRACT } from './europe-extract.js';
import type { PlacesResult } from './overpass.js';

export function usesEuropeExtract(request: DiscoverRequest) {
  return areaContainsDisk(request.center, request.radiusNm * 1852, EUROPE_EXTRACT);
}
/** One selected provider per area, never an automatic retry/mirror chain. */
export class RegionalPlacesProvider {
  constructor(
    private readonly global: { discover(request: DiscoverRequest): Promise<PlacesResult> },
    private readonly europe?: { discover(request: DiscoverRequest): Promise<PlacesResult> },
  ) {}
  discover(request: DiscoverRequest) {
    return (this.europe && usesEuropeExtract(request) ? this.europe : this.global).discover(
      request,
    );
  }
}
