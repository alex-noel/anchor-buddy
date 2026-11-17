import {
  intervalsCover,
  type RegionPack,
  type SearchRequest,
  type SourceRecord,
  type UnitSystem,
  type WeatherInterval,
} from '@anchor-buddy/domain';
import { depth, localTime, wind } from './units';

export type ForecastStay = Readonly<{
  arrival: string;
  departure: string;
  contingencyEnd: string;
  timezone: string;
}>;

export const forecastTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function createForecastStay(
  request: Pick<SearchRequest, 'arrival' | 'departure' | 'departureContingencyHours'>,
  timezone = forecastTimezone(),
): ForecastStay | null {
  const { arrival, departure, departureContingencyHours } = request;
  const start = Date.parse(arrival);
  const end = Date.parse(departure);
  const contingency = new Date(end + departureContingencyHours * 3_600_000);
  if (
    !(start < end) ||
    !Number.isFinite(departureContingencyHours) ||
    departureContingencyHours < 0 ||
    !Number.isFinite(contingency.getTime())
  )
    return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
  } catch {
    timezone = forecastTimezone();
  }
  return Object.freeze({ arrival, departure, contingencyEnd: contingency.toISOString(), timezone });
}

const metrics = [
  { key: 'windKnots', label: 'wind' },
  { key: 'gustKnots', label: 'gusts' },
  { key: 'waveM', label: 'waves' },
  { key: 'currentKnots', label: 'current' },
] as const;
type Metric = (typeof metrics)[number]['key'];
type ForecastPeaks = Record<Metric, number | null>;
type Freshness = 'current' | 'expired' | 'unconfirmed';
type ForecastDates = { from: string; until: string };

function freshness(from: number, until: number, now: number): Freshness {
  if (Number.isFinite(until) && until <= now) return 'expired';
  return Number.isFinite(now) && from <= now && from < until ? 'current' : 'unconfirmed';
}

function sourceFreshness(source: SourceRecord, now: number): Freshness {
  const legacy = freshness(Date.parse(source.retrievedAt), Date.parse(source.validUntil), now);
  if (!source.evidence || legacy === 'expired') return legacy;
  const envelope = freshness(
    Date.parse(source.evidence.retrievedAt),
    Date.parse(source.evidence.usableUntil ?? ''),
    now,
  );
  if (envelope === 'expired') return 'expired';
  return legacy === 'current' && envelope === 'current' ? 'current' : 'unconfirmed';
}

const known = (value: number | null): value is number => value !== null && Number.isFinite(value);

interface ForecastRow {
  interval: WeatherInterval;
  from: number;
  until: number;
  availableFrom: number;
  availableUntil: number;
  freshness: Freshness;
  missing: boolean;
}

function summarizeWindow(rows: readonly ForecastRow[], range: ForecastDates) {
  const start = Date.parse(range.from);
  const end = Date.parse(range.until);
  const relevant = rows.filter(
    (row) => row.from < row.until && row.from < end && row.until > start,
  );
  const current = relevant
    .filter(
      (row) =>
        row.freshness === 'current' &&
        row.availableFrom < row.availableUntil &&
        row.availableFrom < end &&
        row.availableUntil > start,
    )
    .map((row) => ({
      ...row.interval,
      validFrom: new Date(row.availableFrom).toISOString(),
      validUntil: new Date(row.availableUntil).toISOString(),
    }));
  const gaps: string[] = [];
  const peaks: ForecastPeaks = {
    windKnots: null,
    gustKnots: null,
    waveM: null,
    currentKnots: null,
  };
  for (const { key, label } of metrics) {
    const observations: WeatherInterval[] = [];
    for (const interval of current) {
      const value = interval[key];
      if (!known(value)) continue;
      observations.push(interval);
      peaks[key] = peaks[key] === null ? value : Math.max(peaks[key], value);
    }
    if (!intervalsCover(observations, start, end)) gaps.push(label);
  }
  return {
    range,
    hasCurrentIntervals: current.length > 0,
    intervalGap: !intervalsCover(current, start, end),
    metricGaps: gaps,
    peaks,
  };
}

