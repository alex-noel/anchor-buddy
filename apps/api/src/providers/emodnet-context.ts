import type { MapContext, Position, SourceRecord } from '@anchor-buddy/domain';
import type { HttpTransport, Sourced } from './contracts.js';
import { ProviderError } from './http.js';
import {
  coordinate,
  sourceRecord,
  type DiscoverRequest,
  type ProviderStatus,
} from './live-types.js';

const DEPTH_ENDPOINT = 'https://rest.emodnet-bathymetry.eu/depth_sample';
const SEABED_ENDPOINT = 'https://drive.emodnet-geology.eu/geoserver/gtk/wms';
const DOCUMENTATION = 'https://emodnet.ec.europa.eu/en/emodnet-web-service-documentation';
const TERMS =
  'https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products';
const LICENSE = `EMODnet aggregated products: CC BY 4.0; retain originator references and restrictions — ${TERMS}`;
const NOTICE =
  'Scientific map context at the selected point only. DTM values retain the reported sign and LAT reference; they are not charted clearance bounds. Sediment classification does not establish anchor holding, habitat permission or full-area coverage. Not for navigation or safety at sea.';
// Explicit projection avoids downloading geometry or the upstream personal-contact field.
const SEABED_FIELDS = 'original_substrate,folk_5cl_txt,scale,data_holder,name,comments,references';

export interface EmodnetContextResult {
  context?: MapContext;
  sources: SourceRecord[];
  status: ProviderStatus;
  /** Internal refresh hint. Successful empty responses must not preserve an old field. */
  failures?: ('depth' | 'seabed')[];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown, maximum = 1000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[contact omitted]')
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .trim()
    .slice(0, maximum);
}

function metadataUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2000) return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      decodeURIComponent(url.href).includes('@')
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

function depthSample(value: unknown): MapContext['depth'] {
  const data = record(value);
  if (!data) return undefined;
  const values = [data.avg, data.min, data.max];
  if (!values.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 12000))
    return undefined;
  const [meanM, minM, maxM] = values as [number, number, number];
  if (minM > meanM || meanM > maxM) return undefined;
  const reference = record(data.reference);
  const identifier = text(reference?.identifier);
  const url = metadataUrl(reference?.metadata_url);
  return {
    meanM,
    minM,
    maxM,
    datum: 'LAT',
    interpolated: typeof data.interpolationType === 'boolean' ? data.interpolationType : null,
    ...(identifier ? { reference: identifier } : {}),
    ...(url ? { metadataUrl: url } : {}),
  };
}

function seabedSample(value: unknown): MapContext['seabed'] {
  const data = record(value);
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) return undefined;
  const feature = record(data.features[0]);
  const properties = record(feature?.properties);
  if (!properties) return undefined;
  const original = text(properties.original_substrate, 200);
  const classification = text(properties.folk_5cl_txt, 200);
  const label = original || classification;
  if (!label || /^(?:no data|unknown|n\/?a|null)$/i.test(label)) return undefined;
  const notes = [
    original && classification && original !== classification
      ? `Regional class: ${classification}.`
      : '',
    text(properties.comments),
  ]
    .filter(Boolean)
    .join(' ');
  return {
    label,
    scale:
      typeof properties.scale === 'number' &&
      Number.isFinite(properties.scale) &&
      properties.scale > 0
        ? properties.scale
        : null,
    originator: text(properties.data_holder, 300) || 'Originator not reported',
    reference: text(properties.references) || text(properties.name),
    notes,
  };
}

function source(
  response: Sourced<unknown>,
  url: string,
  id: string,
  name: string,
  attribution: string,
) {
  return sourceRecord(
    id,
    name,
    url,
    response.provenance.retrievedAt,
    response.provenance.validUntil,
    attribution,
    LICENSE,
  );
}

/** Scientific point samples only. Never supplies assessment depths, holding polygons or coverage. */
export class EmodnetContextProvider {
  constructor(
    private readonly depthHttp: HttpTransport,
    private readonly seabedHttp: HttpTransport = depthHttp,
  ) {}

