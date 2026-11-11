import type { ArmOptions, Coordinate } from './types';

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
