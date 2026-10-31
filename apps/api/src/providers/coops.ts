import type { HttpTransport, Sourced } from './contracts.js';
import { ProviderError } from './http.js';

export interface StationMapping {
  id: string;
  stationId: string;
  kind: 'tides' | 'currents';
  reviewedBy: string;
  reviewedAt: string;
  expiresAt: string;
  datum: string;
  chartDatum: string;
  chartOffsetM: number;
  uncertaintyM: number;
  bounds: readonly [number, number, number, number];
  /** Current station product settings must be supplied by its local review. */
  bin?: number;
}

export class CoopsProvider {
  constructor(
    private readonly http: HttpTransport,
    private readonly mappings: readonly StationMapping[] = [],
  ) {}
  async predictions(
    input: {
      mappingId: string;
      latitude: number;
      longitude: number;
      from: string;
      to: string;
      chartDatum: string;
    },
    now = new Date(),
  ): Promise<Sourced<unknown>> {
    const mapping = this.mappings.find((item) => item.id === input.mappingId);
    if (
      !mapping ||
      !mapping.reviewedBy ||
      !Number.isFinite(Date.parse(mapping.reviewedAt)) ||
      !Number.isFinite(Date.parse(mapping.expiresAt)) ||
      Date.parse(mapping.expiresAt) <= now.valueOf() ||
      !Number.isFinite(mapping.chartOffsetM) ||
      !Number.isFinite(mapping.uncertaintyM) ||
      mapping.uncertaintyM < 0
    )
      throw new ProviderError(
        'UNREVIEWED_MAPPING',
        'No current validated station mapping; nearby station extrapolation is disabled',
      );
    if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude))
      throw new ProviderError('INVALID_POINT', 'Station mapping requires finite coordinates');
    const [west, south, east, north] = mapping.bounds;
    if (
      input.longitude < west ||
      input.longitude > east ||
      input.latitude < south ||
      input.latitude > north
    )
      throw new ProviderError('OUTSIDE_MAPPING', 'Point lies outside reviewed station coverage');
    if (input.chartDatum !== mapping.chartDatum)
      throw new ProviderError(
        'DATUM_MISMATCH',
        'Chart datum does not match reviewed station mapping',
      );
    const from = new Date(input.from),
      to = new Date(input.to);
    if (
      !Number.isFinite(from.valueOf()) ||
      !Number.isFinite(to.valueOf()) ||
      to <= from ||
      to.valueOf() - from.valueOf() > 31 * 86400000
    )
      throw new ProviderError(
        'INVALID_INTERVAL',
        'Prediction interval must be positive and at most 31 days',
      );
    const format = (date: Date) =>
      date.toISOString().slice(0, 16).replace(/-/g, '').replace('T', ' ');
    const query = new URLSearchParams({
      application: 'Anchor Buddy',
      station: mapping.stationId,
      product: mapping.kind === 'tides' ? 'predictions' : 'currents_predictions',
      begin_date: format(from),
      end_date: format(to),
      time_zone: 'gmt',
      units: 'metric',
      format: 'json',
      interval: '6',
    });
    if (mapping.kind === 'tides') query.set('datum', mapping.datum);
    else if (mapping.bin !== undefined) query.set('bin', String(mapping.bin));
    const result = await this.http.json<{ error?: { message?: string }; [key: string]: unknown }>(
      `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${query}`,
    );
    if (result.data.error)
      throw new ProviderError(
        'PRODUCT_UNAVAILABLE',
        result.data.error.message ?? 'CO-OPS product unavailable',
      );
    return {
      ...result,
      data: {
        raw: result.data,
        mapping,
        caveat:
          'Astronomical tide predictions exclude weather-driven water level. Reviewed offset and uncertainty must be applied by the assessment assembler.',
      },
    };
  }
}
