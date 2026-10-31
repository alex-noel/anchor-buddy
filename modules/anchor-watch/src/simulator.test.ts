import assert from 'node:assert/strict';
import test from 'node:test';
import { WatchSimulator } from './simulator';
import type { ArmOptions, WatchStatus } from './types';

const options: ArmOptions = {
  anchor: { latitude: 24.55, longitude: -81.8 },
  radiusM: 90,
  anchorConfirmed: true,
  checklistConfirmed: true,
  testAlarmConfirmed: true,
};

test('simulator permissions and events never claim native monitoring or notification capability', async () => {
  const simulator = new WatchSimulator();
  const events: WatchStatus[] = [];
  const unsubscribe = simulator.subscribe((status) => events.push(status));
  try {
    const permission = await simulator.requestPermissions();
    assert.equal(permission.canArm, false);
    assert.equal(permission.notifications, false);
    assert.match(permission.message!, /Simulation only/);
    await simulator.testAlarm();
    assert.equal((await simulator.arm(options)).state, 'arming');
    simulator.injectFix({ ...options.anchor, accuracyM: 3, timestamp: Date.now() });
    assert.equal((await simulator.getStatus()).state, 'monitoring');
    assert.ok(events.every((status) => status.simulation && !status.nativeAvailable));
  } finally {
    unsubscribe();
    await simulator.stop();
  }
});

test('simulator interruption invalidates the test and requires explicit rearming', async () => {
  const simulator = new WatchSimulator();
  try {
    await simulator.testAlarm();
    await simulator.arm(options);
    const interrupted = simulator.interrupt();
    assert.equal(interrupted.state, 'interrupted');
    assert.equal(interrupted.serviceRunning, false);
    await assert.rejects(() => simulator.arm(options), /test alarm/);
    await simulator.testAlarm();
    assert.equal((await simulator.arm(options)).state, 'arming');
  } finally {
    await simulator.stop();
  }
});
