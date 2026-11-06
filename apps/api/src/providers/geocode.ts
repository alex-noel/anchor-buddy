import type { Position } from '@anchor-buddy/domain';
import type { HttpTransport } from './contracts.js';
import { ProviderError } from './http.js';
export class NominatimProvider {
  constructor(
    private readonly http: HttpTransport,
    private readonly endpoint = 'https://nominatim.openstreetmap.org/search',
  ) {}
  async search(query: string) {
    const q = query.trim();
    if (q.length < 2 || q.length > 120 || /[\x00-\x1f]/.test(q))
      throw new ProviderError(
        'INVALID_QUERY',
        'Enter a place name between 2 and 120 characters',
        400,
      );
    const url = new URL(this.endpoint);
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '0');
    url.searchParams.set('accept-language', 'en');
    const response = await this.http.json<
      Array<{ display_name: string; lon: string; lat: string }>
    >(url.href);
    if (!Array.isArray(response.data))
      throw new ProviderError('INVALID_RESPONSE', 'Geocoder returned an invalid result');
    const results = response.data.slice(0, 5).flatMap((item) => {
      if (
        typeof item.lon !== 'string' ||
        typeof item.lat !== 'string' ||
        !item.lon.trim() ||
        !item.lat.trim()
      )
        return [];
      const longitude = Number(item.lon),
        latitude = Number(item.lat);
      return typeof item.display_name === 'string' &&
        Number.isFinite(longitude) &&
        Number.isFinite(latitude) &&
        Math.abs(longitude) <= 180 &&
        Math.abs(latitude) <= 85
        ? [{ name: item.display_name.slice(0, 300), position: [longitude, latitude] as Position }]
        : [];
    });
    return {
      results,
      attribution: '© OpenStreetMap contributors',
      license: 'ODbL 1.0',
      documentationUrl: 'https://operations.osmfoundation.org/policies/nominatim/',
      retrievedAt: response.provenance.retrievedAt,
    };
  }
}
