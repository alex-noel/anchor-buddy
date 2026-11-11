import type { WeatherInterval, SourceRecord } from '@anchor-buddy/domain';
import { NwsProvider, toSI, type GridSeries } from './nws.js';
import {
  sourceRecord,
  finiteOrNull,
  type DiscoverRequest,
  type ProviderStatus,
} from './live-types.js';
import { ProviderError } from './http.js';

/** Explicit intervals from NWS forecastGridData; no nearest-time interpolation. */
function interval(value: string): [number, number] | null {
  const [date, duration] = value.split('/');
  const start = Date.parse(date ?? '');
  const match =
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      duration ?? '',
    );
  if (!Number.isFinite(start) || !match) return null;
  const seconds =
    Number(match[1] ?? 0) * 86400 +
    Number(match[2] ?? 0) * 3600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0);
  return seconds > 0 && seconds <= 14 * 86400 ? [start, start + seconds * 1000] : null;
}
function entries(series: GridSeries | undefined) {
  return Array.isArray(series?.values)
    ? series.values.slice(0, 500).flatMap((item) => {
        const range = interval(item.validTime);
        return range
          ? [{ start: range[0], end: range[1], value: toSI(item.value, series!.uom) }]
          : [];
      })
    : [];
}
export class NwsLiveProvider {
  constructor(private readonly provider: NwsProvider) {}
  async forecast(
    request: DiscoverRequest,
  ): Promise<{ frames: WeatherInterval[]; sources: SourceRecord[]; status: ProviderStatus }> {
    const result = await this.provider.marine(request.center[1], request.center[0]);
    const grid = result.grid.data?.properties;
    if (!grid) throw new ProviderError('INVALID_RESPONSE', 'NWS grid metadata is missing');
    const sources = [
      sourceRecord(
        'nws-grid-live',
        'NWS raw forecast grid',
        result.grid.provenance.url,
        result.grid.provenance.retrievedAt,
        result.grid.provenance.validUntil,
        'NOAA National Weather Service — wind converted to knots',
        'US government public data',
      ),
      sourceRecord(
        'nws-alerts-live',
        'NWS active warnings',
        result.alerts.provenance.url,
        result.alerts.provenance.retrievedAt,
        result.alerts.provenance.validUntil,
        'NOAA National Weather Service',
        'US government public data',
      ),
    ];
    const speed = entries(grid.windSpeed),
      gust = entries(grid.windGust),
      direction = entries(grid.windDirection),
      wave = entries(grid.waveHeight);
    const start = Date.parse(request.from ?? sources[0]!.retrievedAt),
      end = Date.parse(request.until ?? new Date(start + 72 * 3600000).toISOString());
    const boundaries = [
      ...new Set([
        start,
        end,
        ...[speed, gust, direction, wave].flatMap((values) =>
          values.flatMap((item) => [item.start, item.end]),
        ),
      ]),
    ]
      .filter((time) => time >= start && time <= end)
      .sort((a, b) => a - b);
    const value = (items: ReturnType<typeof entries>, time: number) =>
      items.find((item) => item.start <= time && item.end > time)?.value ?? null;
    const frames: WeatherInterval[] = [];
    for (let index = 0; index < boundaries.length - 1; index++) {
      const from = boundaries[index]!,
        until = boundaries[index + 1]!;
      const wind = finiteOrNull(value(speed, from), 0, 200),
        gustValue = finiteOrNull(value(gust, from), 0, 200),
        angle = finiteOrNull(value(direction, from), 0, 360),
        waveValue = finiteOrNull(value(wave, from), 0, 100);
      if ([wind, gustValue, angle, waveValue].every((item) => item === null)) continue;
      const warnings = (result.alerts.data.features ?? []).flatMap((feature) => {
        const props = feature.properties ?? {};
        const onset = Date.parse(String(props.onset ?? props.effective ?? '')),
          expires = Date.parse(String(props.ends ?? props.expires ?? ''));
        return Number.isFinite(onset) &&
          Number.isFinite(expires) &&
          onset < until &&
          expires > from &&
          typeof props.event === 'string'
          ? [props.event.slice(0, 180)]
          : [];
      });
      frames.push({
        validFrom: new Date(from).toISOString(),
        validUntil: new Date(until).toISOString(),
        windKnots: wind === null ? null : wind * 1.9438444924,
        gustKnots: gustValue === null ? null : gustValue * 1.9438444924,
        windDirectionDeg: angle,
        waveM: waveValue,
        swellM: null,
        currentKnots: null,
        currentDirectionDeg: null,
        warnings: [...new Set(warnings)],
        coverageAreaIds: ['live-weather-request'],
        sourceIds: sources.map((source) => source.id),
      });
    }
    return {
      frames,
      sources,
      status: {
        id: 'nws-grid',
        name: 'NWS marine grids and active alerts',
        status: 'partial',
        message: `Official grid and active alerts at the selected US coordinate; missing grid parameters: ${result.missing.join(', ') || 'none'}. Marine spatial coverage and future warning completeness remain unreviewed.`,
        attribution: sources[0]!.attribution,
        retrievedAt: sources[0]!.retrievedAt,
        validUntil: new Date(
          Math.min(...sources.map((source) => Date.parse(source.validUntil))),
        ).toISOString(),
        documentationUrl: 'https://www.weather.gov/documentation/services-web-api',
      },
    };
  }
}
