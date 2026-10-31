export type WatchState =
  'idle' | 'arming' | 'monitoring' | 'position_uncertain' | 'alarm' | 'interrupted';
export interface Coordinate {
  latitude: number;
  longitude: number;
}
export interface WatchFix extends Coordinate {
  accuracyM: number;
  timestamp: number;
}
export interface WatchPermissions {
  location: boolean;
  precise: boolean;
  background: boolean;
  notifications: boolean;
  canArm: boolean;
  message?: string;
}
export interface ArmOptions {
  anchor: Coordinate;
  radiusM: number;
  /** The user explicitly confirmed this physical anchor position. */
  anchorConfirmed: boolean;
  checklistConfirmed: boolean;
  /** The user heard/saw the actual native test alarm. */
  testAlarmConfirmed: boolean;
  maxAccuracyM?: number;
  staleAfterMs?: number;
}
export interface WatchAlert {
  id: string;
  kind: 'boundary' | 'position' | 'interrupted';
  message: string;
  occurredAt: number;
  acknowledged: boolean;
}
export interface WatchStatus {
  state: WatchState;
  nativeAvailable: boolean;
  simulation: boolean;
  serviceRunning: boolean;
  sessionId?: string;
  anchor?: Coordinate;
  radiusM?: number;
  maxAccuracyM?: number;
  staleAfterMs?: number;
  lastFix?: WatchFix;
  distanceM?: number;
  lastHeartbeatAt?: number;
  testAlarmAt?: number;
  alerts: WatchAlert[];
  message?: string;
}
export interface NativeWatch {
  getStatus(): Promise<WatchStatus>;
  requestPermissions(): Promise<WatchPermissions>;
  testAlarm(): Promise<void>;
  arm(options: ArmOptions): Promise<WatchStatus>;
  acknowledge(): Promise<WatchStatus>;
  stop(): Promise<WatchStatus>;
  updateRadius(radiusM: number, confirmed: boolean): Promise<WatchStatus>;
  addListener(event: 'onStatus', listener: (status: WatchStatus) => void): { remove(): void };
}
