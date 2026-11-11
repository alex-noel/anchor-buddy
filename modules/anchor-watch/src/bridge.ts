import { normalizeArmOptions } from './validation';
import type { ArmOptions, NativeWatch, WatchStatus } from './types';

export const NATIVE_WATCH_REQUIRED =
  'Anchor watch is unavailable in this environment. An installed iOS or Android development build with the native AnchorWatch module is required. Browsers and Expo Go cannot run background monitoring or native alarm tests.';

/** Native delegation only. Unsupported environments never create a watch or artificial fixes. */
export function createWatchBridge(native: NativeWatch | null | undefined) {
  function implementation(): NativeWatch {
    if (!native) throw new Error(NATIVE_WATCH_REQUIRED);
    return native;
  }
  return {
    async getStatus(): Promise<WatchStatus> {
      return native
        ? native.getStatus()
        : {
            state: 'idle',
            nativeAvailable: false,
            simulation: false,
            serviceRunning: false,
            alerts: [],
            message: NATIVE_WATCH_REQUIRED,
          };
    },
    async requestPermissions() {
      return implementation().requestPermissions();
    },
    async testAlarm() {
      return implementation().testAlarm();
    },
    async arm(options: ArmOptions) {
      return implementation().arm(normalizeArmOptions(options));
    },
    async acknowledge() {
      return implementation().acknowledge();
    },
    async stop() {
      return implementation().stop();
    },
    async updateRadius(radiusM: number, confirmed: boolean) {
      return implementation().updateRadius(radiusM, confirmed);
    },
    subscribe(listener: (status: WatchStatus) => void): () => void {
      if (!native) return () => {};
      const subscription = native.addListener('onStatus', listener);
      return () => subscription.remove();
    },
  };
}
