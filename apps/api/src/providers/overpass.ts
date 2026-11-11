import type { Place, NavigationMark, Position, SourceRecord } from '@anchor-buddy/domain';
import type { HttpTransport } from './contracts.js';
import { createHash } from 'node:crypto';
import { ProviderError } from './http.js';
import {
  coordinate,
  distanceNm,
  sourceRecord,
  type DiscoverRequest,
  type ProviderStatus,
} from './live-types.js';
interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
interface OverpassResponse {
  elements: OsmElement[];
  remark?: string;
  osm3s?: { timestamp_osm_base?: string };
}
export interface PlacesResult {
  places: Place[];
  marks: NavigationMark[];
  source: SourceRecord;
  status: ProviderStatus;
}
const label = (value: unknown, max = 180) =>
  typeof value === 'string' ? value.replace(/[\x00-\x1f]/g, '').slice(0, max) : '';
export class OverpassProvider {
  constructor(
    private readonly http: HttpTransport,
    private readonly endpoint = 'https://overpass-api.de/api/interpreter',
    private readonly enabled = true,
  ) {}
  async discover(request: DiscoverRequest): Promise<PlacesResult> {
    if (!this.enabled)
      throw new ProviderError(
        'CONFIGURATION_REQUIRED',
        'Production boating place discovery requires a configured managed or self-hosted Overpass endpoint',
      );
    const [lon, lat] = request.center;
    const radius = Math.ceil(request.radiusNm * 1852);
    const circle = `(around:${radius},${lat.toFixed(4)},${lon.toFixed(4)})`;
    const query = `[out:json][timeout:18][maxsize:16777216];(nwr["leisure"="marina"]${circle};nwr["mooring"]["mooring"!="no"]${circle};nwr["seamark:type"~"^(harbour|mooring|anchorage|buoy_lateral|buoy_cardinal|buoy_isolated_danger|buoy_safe_water|buoy_special_purpose|beacon_lateral|beacon_cardinal)$"]${circle};);out tags center 601;`;
    const url = new URL(this.endpoint);
    url.searchParams.set('data', query);
    const response = await this.http.json<OverpassResponse>(url.href);
    if (!response.data || !Array.isArray(response.data.elements))
      throw new ProviderError('INVALID_RESPONSE', 'Overpass returned no element list');
    const source = sourceRecord(
      'osm-live-' +
        createHash('sha256')
          .update(response.provenance.url + response.provenance.retrievedAt)
          .digest('hex')
          .slice(0, 12),
      'OpenStreetMap boating features',
      response.provenance.url,
      response.provenance.retrievedAt,
      response.provenance.validUntil,
      '© OpenStreetMap contributors',
      'ODbL 1.0 — https://www.openstreetmap.org/copyright',
    );
    const places: Place[] = [];
    const marks: NavigationMark[] = [];
    const seen = new Set<string>();
    for (const element of response.data.elements.slice(0, 600)) {
      if (!['node', 'way', 'relation'].includes(element.type) || !Number.isSafeInteger(element.id))
        continue;
      const position: Position = [
        element.lon ?? element.center?.lon ?? NaN,
        element.lat ?? element.center?.lat ?? NaN,
      ];
      if (!coordinate(position) || distanceNm(position, request.center) > request.radiusNm + 0.25)
        continue;
      const tags = element.tags ?? {};
      const seamark = tags['seamark:type'] ?? '';
      const id = `osm-${element.type}-${element.id}`;
      const url = `https://www.openstreetmap.org/${element.type}/${element.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      if (/^(buoy|beacon)_/.test(seamark)) {
        const kind: NavigationMark['kind'] = seamark.includes('isolated_danger')
          ? 'isolated_danger'
          : seamark.includes('safe_water')
            ? 'safe_water'
            : seamark.includes('lateral')
              ? 'lateral'
              : seamark.includes('cardinal')
                ? 'cardinal'
                : seamark.includes('special')
                  ? 'special'
                  : 'unknown';
        marks.push({
          id,
          name: label(tags.name || tags['seamark:name']) || 'Mapped navigation mark',
          position,
          kind,
          label: 'OSM · ' + label(tags['seamark:name'] || seamark.replace(/_/g, ' '), 60),
          sourceIds: [source.id],
        });
        continue;
      }
      const kind: Place['kind'] =
        tags.leisure === 'marina' || tags['seamark:harbour:category'] === 'marina'
          ? 'marina'
          : seamark === 'anchorage'
            ? 'anchorage'
            : seamark === 'mooring' || tags.mooring === 'buoy'
              ? 'mooring'
              : 'dock';
      const notes = [
        'Community-mapped position; verify the operator, approach and local rules. This is not an assessed drop point.',
        url,
      ];
      if (element.type !== 'node')
        notes.push('Position is the mapped feature centre, not a berth or entrance.');
      for (const key of [
        'fee',
        'access',
        'mooring',
        'maxdraft',
        'depth',
        'seamark:harbour:depth',
        'seabed',
        'surface',
        'opening_hours',
        'seamark:anchorage:category',
        'seamark:harbour:category',
        'seamark:mooring:category',
        'seamark:anchorage:restriction',
      ])
        if (tags[key]) notes.push(`Unverified OSM ${key}: ${label(tags[key], 120)}`);
      if (tags.website || tags['contact:website'])
        notes.push('Listed website: ' + label(tags.website || tags['contact:website'], 220));
      const facilities = [
        'drinking_water',
        'electricity',
        'fuel',
        'toilets',
        'shower',
        'sanitary_dump_station',
      ]
        .filter((key) => tags[key] === 'yes')
        .map((key) => 'OSM reported ' + key.replace(/_/g, ' '));
      places.push({
        id,
        name:
          label(tags.name || tags['seamark:name'] || tags.operator) ||
          `Mapped ${kind} (${element.id})`,
        kind,
        position,
        feeStatus: 'unknown',
        sourceIds: [source.id],
        overnightAllowed: null,
        availability: 'unknown',
        holding: 'unknown',
        vesselLimitsVerified: false,
        operationalRestrictionsVerified: false,
        facilities,
        notes,
        ...(tags.phone || tags['contact:phone']
          ? { contact: label(tags.phone || tags['contact:phone'], 80) }
          : {}),
      });
    }
    const truncated = response.data.elements.length > 600 || !!response.data.remark;
    return {
      places,
      marks,
      source,
      status: {
        id: 'osm-overpass',
        name: 'OpenStreetMap boating places',
        status: truncated ? 'partial' : 'available',
        message: `${places.length} mapped places and ${marks.length} marks. ${truncated ? 'The provider response was partial or capped. ' : ''}${response.data.osm3s?.timestamp_osm_base ? 'OSM database snapshot ' + response.data.osm3s.timestamp_osm_base + '. ' : ''}Community mapping is incomplete; all depths, fees, permissions and vessel limits remain unverified.`,
        attribution: source.attribution,
        documentationUrl: 'https://dev.overpass-api.de/overpass-doc/en/preface/commons.html',
        retrievedAt: source.retrievedAt,
        validUntil: source.validUntil,
        license: source.license,
      },
    };
  }
}
