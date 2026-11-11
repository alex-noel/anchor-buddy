import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSearch, createVesselDraft } from '@anchor-buddy/domain';
import {
  equipmentChanged,
  moveStayArrival,
  parseUnitDraft,
  readCoordinateDraft,
  withDefaultStayDuration,
} from './formDrafts';
import { fromIsoToLocalHour, localHourToIso } from './localDateHour';

test('coordinate drafts never substitute a previous centre for partial, malformed or out-of-bounds input', () => {
  assert.deepEqual(readCoordinateDraft('43,5', '−16.4'), [-16.4, 43.5]);
  assert.deepEqual(readCoordinateDraft('0', '0'), [0, 0]);
  for (const [lat, lon] of [
    ['', '16'],
    ['43', '-'],
    ['90', '16'],
    ['43', '181'],
    ['43,5.4', '16'],
  ])
    assert.equal(readCoordinateDraft(lat!, lon!), null, `${lat}, ${lon}`);
});

test('default stay duration persists independently of the old dates and rejects fractional/invalid hours', () => {
  const search = createDefaultSearch([16, 43], '2026-11-11T12:00:00Z');
  const next = withDefaultStayDuration(search, '4');
  assert.equal(Date.parse(next.departure) - Date.parse(next.arrival), 4 * 3_600_000);
  assert.equal(next.departureContingencyHours, search.departureContingencyHours);
  for (const text of ['', '0', '1.5', '169', 'NaN'])
    assert.throws(() => withDefaultStayDuration(search, text), /whole number/, text);
});

test('moving arrival preserves elapsed duration across a daylight-saving transition', () => {
  const old = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const arrival = fromIsoToLocalHour('2026-03-06T17:00:00Z');
    const departure = fromIsoToLocalHour('2026-03-07T11:00:00Z');
    const nextArrival = fromIsoToLocalHour('2026-03-07T17:00:00Z');
    const nextDeparture = moveStayArrival(arrival, departure, nextArrival);
    assert.equal(
      Date.parse(localHourToIso(nextDeparture)) - Date.parse(localHourToIso(nextArrival)),
      18 * 3_600_000,
    );
    assert.equal(nextDeparture.hour, 7);
    const nonexistent = { date: '2026-03-08', hour: 2 };
    assert.deepEqual(moveStayArrival(arrival, departure, nonexistent), departure);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});

test('boat dimensions and equipment edits invalidate previously reviewed guidance, name changes do not', () => {
  const boat = createVesselDraft();
  boat.lengthM = 10;
  boat.beamM = 3;
  boat.loadedDraftM = 1.5;
  boat.displacementKg = 5000;
  boat.anchor.usableLengthM = 60;
  boat.anchor.bowRollerHeightM = 1;
  boat.anchor.type = 'modern-scoop';
  assert.equal(equipmentChanged(boat, { ...boat, name: 'Renamed boat' }), false);
  for (const patch of [
    { lengthM: 11 },
    { beamM: 4 },
    { loadedDraftM: 2 },
    { displacementKg: 6000 },
    { type: 'catamaran' as const },
  ])
    assert.equal(equipmentChanged(boat, { ...boat, ...patch }), true, Object.keys(patch)[0]);
  assert.equal(
    equipmentChanged(boat, { ...boat, anchor: { ...boat.anchor, usableLengthM: 40 } }),
    true,
  );
  assert.equal(
    equipmentChanged(boat, { ...boat, anchor: { ...boat.anchor, bowRollerHeightM: 2 } }),
    true,
  );
});

test('rounded unit controls preserve exact thresholds and programmatic radius limits', () => {
  assert.equal(parseUnitDraft('28.77', 25, 1.15078), 25);
  assert.equal(parseUnitDraft('1.64', 0.5, 3.280839895), 0.5);
  assert.equal(parseUnitDraft('28', 25, 1.15078), 28 / 1.15078);
  assert.ok(Number.isNaN(parseUnitDraft('', 25, 1.15078)));
});

test('moving arrival across a half-hour clock change rounds departure up instead of shortening the stay', () => {
  const old = process.env.TZ;
  process.env.TZ = 'Australia/Lord_Howe';
  try {
    const arrival = { date: '2026-10-02', hour: 12 };
    const departure = { date: '2026-10-03', hour: 6 };
    const nextArrival = { date: '2026-10-03', hour: 12 };
    const nextDeparture = moveStayArrival(arrival, departure, nextArrival);
    const elapsed =
      Date.parse(localHourToIso(nextDeparture)) - Date.parse(localHourToIso(nextArrival));
    assert.equal(elapsed, 18.5 * 3_600_000);
    assert.equal(nextDeparture.hour, 7);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
