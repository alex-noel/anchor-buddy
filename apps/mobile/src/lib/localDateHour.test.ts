import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fromIsoToLocalHour,
  localHourCandidates,
  localHourToIso,
  localDateLabel,
  moveCalendarDate,
  stayTiming,
} from './localDateHour.ts';

test('local date entry preserves timezone, rejects invalid days and strips minutes', () => {
  const old = process.env.TZ;
  process.env.TZ = 'Europe/Paris';
  try {
    const local = fromIsoToLocalHour('2026-10-30T15:37:21.000Z');
    assert.deepEqual(local, { date: '2026-10-30', hour: 16, occurrence: undefined });
    assert.equal(localHourToIso(local), '2026-10-30T15:00:00.000Z');
    assert.deepEqual(localHourCandidates({ date: '2026-02-30', hour: 12 }), []);
    assert.deepEqual(localHourCandidates({ date: '2026-02-28', hour: 24 }), []);
    assert.equal(localDateLabel('2026-02-30'), 'Choose date');
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test('spring daylight-saving gap requires another hour instead of silently advancing', () => {
  const old = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    assert.throws(() => localHourToIso({ date: '2026-03-08', hour: 2 }), /does not exist/);
    assert.equal(localHourToIso({ date: '2026-03-08', hour: 3 }), '2026-03-08T07:00:00.000Z');
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test('repeated daylight-saving hour is explicit and preserves the loaded occurrence', () => {
  const old = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const selection = { date: '2026-11-01', hour: 1 };
    assert.deepEqual(localHourCandidates(selection), [
      '2026-11-01T05:00:00.000Z',
      '2026-11-01T06:00:00.000Z',
    ]);
    assert.throws(() => localHourToIso(selection), /occurs twice/);
    assert.equal(localHourToIso({ ...selection, occurrence: 1 }), '2026-11-01T06:00:00.000Z');
    assert.equal(fromIsoToLocalHour('2026-11-01T06:30:00.000Z').occurrence, 1);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test('fractional timezone offsets convert without shifting the chosen local hour', () => {
  const old = process.env.TZ;
  process.env.TZ = 'Asia/Kathmandu';
  try {
    assert.equal(localHourToIso({ date: '2026-10-30', hour: 8 }), '2026-10-30T02:15:00.000Z');
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});

test('calendar navigation crosses weeks and clamps days when changing month or year', () => {
  assert.equal(moveCalendarDate('2026-11-01', 'Home'), '2026-10-26');
  assert.equal(moveCalendarDate('2026-10-31', 'ArrowRight'), '2026-11-01');
  assert.equal(moveCalendarDate('2026-10-31', 'PageDown'), '2026-11-30');
  assert.equal(moveCalendarDate('2024-02-29', 'PageDown', true), '2025-02-28');
  assert.equal(moveCalendarDate('1900-01-01', 'ArrowLeft'), '1900-01-01');
});

test('stay and contingency remain separate across the repeated New York hour', () => {
  const old = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const arrival = { date: '2026-10-31', hour: 23 };
    const departure = { date: '2026-11-01', hour: 1 };
    assert.equal(stayTiming(arrival, departure, 3), null);
    assert.deepEqual(stayTiming(arrival, { ...departure, occurrence: 1 }, 3), {
      hours: 3,
      departure: '2026-11-01T06:00:00.000Z',
      contingencyEnd: '2026-11-01T09:00:00.000Z',
    });
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});

test('fractional daylight-saving transitions preserve elapsed stay and contingency', () => {
  const old = process.env.TZ;
  process.env.TZ = 'Australia/Lord_Howe';
  try {
    const arrival = { date: '2026-10-03', hour: 23 };
    assert.equal(stayTiming(arrival, { date: '2026-10-04', hour: 2 }, 3), null);
    assert.deepEqual(stayTiming(arrival, { date: '2026-10-04', hour: 3 }, 3), {
      hours: 3.5,
      departure: '2026-10-03T16:00:00.000Z',
      contingencyEnd: '2026-10-03T19:00:00.000Z',
    });
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
