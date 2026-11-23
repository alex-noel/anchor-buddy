// Test-only native bridge/location substitutes. Never imported by the app entry.
import type { WatchStatus, ArmOptions } from '../../../../modules/anchor-watch/src/types';
let status: WatchStatus = {
  state: 'idle',
  nativeAvailable: true,
  simulation: false,
  serviceRunning: false,
  alerts: [],
};
const listeners = new Set<(s: WatchStatus) => void>();
const fixes: Array<(fix: unknown) => void> = [];
export const Accuracy = { Highest: 6 };
export const requestForegroundPermissionsAsync = async () => ({ granted: true, status: 'granted' });
export const getCurrentPositionAsync = () => new Promise((resolve) => fixes.push(resolve));
let postStopOverride: Partial<WatchStatus> | undefined;
let postStopRead: Partial<WatchStatus> | undefined;
export const getStatus = async () => {
  if (postStopRead) {
    const next = { ...status, ...postStopRead };
    postStopRead = undefined;
    return next;
  }
  return status;
};
export const subscribe = (fn: (s: WatchStatus) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
let deferPermissions = false;
let finishPermissions: (() => void) | undefined;
export const requestPermissions = async () => {
  if (deferPermissions)
    await new Promise<void>((resolve) => {
      finishPermissions = resolve;
    });
  return {
    location: true,
    precise: true,
    background: true,
    notifications: true,
    canArm: true,
  };
};
let deferAlarm = false;
let finishAlarm: (() => void) | undefined;
export const testAlarm = async () => {
  if (deferAlarm)
    await new Promise<void>((resolve) => {
      finishAlarm = resolve;
    });
};
export const arm = async (options: ArmOptions) => {
  calls.arm++;
  emit({
    state: 'monitoring',
    serviceRunning: true,
    sessionId: 'test-session',
    anchor: options.anchor,
    radiusM: options.radiusM,
  });
  return status;
};
let deferStop = false;
let rejectStop = false;
let finishStop: (() => void) | undefined;
export const stop = async () => {
  calls.stop++;
  if (deferStop)
    await new Promise<void>((resolve) => {
      finishStop = resolve;
    });
  if (rejectStop) throw new Error('Controlled native stop failure');
  emit({ state: 'idle', serviceRunning: false });
  postStopRead = postStopOverride;
  postStopOverride = undefined;
  return status;
};
export const acknowledge = async () => status;
export const updateRadius = async (radiusM: number) => {
  status = { ...status, radiusM };
  return status;
};
const calls = { arm: 0, stop: 0 };
function emit(patch: Partial<WatchStatus>) {
  status = { ...status, ...patch };
  for (const fn of listeners) fn(status);
}
(globalThis as any).watchHarness = {
  emit,
  calls,
  resolveFix: (fix: unknown) => fixes.shift()?.(fix),
  pendingFixes: () => fixes.length,
  holdPermissions: () => {
    deferPermissions = true;
  },
  resolvePermissions: () => finishPermissions?.(),
  holdAlarm: () => {
    deferAlarm = true;
  },
  resolveAlarm: () => finishAlarm?.(),
  holdStop: () => {
    deferStop = true;
  },
  resolveStop: () => {
    deferStop = false;
    finishStop?.();
  },
  failStop: (value: boolean) => {
    rejectStop = value;
  },
  overridePostStopRead: (value: Partial<WatchStatus>) => {
    postStopOverride = value;
  },
};
