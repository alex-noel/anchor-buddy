import type { WeatherInterval, Position } from '@anchor-buddy/domain';
import type { HttpTransport } from './contracts.js';
import { ProviderError } from './http.js';
import {
  coordinate,
  finiteOrNull,
  sourceRecord,
  type DiscoverRequest,
  type ForecastResult,
} from './live-types.js';

/** An economical request gate, not a nautical coverage polygon. The API determines actual model support. */
export function mayHaveOceanForecast(position: Position) {
  return position[0] >= -25 && position[0] <= 45 && position[1] >= 48 && position[1] <= 83;
}
interface OceanResponse {
  geometry?: { type?: string; coordinates?: number[] };
  properties?: {
    error?: unknown;
    meta?: { updated_at?: string; units?: Record<string, string> };
    timeseries?: Array<{
      time: string;
      data?: { instant?: { details?: Record<string, unknown> } };
    }>;
  };
}
export class MetOceanProvider {
  constructor(private readonly http: HttpTransport) {}
  async forecast(request: DiscoverRequest): Promise<ForecastResult> {
    if (!mayHaveOceanForecast(request.center))
      throw new ProviderError(
        'OUTSIDE_COVERAGE',
        'MET Oceanforecast serves Northwestern European seas, not this selected area',
      );
    const url = `https://api.met.no/weatherapi/oceanforecast/2.0/complete?lat=${request.center[1].toFixed(4)}&lon=${request.center[0].toFixed(4)}`;
    let response;
    try {
      response = await this.http.json<OceanResponse>(url);
    } catch (error) {
      if (error instanceof ProviderError && error.status === 422)
        throw new ProviderError(
          'OUTSIDE_COVERAGE',
          'The selected coordinate is outside MET Oceanforecast model coverage',
        );
      throw error;
    }
    const properties = response.data?.properties;
    if (properties?.error || !Array.isArray(properties?.timeseries))
      throw new ProviderError(
        'OUTSIDE_COVERAGE',
        'MET Oceanforecast has no marine model forecast at this point',
      );
    const position = response.data.geometry?.coordinates?.slice(0, 2);
    if (!coordinate(position))
      throw new ProviderError(
        'INVALID_RESPONSE',
        'MET Oceanforecast did not identify its actual model coordinate',
      );
    const retrievedAt = response.provenance.retrievedAt;
    const source = sourceRecord(
      'met-ocean-live',
      'MET Norway Oceanforecast significant waves',
      url,
      retrievedAt,
      response.provenance.validUntil,
      'Data from MET Norway; significant wave height in metres',
      'CC BY 4.0 / NLOD 2.0 — https://api.met.no/doc/License',
    );
    const start = Date.parse(request.from ?? retrievedAt),
      end = Date.parse(request.until ?? new Date(start + 72 * 3600000).toISOString());
    const frames: WeatherInterval[] = [];
    const times = properties.timeseries.slice(0, 300);
    for (let index = 0; index < times.length - 1; index++) {
      const item = times[index]!,
        next = times[index + 1]!;
      const from = Date.parse(item.time),
        until = Date.parse(next.time);
      if (
        !Number.isFinite(from) ||
        !Number.isFinite(until) ||
        until <= from ||
        until - from > 6 * 3600000 ||
        from >= end ||
        until <= start
      )
        continue;
      const height =
        properties.meta?.units?.sea_surface_wave_height === 'm'
          ? finiteOrNull(item.data?.instant?.details?.sea_surface_wave_height, 0, 100)
          : null;
      if (height === null) continue;
      frames.push({
        validFrom: new Date(from).toISOString(),
        validUntil: new Date(until).toISOString(),
        windKnots: null,
        gustKnots: null,
        windDirectionDeg: null,
        waveM: height,
        swellM: null,
        currentKnots: null,
        currentDirectionDeg: null,
        warnings: [],
        sourceIds: [source.id],
        coverageAreaIds: ['live-weather-request'],
      });
    }
    if (!frames.length)
      throw new ProviderError('NO_FORECAST', 'No MET Oceanforecast wave values overlap this stay');
    return {
      frames,
      source,
      position,
      status: {
        id: 'met-ocean',
        name: 'MET Norway Northwestern Europe waves',
        status: 'partial',
        message: `Significant wave height at model coordinate ${position[1].toFixed(4)}, ${position[0].toFixed(4)} (the provider may snap to the nearest sea point). This is a point-model estimate, not verified shelter or complete spatial coverage. Currents, individual waves and separate swell remain unknown.`,
        attribution: source.attribution,
        license: source.license,
        retrievedAt: source.retrievedAt,
        validUntil: source.validUntil,
        documentationUrl: 'https://api.met.no/weatherapi/oceanforecast/2.0/documentation',
      },
    };
  }
}
