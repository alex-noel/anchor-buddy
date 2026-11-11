import type { HttpTransport } from './contracts.js';
import type { WeatherInterval } from '@anchor-buddy/domain';
import { ProviderError } from './http.js';
import {
  finiteOrNull,
  sourceRecord,
  type DiscoverRequest,
  type ForecastResult,
} from './live-types.js';
interface MetResponse {
  geometry?: { coordinates?: number[] };
  properties: {
    meta: { updated_at: string; units: Record<string, string> };
    timeseries: Array<{ time: string; data: { instant: { details: Record<string, unknown> } } }>;
  };
}
export class MetNorwayProvider {
  constructor(private readonly http: HttpTransport) {}
  async forecast(request: DiscoverRequest): Promise<ForecastResult> {
    const [longitude, latitude] = request.center;
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;
    const response = await this.http.json<MetResponse>(url);
    const props = response.data?.properties;
    if (!props?.meta || !Array.isArray(props.timeseries))
      throw new ProviderError('INVALID_RESPONSE', 'MET Norway returned an invalid forecast');
    const retrieved = response.provenance.retrievedAt;
    const validUntil = response.provenance.validUntil;
    const source = sourceRecord(
      'met-norway-live',
      'MET Norway global location forecast',
      url,
      retrieved,
      validUntil,
      'Norwegian Meteorological Institute — values converted from m/s to knots',
      'CC BY 4.0 — https://api.met.no/doc/License',
    );
    const from = request.from ? Date.parse(request.from) : Date.parse(retrieved);
    const until = request.until ? Date.parse(request.until) : from + 72 * 3600000;
    const frames: WeatherInterval[] = [];
    const series = props.timeseries.slice(0, 250);
    for (let index = 0; index < series.length - 1; index++) {
      const item = series[index]!,
        next = series[index + 1]!;
      const start = Date.parse(item.time),
        end = Date.parse(next.time);
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end <= start ||
        end - start > 6 * 3600000 ||
        end <= from ||
        start >= until
      )
        continue;
      const values = item.data?.instant?.details ?? {};
      const speed = props.meta.units.wind_speed === 'm/s' ? finiteOrNull(values.wind_speed) : null;
      const gust =
        props.meta.units.wind_speed_of_gust === 'm/s'
          ? finiteOrNull(values.wind_speed_of_gust)
          : null;
      const direction =
        props.meta.units.wind_from_direction === 'degrees'
          ? finiteOrNull(values.wind_from_direction, 0, 360)
          : null;
      frames.push({
        validFrom: new Date(start).toISOString(),
        validUntil: new Date(end).toISOString(),
        windKnots: speed === null ? null : speed * 1.9438444924,
        gustKnots: gust === null ? null : gust * 1.9438444924,
        windDirectionDeg: direction,
        waveM: null,
        swellM: null,
        currentKnots: null,
        currentDirectionDeg: null,
        warnings: [],
        sourceIds: [source.id],
        coverageAreaIds: ['live-weather-request'],
      });
    }
    if (!frames.length)
      throw new ProviderError('NO_FORECAST', 'No live model forecast overlaps the requested stay');
    const missingGust = frames.some((frame) => frame.gustKnots === null);
    return {
      frames,
      source,
      position: request.center,
      status: {
        id: 'met-norway',
        name: 'MET Norway global wind forecast',
        status: 'partial',
        message: `Real model forecast at the selected coordinate. ${missingGust ? 'Gust forecasts are unavailable for some intervals. ' : ''}This point forecast does not establish shelter, waves, currents or spatial safety coverage.`,
        retrievedAt: source.retrievedAt,
        validUntil: source.validUntil,
        attribution: source.attribution,
        license: source.license,
        documentationUrl: 'https://api.met.no/weatherapi/locationforecast/2.0/documentation',
      },
    };
  }
}