export function describeForecast(
  intervals: readonly WeatherInterval[],
  pack: Pick<RegionPack, 'sources' | 'generatedAt' | 'validUntil'>,
  stay: ForecastStay | null | undefined,
  now: number,
) {
  const packStatus = freshness(Date.parse(pack.generatedAt), Date.parse(pack.validUntil), now);
  const sources = new Map(pack.sources.map((source) => [source.id, source]));
  const rows: ForecastRow[] = intervals.map((interval) => {
    const from = Date.parse(interval.validFrom);
    const until = Date.parse(interval.validUntil);
    const referenced = interval.sourceIds.map((id) => sources.get(id));
    const statuses = referenced.map((source) =>
      source ? sourceFreshness(source, now) : 'unconfirmed',
    );
    const availableFrom = Math.max(
      from,
      Date.parse(pack.generatedAt),
      ...referenced.map((source) =>
        source
          ? Math.max(
              Date.parse(source.retrievedAt),
              Date.parse(source.evidence?.retrievedAt ?? source.retrievedAt),
            )
          : NaN,
      ),
    );
    const availableUntil = Math.min(
      until,
      Date.parse(pack.validUntil),
      ...referenced.map((source) =>
        source
          ? Math.min(
              Date.parse(source.validUntil),
              Date.parse(source.evidence ? (source.evidence.usableUntil ?? '') : source.validUntil),
            )
          : NaN,
      ),
    );
    const expired = until <= now || packStatus === 'expired' || statuses.includes('expired');
    const current =
      from < until &&
      packStatus === 'current' &&
      statuses.length > 0 &&
      statuses.every((status) => status === 'current');
    return {
      interval,
      from,
      until,
      availableFrom,
      availableUntil,
      freshness: expired ? 'expired' : current ? 'current' : 'unconfirmed',
      missing: metrics.some(({ key }) => !known(interval[key])),
    };
  });
  rows.sort((a, b) => a.from - b.from || a.until - b.until);

  const currentRows = rows.filter(
    (row) => row.freshness === 'current' && row.availableFrom < row.availableUntil,
  );
  const rangeRows = currentRows.length
    ? currentRows.map((row) => ({ from: row.availableFrom, until: row.availableUntil }))
    : rows.filter((row) => row.from < row.until);
  const rangeStart = rangeRows.reduce((start, row) => Math.min(start, row.from), Infinity);
  const rangeEnd = rangeRows.reduce((end, row) => Math.max(end, row.until), -Infinity);
  const availableRange = rangeRows.length
    ? {
        from: new Date(rangeStart).toISOString(),
        until: new Date(rangeEnd).toISOString(),
        current: currentRows.length > 0,
        hasGaps: !intervalsCover(
          rangeRows.map((row) => ({
            validFrom: new Date(row.from).toISOString(),
            validUntil: new Date(row.until).toISOString(),
          })),
          rangeStart,
          rangeEnd,
        ),
      }
    : null;
  const requested = stay
    ? {
        stay: summarizeWindow(rows, { from: stay.arrival, until: stay.departure }),
        contingency:
          Date.parse(stay.departure) < Date.parse(stay.contingencyEnd)
            ? summarizeWindow(rows, { from: stay.departure, until: stay.contingencyEnd })
            : null,
      }
    : null;
  return {
    rows,
    availableRange,
    requested,
    expired: rows.filter((row) => row.freshness === 'expired').length,
    unconfirmed: rows.filter((row) => row.freshness === 'unconfirmed').length,
  };
}

export type ForecastPresentation = ReturnType<typeof describeForecast>;

export function formatForecastRange(range: ForecastDates, timezone: string) {
  if (!(Date.parse(range.from) < Date.parse(range.until))) return 'Interval dates unavailable';
  return `${localTime(range.from, timezone)} – ${localTime(range.until, timezone)}`;
}

export function formatForecastPeaks(peaks: ForecastPeaks, units: UnitSystem) {
  return `Wind ${wind(peaks.windKnots, units)} · gusts ${wind(peaks.gustKnots, units)} · waves ${depth(peaks.waveM, units)} · current ${wind(peaks.currentKnots, units, 1)}`;
}
