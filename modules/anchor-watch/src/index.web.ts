import { createWatchBridge } from './bridge';
export type * from './types';

/** A browser cannot supply the native location service or alarm-delivery guarantees. */
export const {
  getStatus,
  requestPermissions,
  testAlarm,
  arm,
  acknowledge,
  stop,
  updateRadius,
  subscribe,
} = createWatchBridge(null);
