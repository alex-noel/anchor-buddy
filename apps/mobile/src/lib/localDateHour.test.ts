import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fromIsoToLocalHour,
  localHourCandidates,
  localHourToIso,
  localDateLabel,
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