  async sample(request: DiscoverRequest): Promise<EmodnetContextResult> {
    if (!coordinate(request.center))
      throw new ProviderError('INVALID_DISCOVERY', 'Invalid context sample position', 400);
    const position: Position = request.center.map((n) => Number(n.toFixed(4))) as Position;
    const [lon, lat] = position;
    const baseStatus = {
      id: 'emodnet-context',
      name: 'EMODnet European depth and seabed context',
      documentationUrl: DOCUMENTATION,
      attribution: 'EMODnet Bathymetry and Geology; European Union and referenced data originators',
      license: LICENSE,
    };
    // This broad query envelope is not proof of marine or nautical-data coverage.
    if (lon < -36 || lon > 43 || lat < 15 || lat > 85)
      return {
        sources: [],
        status: {
          ...baseStatus,
          status: 'not-covered',
          message:
            'This European context service is not queried outside its regional extent. No local depth or seabed evidence is implied.',
        },
      };

    const depthUrl = new URL(DEPTH_ENDPOINT);
    depthUrl.searchParams.set('geom', `POINT(${lon} ${lat})`);
    const seabedUrl = new URL(SEABED_ENDPOINT);
    const parameters = {
      service: 'WMS',
      version: '1.1.1',
      request: 'GetFeatureInfo',
      layers: 'seabed_substrate_100k',
      query_layers: 'seabed_substrate_100k',
      srs: 'EPSG:4326',
      bbox: [lon - 0.001, lat - 0.001, lon + 0.001, lat + 0.001].map((n) => n.toFixed(4)).join(','),
      width: '101',
      height: '101',
      x: '50',
      y: '50',
      info_format: 'application/json',
      feature_count: '1',
      buffer: '0',
      propertyName: SEABED_FIELDS,
    };
    for (const [key, value] of Object.entries(parameters)) seabedUrl.searchParams.set(key, value);
    const [depthResponse, seabedResponse] = await Promise.allSettled([
      this.depthHttp.json<unknown>(depthUrl.href),
      this.seabedHttp.json<unknown>(seabedUrl.href),
    ]);
    const depth =
      depthResponse.status === 'fulfilled' ? depthSample(depthResponse.value.data) : undefined;
    const seabed =
      seabedResponse.status === 'fulfilled' ? seabedSample(seabedResponse.value.data) : undefined;
    const sources: SourceRecord[] = [];
    if (depth && depthResponse.status === 'fulfilled')
      sources.push(
        source(
          depthResponse.value,
          depthUrl.href,
          'emodnet-dtm-context',
          'EMODnet DTM point sample',
          'EMODnet Bathymetry, European Union; originator dataset: ' +
            (depth.reference || 'see source metadata'),
        ),
      );
    if (seabed && seabedResponse.status === 'fulfilled')
      sources.push(
        source(
          seabedResponse.value,
          seabedUrl.href,
          'emodnet-seabed-context',
          'EMODnet Geology regional seabed substrate',
          `EMODnet Geology, European Union; data originator: ${seabed.originator}`,
        ),
      );
    const messages = [
      depth
        ? 'A real DTM grid-cell sample is available.'
        : depthResponse.status === 'rejected'
          ? 'The DTM service could not be reached.'
          : 'No valid DTM value was returned at this point.',
      seabed
        ? 'A regional seabed classification is available.'
        : seabedResponse.status === 'rejected'
          ? 'The seabed service could not be reached.'
          : 'No seabed classification was returned at this point.',
      'Context only; no charted clearance, habitat permission or anchor-holding assessment.',
    ];
    return {
      failures: [
        ...(depthResponse.status === 'rejected' ? ['depth' as const] : []),
        ...(seabedResponse.status === 'rejected' ? ['seabed' as const] : []),
      ],
      ...(depth || seabed
        ? {
            context: {
              position,
              notice: NOTICE,
              ...(depth ? { depth } : {}),
              ...(seabed ? { seabed } : {}),
              sources,
            },
          }
        : {}),
      sources,
      status: {
        ...baseStatus,
        status: depth || seabed ? 'partial' : 'unavailable',
        message: messages.join(' '),
        ...(sources.length
          ? {
              retrievedAt: new Date(
                Math.min(...sources.map((s) => Date.parse(s.retrievedAt))),
              ).toISOString(),
              validUntil: new Date(
                Math.min(...sources.map((s) => Date.parse(s.validUntil))),
              ).toISOString(),
            }
          : {}),
      },
    };
  }
}
