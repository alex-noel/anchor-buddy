import assert from 'node:assert/strict';
import test from 'node:test';
import type { RegionPack, SourceRecord, WeatherInterval } from '@anchor-buddy/domain';
import {
  createForecastStay,
  describeForecast,
  formatForecastPeaks,
  formatForecastRange,
} from './forecastPresentation';

const now = Date.parse('2026-11-17T09:00:00Z');
const time = (hour: number) => new Date(now + hour * 3_600_000).toISOString();
const source: SourceRecord = {
  id: 'weather',
  name: 'Controlled weather',
  retrievedAt: time(-1),
  validUntil: time(10),
  url: 'https://example.invalid/forecast',
  license: 'Test',
  attribution: 'Test',
  synthetic: false,
};
const pack: Pick<RegionPack, 'sources' | 'generatedAt' | 'validUntil'> = {
  sources: [source],
  generatedAt: time(-1),
  validUntil: time(12),
};
const frame = (
  from: number,
  until: number,
  patch: Partial<WeatherInterval> = {},
): WeatherInterval => ({
  validFrom: time(from),
  validUntil: time(until),
  windKnots: 10,
  gustKnots: 15,
  waveM: 1,
  swellM: null,
  currentKnots: 0.5,
  currentDirectionDeg: null,
  windDirectionDeg: 90,
  warnings: [],
  coverageAreaIds: [],
  sourceIds: ['weather'],
  ...patch,
});
const stay = createForecastStay(
  { arrival: time(1), departure: time(3), departureContingencyHours: 2 },
  'America/New_York',
)!;

test('immutable stay preserves exact instants and labels the requested timezone across DST', () => {
  const request = {
    arrival: '2026-11-01T00:30:00-04:00',
    departure: '2026-11-01T02:30:00-05:00',
    departureContingencyHours: 1.5,
  };
  const value = createForecastStay(request, 'America/New_York')!;
  assert.equal(value.arrival, request.arrival);
  assert.equal(value.departure, request.departure);
  assert.equal(value.contingencyEnd, '2026-11-01T09:00:00.000Z');
  assert.equal(value.timezone, 'America/New_York');
  assert.ok(Object.isFrozen(value));
  assert.match(
    formatForecastRange({ from: value.arrival, until: value.departure }, value.timezone),
    /EDT.*EST/,
  );
  assert.equal(createForecastStay({ ...request, arrival: 'invalid' }), null);
  assert.equal(createForecastStay({ ...request, departureContingencyHours: -1 }), null);
});

test('separate stay and contingency detect gaps and merge overlapping intervals without inventing values', () => {
  const intervals = [frame(1, 2), frame(1.5, 3), frame(4, 5, { gustKnots: null, windKnots: 22 })];
  const before = JSON.stringify(intervals);
  const summary = describeForecast(intervals, pack, stay, now);
  assert.equal(summary.requested!.stay.intervalGap, false);
  assert.deepEqual(summary.requested!.stay.metricGaps, []);
  assert.equal(summary.requested!.stay.peaks.windKnots, 10);
  assert.equal(summary.requested!.contingency!.intervalGap, true);
  assert.deepEqual(summary.requested!.contingency!.metricGaps, [
    'wind',
    'gusts',
    'waves',
    'current',
  ]);
  assert.equal(summary.requested!.contingency!.peaks.windKnots, 22);
  assert.equal(summary.requested!.contingency!.peaks.gustKnots, null);
  assert.equal(JSON.stringify(intervals), before);
});

test('temporal span never implies known metric values and null is excluded from peaks', () => {
  const summary = describeForecast(
    [frame(1, 5, { windKnots: null, waveM: 0, currentKnots: null })],
    pack,
    stay,
    now,
  );
  const window = summary.requested!.stay;
  assert.equal(window.intervalGap, false);
  assert.deepEqual(window.metricGaps, ['wind', 'current']);
  assert.equal(window.peaks.windKnots, null);
  assert.equal(window.peaks.waveM, 0);
  assert.equal(window.peaks.currentKnots, null);
  assert.equal(
    formatForecastPeaks(window.peaks, 'nautical'),
    'Wind Unknown · gusts 15 kt · waves 0.0 m · current Unknown',
  );
});

