import type { HttpTransport } from './contracts.js';
import type { WeatherInterval } from '@anchor-buddy/domain';
import { ProviderError } from './http.js';
import {
  finiteOrNull,
  sourceRecord,
  type DiscoverRequest,
  type ForecastResult,
} from './live-types.js';
export interface OpenMeteoOptions {
  mode: 'disabled' | 'noncommercial' | 'commercial' | 'self-hosted';
  endpoint: string;
  apiKey?: string;
}
export class OpenMeteoMarineProvider {
  constructor(
    private readonly http: HttpTransport,
    readonly options: OpenMeteoOptions,
  ) {}
  async forecast(request: DiscoverRequest): Promise<ForecastResult> {
    if (this.options.mode === 'disabled')
      throw new ProviderError(
        'CONFIGURATION_REQUIRED',
        'Global wave service is optional. Configure licensed commercial or self-hosted Open-Meteo access, or explicitly enable non-commercial use.',
      );
    if (this.options.mode === 'commercial' && !this.options.apiKey)
      throw new ProviderError(
        'CONFIGURATION_REQUIRED',
        'Commercial Open-Meteo marine access requires a configured server API key',
      );
    const url = new URL(this.options.endpoint);
    if (this.options.mode === 'commercial' && url.hostname !== 'customer-marine-api.open-meteo.com')
      throw new ProviderError(
        'CONFIGURATION_REQUIRED',
        'Commercial mode requires the Open-Meteo customer marine endpoint',
      );
    if (this.options.mode === 'self-hosted' && url.hostname.endsWith('open-meteo.com'))
      throw new ProviderError(
        'CONFIGURATION_REQUIRED',
        'Self-hosted mode must point to your own endpoint',
      );
    url.searchParams.set('latitude', request.center[1].toFixed(4));
    url.searchParams.set('longitude', request.center[0].toFixed(4));
    url.searchParams.set('hourly', 'wave_height,swell_wave_height');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('timezone', 'GMT');
    url.searchParams.set('cell_selection', 'sea');
    url.searchParams.set('timeformat', 'unixtime');
    if (this.options.apiKey) url.searchParams.set('apikey', this.options.apiKey);
    const response = await this.http.json<{
      hourly?: {
        time: number[];
        wave_height: (number | null)[];
        swell_wave_height: (number | null)[];
      };
      hourly_units?: Record<string, string>;
    }>(url.href);
    const hourly = response.data.hourly;
    if (!hourly || !Array.isArray(hourly.time))
      throw new ProviderError('INVALID_RESPONSE', 'Marine provider returned an invalid forecast');
    const source = sourceRecord(
      'open-meteo-marine-live',
      'Open-Meteo marine wave forecast',
      response.provenance.url,
      response.provenance.retrievedAt,
      new Date(Date.parse(response.provenance.retrievedAt) + 3600000).toISOString(),
      'Open-Meteo and originating meteorological model providers',
      'CC BY 4.0; hosted free API is non-commercial only — https://open-meteo.com/en/terms',
    );
    const from = request.from ? Date.parse(request.from) : Date.parse(source.retrievedAt);
    const until = request.until ? Date.parse(request.until) : from + 72 * 3600000;
    const frames: WeatherInterval[] = hourly.time.slice(0, 192).flatMap((time, index) => {
      const start = time * 1000,
        end = start + 3600000;
      if (!Number.isFinite(start) || end <= from || start >= until) return [];
      return [
        {
          validFrom: new Date(start).toISOString(),
          validUntil: new Date(end).toISOString(),
          windKnots: null,
          gustKnots: null,
          windDirectionDeg: null,
          waveM:
            response.data.hourly_units?.wave_height === 'm'
              ? finiteOrNull(hourly.wave_height?.[index])
              : null,
          swellM:
            response.data.hourly_units?.swell_wave_height === 'm'
              ? finiteOrNull(hourly.swell_wave_height?.[index])
              : null,
          currentKnots: null,
          currentDirectionDeg: null,
          warnings: [],
          sourceIds: [source.id],
          coverageAreaIds: ['live-weather-request'],
        },
      ];
    });
    if (!frames.length)
      throw new ProviderError('NO_FORECAST', 'No marine forecast overlaps the requested stay');
    return {
      frames,
      source,
      position: request.center,
      status: {
        id: 'open-meteo-marine',
        name: 'Open-Meteo marine waves',
        status: 'partial',
        message: `${this.options.mode} access. Offshore model wave estimates are not a nearshore shelter or navigation assessment; coastal tide/current models are deliberately not used for clearance.`,
        retrievedAt: source.retrievedAt,
        validUntil: source.validUntil,
        attribution: source.attribution,
        license: source.license,
        documentationUrl: 'https://open-meteo.com/en/docs/marine-weather-api',
      },
    };
  }
}
