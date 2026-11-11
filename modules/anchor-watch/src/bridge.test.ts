import test from 'node:test';
import assert from 'node:assert/strict';
import { createWatchBridge } from './bridge';
import * as webWatch from './index.web';
import type { ArmOptions, NativeWatch, WatchStatus } from './types';

const confirmed: ArmOptions = {
  anchor: { latitude: 43.49, longitude: 16.44 },
  radiusM: 100,
  anchorConfirmed: true,
  checklistConfirmed: true,
  testAlarmConfirmed: true,
};

test('browser watch is unsupported, has no seeded location, and cannot simulate an alarm or monitoring', async () => {
  const status = await webWatch.getStatus();
  assert.equal(status.nativeAvailable, false);
  assert.equal(status.simulation, false);
  assert.equal(status.serviceRunning, false);
  assert.equal(status.state, 'idle');
  for (const property of ['anchor', 'radiusM', 'lastFix', 'distanceM', 'testAlarmAt', 'sessionId'])
    assert.equal((status as unknown as Record<string, unknown>)[property], undefined);
  assert.deepEqual(status.alerts, []);
  assert.match(status.message ?? '', /unavailable.*native/i);
  for (const action of [
    () => webWatch.requestPermissions(),
    () => webWatch.testAlarm(),
    () => webWatch.arm(confirmed),
    () => webWatch.updateRadius(200, true),
    () => webWatch.acknowledge(),
    () => webWatch.stop(),
  ])
    await assert.rejects(action, /unavailable.*native/i);
  let emitted = false;
  const unsubscribe = webWatch.subscribe(() => {
    emitted = true;
  });
  unsubscribe();
  assert.equal(emitted, false);
  assert.deepEqual(Object.keys(webWatch).sort(), [
    'acknowledge',
    'arm',
    'getStatus',
    'requestPermissions',
    'stop',
    'subscribe',
    'testAlarm',
    'updateRadius',
  ]);
  assert.deepEqual(await webWatch.getStatus(), status);
});

test('creating or reading a native bridge cannot stop, replace or recenter an existing watch', async () => {
  const current: WatchStatus = {
    state: 'monitoring',
    nativeAvailable: true,
    simulation: false,
    serviceRunning: true,
    sessionId: 'existing-native-session',
    anchor: { latitude: 43.49, longitude: 16.44 },
    radiusM: 90,
    alerts: [],
  };
  const calls: string[] = [];
  const armCalls: ArmOptions[] = [];
  const native: NativeWatch = {
    async getStatus() {
      calls.push('getStatus');
      return current;
    },
    async requestPermissions() {
      calls.push('permissions');
      return { location: true, precise: true, background: true, notifications: true, canArm: true };
    },
    async testAlarm() {
      calls.push('testAlarm');
    },
    async arm(options) {
      calls.push('arm');
      armCalls.push(options);
      return current;
    },
    async acknowledge() {
      calls.push('acknowledge');
      return current;
    },
    async stop() {
      calls.push('stop');
      return current;
    },
    async updateRadius() {
      calls.push('radius');
      return current;
    },
    addListener() {
      calls.push('subscribe');
      return {
        remove() {
          calls.push('unsubscribe');
        },
      };
    },
  };
  const watch = createWatchBridge(native);
  assert.equal(calls.length, 0);
  assert.equal(await watch.getStatus(), current);
  const off = watch.subscribe(() => {});
  off();
  assert.equal(calls.join(','), 'getStatus,subscribe,unsubscribe');
  assert.deepEqual(current.anchor, { latitude: 43.49, longitude: 16.44 });
  assert.equal(current.radiusM, 90);
  for (const key of ['anchorConfirmed', 'checklistConfirmed', 'testAlarmConfirmed'] as const)
    await assert.rejects(watch.arm({ ...confirmed, [key]: false }), /Confirm/);
  await assert.rejects(watch.arm({ ...confirmed, radiusM: NaN }), /radius/);
  assert.equal(armCalls.length, 0);
  await watch.arm(confirmed);
  const armed = armCalls[0]!;
  assert.deepEqual(armed.anchor, confirmed.anchor);
  assert.equal(armed.radiusM, confirmed.radiusM);
  assert.notEqual(armed.anchor, confirmed.anchor);
  assert.equal(calls.filter((call) => call === 'arm').length, 1);
  assert.equal(calls.includes('stop'), false);
  assert.equal(calls.includes('radius'), false);
});