test('expired snapshot/source and elapsed intervals remain inspectable while excluded from current peaks', () => {
  const summary = describeForecast(
    [frame(-2, 0), frame(1, 5, { windKnots: 99 })],
    { ...pack, sources: [{ ...source, validUntil: time(0) }] },
    stay,
    now,
  );
  assert.equal(summary.expired, 2);
  assert.equal(summary.rows.length, 2);
  assert.equal(summary.requested!.stay.hasCurrentIntervals, false);
  assert.equal(summary.requested!.stay.peaks.windKnots, null);
  const expiredPack = describeForecast([frame(1, 5)], { ...pack, validUntil: time(0) }, stay, now);
  assert.equal(expiredPack.expired, 1);
});

test('unknown or future source dates cannot establish current availability', () => {
  for (const sources of [
    [],
    [{ ...source, retrievedAt: time(1) }],
    [{ ...source, validUntil: 'bad' }],
  ]) {
    const summary = describeForecast([frame(1, 5)], { ...pack, sources }, stay, now);
    assert.equal(summary.unconfirmed, 1);
    assert.equal(summary.requested!.stay.hasCurrentIntervals, false);
  }
});

test('source and snapshot expiry before departure cannot imply a full stay span', () => {
  const summary = describeForecast(
    [frame(1, 5)],
    {
      ...pack,
      sources: [{ ...source, validUntil: time(2) }],
    },
    stay,
    now,
  );
  assert.equal(summary.requested!.stay.intervalGap, true);
  assert.equal(summary.requested!.stay.hasCurrentIntervals, true);
  assert.equal(summary.requested!.contingency!.hasCurrentIntervals, false);
  assert.equal(summary.availableRange?.until, time(2));
  const snapshot = describeForecast([frame(1, 5)], { ...pack, validUntil: time(2) }, stay, now);
  assert.equal(snapshot.requested!.stay.intervalGap, true);
});

test('a classified source with unknown usable freshness cannot support current peaks', () => {
  const right = {
    status: 'unknown' as const,
    policyUrl: null,
    verifiedAt: null,
    entitlementId: null,
  };
  const classified: SourceRecord = {
    ...source,
    evidence: {
      schemaVersion: 2,
      role: 'point-forecast',
      sourceIds: [source.id],
      sourceTime: { kind: 'unknown', at: null },
      retrievedAt: source.retrievedAt,
      usableUntil: null,
      refreshEligibleAt: null,
      forecastInterval: { from: time(1), until: time(5) },
      original: { units: null, verticalDatum: null },
      rights: { onlineDisplay: right, offlineStorage: right, analysis: right },
      review: { status: 'unreviewed', attestationIds: [] },
    },
  };
  const summary = describeForecast([frame(1, 5)], { ...pack, sources: [classified] }, stay, now);
  assert.equal(summary.unconfirmed, 1);
  assert.equal(summary.requested!.stay.hasCurrentIntervals, false);
  assert.equal(summary.requested!.stay.peaks.windKnots, null);
});

test('area preview gives available range and gaps without inventing stay bounds or spatial coverage', () => {
  const summary = describeForecast([frame(0, 1), frame(3, 4)], pack, undefined, now);
  assert.equal(summary.requested, null);
  assert.equal(summary.availableRange?.from, time(0));
  assert.equal(summary.availableRange?.until, time(4));
  assert.equal(summary.availableRange?.hasGaps, true);
  const withStay = describeForecast([frame(1, 5)], pack, stay, now);
  assert.equal(withStay.requested!.stay.intervalGap, false);
  assert.deepEqual(withStay.rows[0]!.interval.coverageAreaIds, []);
});

test('peak formatting follows all unit systems without changing canonical observations', () => {
  const peaks = describeForecast([frame(1, 5)], pack, stay, now).requested!.stay.peaks;
  assert.equal(
    formatForecastPeaks(peaks, 'nautical'),
    'Wind 10 kt · gusts 15 kt · waves 1.0 m · current 0.5 kt',
  );
  assert.equal(
    formatForecastPeaks(peaks, 'metric'),
    'Wind 19 km/h · gusts 28 km/h · waves 1.0 m · current 0.9 km/h',
  );
  assert.equal(
    formatForecastPeaks(peaks, 'imperial'),
    'Wind 12 mph · gusts 17 mph · waves 3.3 ft · current 0.6 mph',
  );
});
