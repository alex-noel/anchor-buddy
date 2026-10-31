import type { HttpTransport, Sourced } from './contracts.js';
import { ProviderError } from './http.js';

type GridValue = { validTime: string; value: number | null };
export type GridSeries = { uom: string; values: GridValue[] };
export type GridData = {
  properties: {
    updateTime: string;
    validTimes?: string;
    windSpeed?: GridSeries;
    windGust?: GridSeries;
    windDirection?: GridSeries;
    waveHeight?: GridSeries;
    [key: string]: unknown;
  };
};
export type MarineGrid = {
  grid: Sourced<GridData>;
  alerts: Sourced<{
    features: Array<{ id?: string; geometry: unknown; properties: Record<string, unknown> }>;
  }>;
  missing: string[];
};

export class NwsProvider {
  constructor(private readonly http: HttpTransport) {}
  async marine(latitude: number, longitude: number): Promise<MarineGrid> {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    )
      throw new ProviderError('INVALID_POINT', 'Invalid forecast point');
    const point = await this.http.json<{ properties: { forecastGridData?: string } }>(
      `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
    );
    const gridUrl = point.data.properties.forecastGridData;
    if (!gridUrl) throw new ProviderError('NO_GRID', 'NWS has no forecast grid for this point');
    const [grid, alerts] = await Promise.all([
      this.http.json<GridData>(gridUrl),
      this.http.json<MarineGrid['alerts']['data']>(
        `https://api.weather.gov/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      ),
    ]);
    const missing = ['windSpeed', 'windGust', 'windDirection', 'waveHeight'].filter((key) => {
      const series = grid.data.properties[key] as GridSeries | undefined;
      return !series?.values?.length || series.values.some((value) => value.value === null);
    });
    // Raw interval values and units are retained. A missing wave grid is never zero waves.
    return { grid, alerts, missing };
  }
}

export function toSI(value: number | null, unit: string): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  switch (unit) {
    case 'wmoUnit:km_h-1':
      return value / 3.6;
    case 'wmoUnit:kn':
      return value * 0.514444;
    case 'wmoUnit:m_s-1':
    case 'wmoUnit:m':
    case 'wmoUnit:degree_(angle)':
      return value;
    default:
      return null;
  }
}
