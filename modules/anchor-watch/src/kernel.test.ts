import assert from 'node:assert/strict';
import test from 'node:test';
import { WatchKernel, distanceMetres, normalizeArmOptions } from './kernel';
import type { ArmOptions, WatchFix } from './types';

const start = 1_700_000_000_000;
const clock = (elapsed = 0) => ({ wallMs: start + elapsed, monotonicMs: 5_000 + elapsed });
const options: ArmOptions = {
  anchor: { latitude: 24.55, longitude: -81.8 },
  radiusM: 100,
  anchorConfirmed: true,
  checklistConfirmed: true,
  testAlarmConfirmed: true,
};
const fix = (northM: number, elapsed = 1_000, accuracyM = 5): WatchFix => ({
  latitude: options.anchor.latitude + northM / 111_195.0802335329,
  longitude: options.anchor.longitude,
  timestamp: start + elapsed,
  accuracyM,
});
function armed() {
  const kernel = new WatchKernel();
  kernel.testAlarm(clock());
  kernel.arm(options, clock());
  return kernel;
}

test('requires confirmation, recent alarm test and valid thresholds', () => {
  const watch = new WatchKernel();
  assert.throws(() => watch.arm(options, clock()), /test alarm/);
  watch.testAlarm(clock());
  assert.throws(() => watch.arm({ ...options, anchorConfirmed: false }, clock()), /Confirm/);
  assert.throws(() => watch.arm({ ...options, testAlarmConfirmed: false }, clock()), /Confirm/);
  assert.throws(() => watch.arm(options, clock(600_001)), /ten minutes/);
  assert.throws(() => normalizeArmOptions({ ...options, radiusM: Infinity }), /radius/);
  assert.throws(() => normalizeArmOptions({ ...options, maxAccuracyM: 60 }), /half/);
  assert.throws(
    () => normalizeArmOptions({ ...options, anchor: { latitude: 91, longitude: 0 } }),
    /anchor/,
  );
});
test('arming is not monitoring until a recent accurate fix arrives', () => {
  const watch = armed();
  assert.equal(watch.snapshot().state, 'arming');
  assert.equal(watch.fix(fix(10), clock(1_000)).state, 'monitoring');
  assert.equal(watch.snapshot().simulation, true);
  assert.equal(watch.snapshot().nativeAvailable, false);
});
test('boundary alarms remain latched after returning inside until explicitly acknowledged', () => {
  const watch = armed();
  assert.equal(watch.fix(fix(120), clock(1_000)).state, 'alarm');
  assert.equal(watch.fix(fix(5, 2_000), clock(2_000)).state, 'alarm');
  const status = watch.acknowledge();
  assert.equal(status.state, 'monitoring');
  assert.equal(status.alerts.length, 1);
  assert.equal(status.alerts[0].acknowledged, true);
});
test('acknowledgment cannot declare a vessel still outside to be monitoring normally', () => {
  const watch = armed();
  watch.fix(fix(120), clock(1_000));
  assert.equal(watch.acknowledge().state, 'alarm');
  assert.equal(
    watch.fix(fix(120, 2_000), clock(2_000)).alerts.filter((a) => !a.acknowledged).length,
    1,
  );
});
test('a position accuracy circle overlapping the radius is uncertainty, not an inside result', () => {
  const watch = armed();
  const status = watch.fix(fix(98), clock(1_000));
  assert.equal(status.state, 'position_uncertain');
  assert.match(status.alerts[0].message, /overlaps/);
});
test('poor accuracy triggers a latched uncertainty even at the anchor point', () => {
  const watch = armed();
  assert.equal(watch.fix(fix(0, 1_000, 80), clock(1_000)).state, 'position_uncertain');
  assert.equal(watch.acknowledge().state, 'position_uncertain');
  assert.equal(watch.fix(fix(0, 2_000), clock(2_000)).state, 'monitoring');
});
test('rejected stale, out-of-order, future and invalid fixes cannot overwrite a newer breach', () => {
  const watch = armed();
  watch.fix(fix(120, 5_000), clock(5_000));
  for (const input of [
    fix(0, 4_000),
    fix(0, 5_000),
    fix(0, 99_000),
    { ...fix(0, 6_000), accuracyM: NaN },
    { ...fix(0, 6_000), longitude: 999 },
  ])
    watch.fix(input, clock(6_000));
  assert.equal(watch.snapshot().lastFix?.timestamp, start + 5_000);
  assert.equal(watch.snapshot().state, 'alarm');
  assert.equal(watch.fix(fix(0, 7_000), clock(40_000)).lastFix?.timestamp, start + 5_000);
});
test('health expiry uses monotonic time when device wall time moves backward', () => {
  const watch = armed();
  watch.fix(fix(0), clock(1_000));
  const status = watch.tick({ wallMs: start - 10_000_000, monotonicMs: clock(31_001).monotonicMs });
  assert.equal(status.state, 'position_uncertain');
  assert.match(status.message!, /recent usable/);
});
test('cached position age does not extend the usable-fix deadline', () => {
  const watch = armed();
  watch.fix(fix(0, 1_000), clock(25_000));
  assert.equal(watch.tick(clock(31_001)).state, 'position_uncertain');
});
test('no initial fix becomes uncertain after the acquisition deadline', () => {
  const watch = armed();
  assert.equal(watch.tick(clock(30_001)).state, 'position_uncertain');
});
test('radius changes preserve the anchor, require confirmation and re-evaluate the existing position', () => {
  const watch = armed();
  watch.fix(fix(80), clock(1_000));
  assert.throws(() => watch.updateRadius(50, false, clock(2_000)), /confirm/);
  const status = watch.updateRadius(50, true, clock(2_000));
  assert.deepEqual(status.anchor, options.anchor);
  assert.equal(status.radiusM, 50);
  assert.equal(status.state, 'alarm');
  assert.equal(watch.updateRadius(150, true, clock(3_000)).state, 'alarm');
});
test('explicit stop is needed before re-anchoring and a process interruption cannot auto-resume', () => {
  const watch = armed();
  assert.throws(
    () => watch.arm({ ...options, anchor: { latitude: 0, longitude: 0 } }, clock()),
    /Stop/,
  );
  const interrupted = watch.interrupt(clock(1_000));
  assert.equal(interrupted.state, 'interrupted');
  assert.equal(interrupted.serviceRunning, false);
  assert.equal(watch.fix(fix(0, 2_000), clock(2_000)).state, 'interrupted');
  assert.throws(() => watch.arm(options, clock(3_000)), /test alarm/);
  watch.testAlarm(clock(3_000));
  assert.equal(watch.arm(options, clock(3_000)).state, 'arming');
  assert.equal(watch.stop().state, 'idle');
  assert.equal(watch.tick(clock(99_000)).state, 'idle');
});
test('callers cannot mutate the stored anchor or alert history', () => {
  const watch = armed();
  const status = watch.fix(fix(120), clock(1_000));
  status.anchor!.latitude = 0;
  status.alerts[0].acknowledged = true;
  assert.equal(watch.snapshot().anchor!.latitude, options.anchor.latitude);
  assert.equal(watch.snapshot().alerts[0].acknowledged, false);
});
test('distance is stable across the antimeridian and at identical positions', () => {
  assert.equal(distanceMetres(options.anchor, options.anchor), 0);
  assert.ok(
    distanceMetres({ latitude: 0, longitude: 179.999 }, { latitude: 0, longitude: -179.999 }) < 223,
  );
});
