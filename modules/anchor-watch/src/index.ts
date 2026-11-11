import { requireOptionalNativeModule } from 'expo-modules-core';
import { createWatchBridge } from './bridge';
import type { NativeWatch } from './types';
export type * from './types';

export const {
  getStatus,
  requestPermissions,
  testAlarm,
  arm,
  acknowledge,
  stop,
  updateRadius,
  subscribe,
} = createWatchBridge(requireOptionalNativeModule<NativeWatch>('AnchorWatch'));
