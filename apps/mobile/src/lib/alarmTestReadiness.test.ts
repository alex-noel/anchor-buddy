import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alarmTestIsFresh, createAlarmTestReadiness } from './alarmTestReadiness';

test('alarm readiness requires a completed current test and expires conservatively', () => {
  let now = 100;
  const test = createAlarmTestReadiness(() => now);
  const ticket = test.begin();
  assert.equal(test.fresh(), false);
  now += 10_000;
  assert.equal(test.complete(ticket), true);
  now = 600_100;
  assert.equal(test.fresh(), true);
  now++;
  assert.equal(test.fresh(), false);
});

test('resume reset and newer requests invalidate delayed alarm test completion', () => {
  const test = createAlarmTestReadiness(() => 10);
  const first = test.begin();
  test.reset();
  assert.equal(test.complete(first), false);
  const second = test.begin();
  const third = test.begin();
  assert.equal(test.complete(second), false);
  assert.equal(test.complete(third), true);
  assert.equal(test.expire(second), false);
  assert.equal(test.fresh(), true);
  assert.equal(test.expire(third), true);
  assert.equal(test.fresh(), false);
});

test('unavailable or discontinuous monotonic clock cannot grant readiness', () => {
  for (const [start, now] of [
    [null, 10],
    [NaN, 10],
    [0, NaN],
    [0, Infinity],
    [10, 9],
  ] as const)
    assert.equal(alarmTestIsFresh(start, now), false);
  let now = 0;
  const test = createAlarmTestReadiness(() => now);
  const ticket = test.begin();
  now = 600_001;
  assert.equal(test.complete(ticket), false);
  // No wall-clock timestamp is accepted by this interface.
  assert.equal(test.fresh(), false);
});
