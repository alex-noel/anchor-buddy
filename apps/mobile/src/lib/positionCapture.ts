import type { Position } from '@anchor-buddy/domain';

export interface CapturedFix {
  timestamp: number;
  coords: { latitude: number; longitude: number; accuracy: number | null };
}

/** Maps stop at 85 degrees; a watch may use any valid WGS84 latitude. */
export function validateCapturedPosition(
  fix: CapturedFix,
  now: number,
  maxLatitude: 85 | 90,
): Position {
  const age = now - fix.timestamp;
  if (!Number.isFinite(now) || !Number.isFinite(fix.timestamp) || age < -5_000 || age > 15_000)
    throw new Error('The location is not recent enough. Try again for a fresh position.');
  const { latitude, longitude, accuracy } = fix.coords;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > maxLatitude ||
    Math.abs(longitude) > 180
  )
    throw new Error(
      maxLatitude === 85
        ? 'The location is outside supported map coverage. Choose a position within 85° north or south.'
        : 'The location is invalid. Enter a verified latitude and longitude.',
    );
  if (accuracy === null || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 15)
    throw new Error('Wait for a position accuracy of 15 metres or better, then try again.');
  return [longitude, latitude];
}

type CaptureResult =
  | { kind: 'accepted'; position: Position }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

/** Location APIs cannot always abort; cancellation invalidates permission/fix replies. */
export function createPositionCapture() {
  let generation = 0;
  return {
    cancel() {
      generation++;
    },
    async capture(options: {
      requestPermission: () => Promise<boolean>;
      getFix: () => Promise<CapturedFix>;
      maxLatitude: 85 | 90;
      now?: () => number;
    }): Promise<CaptureResult> {
      const request = ++generation;
      const current = () => request === generation;
      try {
        const granted = await options.requestPermission();
        if (!current()) return { kind: 'cancelled' };
        if (!granted)
          throw new Error('Location permission denied. Enter a verified anchor position manually.');
        const fix = await options.getFix();
        if (!current()) return { kind: 'cancelled' };
        return {
          kind: 'accepted',
          position: validateCapturedPosition(fix, (options.now ?? Date.now)(), options.maxLatitude),
        };
      } catch (error) {
        return current()
          ? { kind: 'error', message: error instanceof Error ? error.message : String(error) }
          : { kind: 'cancelled' };
      }
    },
  };
}
