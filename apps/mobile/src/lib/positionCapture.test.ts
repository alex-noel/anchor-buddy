import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPositionCapture,
  validateCapturedPosition,
  type CapturedFix,
} from './positionCapture';

const now = 100_000;
const fix = (changes: Partial<CapturedFix> = {}): CapturedFix => ({
  timestamp: now,
  coords: { latitude: 43.5, longitude: 16.4, accuracy: 5 },
  ...changes,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('capture validates finite fixes, accuracy, age and caller-specific latitude bounds', () => {
  assert.deepEqual(validateCapturedPosition(fix(), now, 85), [16.4, 43.5]);
  for (const timestamp of [NaN, Infinity, now - 15_001, now + 5_001])
    assert.throws(() => validateCapturedPosition(fix({ timestamp }), now, 90));
  for (const accuracy of [null, NaN, Infinity, -1, 15.1])
    assert.throws(() =>
      validateCapturedPosition(fix({ coords: { ...fix().coords, accuracy } }), now, 90),
    );
  for (const coords of [
    { latitude: NaN, longitude: 10, accuracy: 0 },
    { latitude: 91, longitude: 10, accuracy: 0 },
    { latitude: 0, longitude: Infinity, accuracy: 0 },
    { latitude: 0, longitude: 181, accuracy: 0 },
  ])
    assert.throws(() => validateCapturedPosition(fix({ coords }), now, 90));
  const polar = fix({ coords: { latitude: 90, longitude: -180, accuracy: 0 } });
  assert.deepEqual(validateCapturedPosition(polar, now, 90), [-180, 90]);
  assert.throws(() => validateCapturedPosition(polar, now, 85));
  assert.deepEqual(
    validateCapturedPosition(fix({ timestamp: now - 15_000 }), now, 90),
    [16.4, 43.5],
  );
});

test('cancelling permission prevents acquiring a fix', async () => {
  const capture = createPositionCapture();
  const permission = deferred<boolean>();
  let fixes = 0;
  const pending = capture.capture({
    requestPermission: () => permission.promise,
    getFix: async () => {
      fixes++;
      return fix();
    },
    maxLatitude: 90,
    now: () => now,
  });
  capture.cancel();
  permission.resolve(true);
  assert.deepEqual(await pending, { kind: 'cancelled' });
  assert.equal(fixes, 0);
});

test('manual edits, unmount and newer captures invalidate an older fix', async () => {
  for (const startNew of [false, true]) {
    const capture = createPositionCapture();
    const location = deferred<CapturedFix>();
    const pending = capture.capture({
      requestPermission: async () => true,
      getFix: () => location.promise,
      maxLatitude: 90,
      now: () => now,
    });
    await Promise.resolve();
    if (startNew) {
      const next = await capture.capture({
        requestPermission: async () => true,
        getFix: async () => fix(),
        maxLatitude: 90,
        now: () => now,
      });
      assert.equal(next.kind, 'accepted');
    } else capture.cancel();
    location.resolve(fix());
    assert.deepEqual(await pending, { kind: 'cancelled' });
  }
});

test('permission denial and malformed fixes return actionable failures', async () => {
  const capture = createPositionCapture();
  const denied = await capture.capture({
    requestPermission: async () => false,
    getFix: async () => {
      throw new Error('must not request');
    },
    maxLatitude: 90,
  });
  assert.equal(denied.kind, 'error');
  const invalid = await capture.capture({
    requestPermission: async () => true,
    getFix: async () => fix({ timestamp: NaN }),
    maxLatitude: 90,
    now: () => now,
  });
  assert.equal(invalid.kind, 'error');
});
