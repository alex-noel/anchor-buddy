import type { ArmOptions, Coordinate, WatchFix, WatchStatus } from './types';

export interface WatchClock {
  wallMs: number;
  monotonicMs: number;
}
const ACTIVE = new Set(['arming', 'monitoring', 'position_uncertain', 'alarm']);
export const TEST_ALARM_VALID_MS = 10 * 60_000;

export function validateCoordinate(value: Coordinate): void {
  if (
    !value ||
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude) ||
    Math.abs(value.latitude) > 90 ||
    Math.abs(value.longitude) > 180
  ) {
    throw new Error('A valid, explicitly confirmed anchor position is required.');
  }
}
export function validateRadius(radiusM: number): void {
  if (!Number.isFinite(radiusM) || radiusM < 10 || radiusM > 10_000) {
    throw new Error('Alarm radius must be between 10 and 10,000 metres.');
  }
}
export function normalizeArmOptions(options: ArmOptions): Required<ArmOptions> {
  validateCoordinate(options.anchor);
  validateRadius(options.radiusM);
  if (
    options.anchorConfirmed !== true ||
    options.checklistConfirmed !== true ||
    options.testAlarmConfirmed !== true
  ) {
    throw new Error(
      'Confirm the anchor position, arrival checklist and successful test alarm before arming.',
    );
  }
  const maxAccuracyM = options.maxAccuracyM ?? Math.min(20, options.radiusM / 2);
  const staleAfterMs = options.staleAfterMs ?? 30_000;
  if (!Number.isFinite(maxAccuracyM) || maxAccuracyM < 1 || maxAccuracyM > options.radiusM / 2) {
    throw new Error(
      'Maximum position error must be at least 1 metre and no more than half the alarm radius.',
    );
  }
  if (!Number.isFinite(staleAfterMs) || staleAfterMs < 15_000 || staleAfterMs > 120_000) {
    throw new Error('Position expiry must be between 15 and 120 seconds.');
  }
  return { ...options, anchor: { ...options.anchor }, maxAccuracyM, staleAfterMs };
}
export function distanceMetres(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * rad;
  const lon = (b.longitude - a.longitude) * rad;
  const x =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(lon / 2) ** 2;
  return 6_371_008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, x)), Math.sqrt(Math.max(0, 1 - x)));
}

/** Executable reference for the native engines; never used for real background monitoring. */
export class WatchKernel {
  private status: WatchStatus;
  private options?: Required<ArmOptions>;
  private lastUsableMono = 0;
  private lastSeenTimestamp = -Infinity;
  private issue: 'healthy' | 'position' | 'boundary' = 'healthy';
  private alertSequence = 0;
  private testedMono?: number;

