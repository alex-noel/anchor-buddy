/** UI readiness is conservative; native monotonic arming checks remain authoritative. */
export const ALARM_TEST_VALID_MS = 600_000;
export function monotonicAlarmTime(): number {
  return globalThis.performance?.now() ?? NaN;
}
export function alarmTestIsFresh(started: number | null, now: number): boolean {
  return (
    started !== null &&
    Number.isFinite(started) &&
    Number.isFinite(now) &&
    now >= started &&
    now - started <= ALARM_TEST_VALID_MS
  );
}

/** A lifecycle change also invalidates a native test reply that is still pending. */
export function createAlarmTestReadiness(clock = monotonicAlarmTime) {
  let generation = 0;
  let started: number | null = null;
  let successful = false;
  return {
    begin() {
      started = clock();
      successful = false;
      return ++generation;
    },
    complete(ticket: number) {
      if (ticket !== generation || !alarmTestIsFresh(started, clock())) return false;
      successful = true;
      return true;
    },
    reset() {
      generation++;
      started = null;
      successful = false;
    },
    expire(ticket: number) {
      if (ticket !== generation) return false;
      generation++;
      started = null;
      successful = false;
      return true;
    },
    fresh() {
      return successful && alarmTestIsFresh(started, clock());
    },
    remainingMs() {
      const now = clock();
      return successful && alarmTestIsFresh(started, now)
        ? ALARM_TEST_VALID_MS - (now - started!) + 1
        : 0;
    },
  };
}
