import { requireOptionalNativeModule } from 'expo-modules-core';
import { normalizeArmOptions } from './kernel';
import { WatchSimulator } from './simulator';
import type { ArmOptions, NativeWatch, WatchFix, WatchPermissions, WatchStatus } from './types';
export type * from './types';

const native = requireOptionalNativeModule<NativeWatch>('AnchorWatch');
let simulator: WatchSimulator | undefined;
const unavailable: WatchStatus = {
  state: 'idle',
  nativeAvailable: false,
  simulation: false,
  serviceRunning: false,
  alerts: [],
  message:
    'Native anchor watch requires an iOS or Android development build. Preview simulation must be enabled explicitly.',
};

function implementation(): NativeWatch | WatchSimulator {
  if (simulator) return simulator;
  if (native) return native;
  throw new Error(unavailable.message);
}
/** Explicit development/demo opt-in. A simulated session is never a native watch. */
export function enableSimulation(): void {
  if (native) throw new Error('Simulation is disabled when the native watch module is available.');
  simulator ??= new WatchSimulator();
}
export function injectSimulationFix(fix: WatchFix): WatchStatus {
  if (!simulator) throw new Error('Enable simulation explicitly before replaying a position.');
  return simulator.injectFix(fix);
}
export function interruptSimulation(): WatchStatus {
  if (!simulator) throw new Error('Simulation is not enabled.');
  return simulator.interrupt();
}
export async function getStatus(): Promise<WatchStatus> {
  return native || simulator ? implementation().getStatus() : { ...unavailable, alerts: [] };
}
export async function requestPermissions(): Promise<WatchPermissions> {
  return implementation().requestPermissions();
}
export async function testAlarm(): Promise<void> {
  return implementation().testAlarm();
}
export async function arm(options: ArmOptions): Promise<WatchStatus> {
  return implementation().arm(normalizeArmOptions(options));
}
export async function acknowledge(): Promise<WatchStatus> {
  return implementation().acknowledge();
}
export async function stop(): Promise<WatchStatus> {
  return implementation().stop();
}
export async function updateRadius(radiusM: number, confirmed: boolean): Promise<WatchStatus> {
  return implementation().updateRadius(radiusM, confirmed);
}
export function subscribe(listener: (status: WatchStatus) => void): () => void {
  if (simulator) return simulator.subscribe(listener);
  if (native) {
    const subscription = native.addListener('onStatus', listener);
    return () => subscription.remove();
  }
  return () => {};
}