  constructor(simulation = true) {
    this.status = {
      state: 'idle',
      nativeAvailable: false,
      simulation,
      serviceRunning: false,
      alerts: [],
      message: simulation
        ? 'Simulation only. No background location or device alarm.'
        : 'Native anchor watch is unavailable.',
    };
  }
  snapshot(): WatchStatus {
    return {
      ...this.status,
      anchor: this.status.anchor && { ...this.status.anchor },
      lastFix: this.status.lastFix && { ...this.status.lastFix },
      alerts: this.status.alerts.map((alert) => ({ ...alert })),
    };
  }
  testAlarm(clock: WatchClock): void {
    this.testedMono = clock.monotonicMs;
    this.status.testAlarmAt = clock.wallMs;
  }
  arm(raw: ArmOptions, clock: WatchClock): WatchStatus {
    if (ACTIVE.has(this.status.state))
      throw new Error('Stop the current watch before selecting another anchor.');
    const options = normalizeArmOptions(raw);
    if (
      this.testedMono === undefined ||
      clock.monotonicMs - this.testedMono < 0 ||
      clock.monotonicMs - this.testedMono > TEST_ALARM_VALID_MS
    ) {
      throw new Error('Run and confirm the test alarm within ten minutes before arming.');
    }
    this.options = options;
    this.issue = 'healthy';
    this.lastUsableMono = clock.monotonicMs;
    this.lastSeenTimestamp = -Infinity;
    this.status = {
      state: 'arming',
      nativeAvailable: false,
      simulation: this.status.simulation,
      serviceRunning: true,
      sessionId: `simulation-${clock.wallMs}`,
      anchor: { ...options.anchor },
      radiusM: options.radiusM,
      maxAccuracyM: options.maxAccuracyM,
      staleAfterMs: options.staleAfterMs,
      alerts: [],
      lastHeartbeatAt: clock.wallMs,
      testAlarmAt: this.status.testAlarmAt,
      message: 'Waiting for a fresh accurate position.',
    };
    return this.snapshot();
  }
  fix(fix: WatchFix, clock: WatchClock): WatchStatus {
    if (!this.options || !ACTIVE.has(this.status.state)) return this.snapshot();
    try {
      validateCoordinate(fix);
    } catch {
      return this.snapshot();
    }
    if (
      !Number.isFinite(fix.timestamp) ||
      !Number.isFinite(fix.accuracyM) ||
      fix.accuracyM < 0 ||
      fix.timestamp <= this.lastSeenTimestamp ||
      fix.timestamp > clock.wallMs + 5_000 ||
      clock.wallMs - fix.timestamp > this.options.staleAfterMs
    )
      return this.snapshot();
    this.lastSeenTimestamp = fix.timestamp;
    this.status.lastFix = { ...fix };
    this.status.distanceM = distanceMetres(this.options.anchor, fix);
    this.status.lastHeartbeatAt = clock.wallMs;
    if (fix.accuracyM > this.options.maxAccuracyM) {
      this.setIssue('position', 'Position accuracy exceeds the configured limit.', clock);
    } else {
      // Include fix age, not just receipt time, so cached fixes cannot extend monitoring health.
      this.lastUsableMono = clock.monotonicMs - Math.max(0, clock.wallMs - fix.timestamp);
      if (this.status.distanceM - fix.accuracyM > this.options.radiusM) {
        this.setIssue('boundary', 'Vessel is beyond the confirmed anchor alarm boundary.', clock);
      } else if (this.status.distanceM + fix.accuracyM >= this.options.radiusM) {
        this.setIssue(
          'position',
          'Position uncertainty overlaps the anchor alarm boundary.',
          clock,
        );
      } else {
        this.issue = 'healthy';
        this.refreshState();
      }
    }
    return this.snapshot();
  }
  tick(clock: WatchClock): WatchStatus {
    if (!this.options || !ACTIVE.has(this.status.state)) return this.snapshot();
    this.status.lastHeartbeatAt = clock.wallMs;
    if (
      clock.monotonicMs - this.lastUsableMono > this.options.staleAfterMs ||
      clock.monotonicMs < this.lastUsableMono
    ) {
      this.setIssue(
        'position',
        'No recent usable position. Check the device and surroundings.',
        clock,
      );
    }
    return this.snapshot();
  }
  acknowledge(): WatchStatus {
    this.status.alerts = this.status.alerts.map((alert) => ({ ...alert, acknowledged: true }));
    if (ACTIVE.has(this.status.state)) this.refreshState();
    return this.snapshot();
  }
  updateRadius(radiusM: number, confirmed: boolean, clock: WatchClock): WatchStatus {
    validateRadius(radiusM);
    if (!confirmed) throw new Error('Explicitly confirm the new alarm radius.');
    if (!this.options || !ACTIVE.has(this.status.state)) throw new Error('No active watch.');
    if (radiusM < this.options.maxAccuracyM * 2)
      throw new Error('Radius is too small for the configured position accuracy.');
    this.options.radiusM = radiusM;
    this.status.radiusM = radiusM;
    const fix = this.status.lastFix;
    if (fix) {
      this.lastSeenTimestamp = -Infinity;
      this.fix(fix, clock);
    }
    this.tick(clock);
    return this.snapshot();
  }
  interrupt(clock: WatchClock): WatchStatus {
    if (ACTIVE.has(this.status.state)) {
      this.status.state = 'interrupted';
      this.status.serviceRunning = false;
      this.status.message =
        'Monitoring stopped or cannot be verified. Run the test alarm and re-arm explicitly.';
      this.status.alerts.push({
        id: `interrupted-${++this.alertSequence}`,
        kind: 'interrupted',
        message: this.status.message,
        occurredAt: clock.wallMs,
        acknowledged: false,
      });
      this.testedMono = undefined;
    }
    return this.snapshot();
  }
  stop(): WatchStatus {
    this.status.state = 'idle';
    this.status.serviceRunning = false;
    this.status.message = 'Watch stopped.';
    this.options = undefined;
    return this.snapshot();
  }
  private setIssue(issue: 'position' | 'boundary', message: string, clock: WatchClock): void {
    if (!this.status.alerts.some((alert) => alert.kind === issue && !alert.acknowledged)) {
      this.status.alerts.push({
        id: `${issue}-${++this.alertSequence}`,
        kind: issue,
        message,
        occurredAt: clock.wallMs,
        acknowledged: false,
      });
    }
    this.issue = issue;
    this.status.message = message;
    this.refreshState();
  }
  private refreshState(): void {
    if (
      this.issue === 'boundary' ||
      this.status.alerts.some((alert) => alert.kind === 'boundary' && !alert.acknowledged)
    ) {
      this.status.state = 'alarm';
    } else if (
      this.issue === 'position' ||
      this.status.alerts.some((alert) => alert.kind === 'position' && !alert.acknowledged)
    ) {
      this.status.state = 'position_uncertain';
    } else {
      this.status.state = this.status.lastFix ? 'monitoring' : 'arming';
      this.status.message = this.status.lastFix
        ? 'Inside the configured boundary; supplemental watch only.'
        : 'Waiting for a fresh accurate position.';
    }
  }
}
