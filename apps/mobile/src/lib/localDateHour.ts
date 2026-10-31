/** Calendar dates and hours are entered in the device's local timezone. */
export interface LocalDateHour {
  date: string;
  hour: number;
  /** Disambiguates the repeated hour when daylight saving time ends. */
  occurrence?: number;
}
const pad = (n: number) => String(n).padStart(2, '0');
export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function parseDate(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 &&
    y <= 2200 &&
    check.getUTCFullYear() === y &&
    check.getUTCMonth() === m - 1 &&
    check.getUTCDate() === d
    ? [y, m - 1, d]
    : null;
}
/** Enumerate actual instants instead of silently shifting a nonexistent DST hour. */
export function localHourCandidates(value: LocalDateHour): string[] {
  const parts = parseDate(value.date);
  if (!parts || !Number.isInteger(value.hour) || value.hour < 0 || value.hour > 23) return [];
  const [year, month, day] = parts;
  const wallClock = Date.UTC(year, month, day, value.hour);
  // Collect offsets on both sides of a local timezone transition, including half-hour DST.
  const offsets = new Set<number>();
  for (let h = -36; h <= 36; h++)
    offsets.add(new Date(wallClock + h * 3_600_000).getTimezoneOffset());
  return [...offsets]
    .map((offset) => new Date(wallClock + offset * 60_000))
    .filter(
      (date) =>
        localDateKey(date) === value.date &&
        date.getHours() === value.hour &&
        date.getMinutes() === 0,
    )
    .map((date) => date.toISOString())
    .sort();
}
export function fromIsoToLocalHour(iso: string): LocalDateHour {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid date');
  const value: LocalDateHour = { date: localDateKey(date), hour: date.getHours() };
  const candidates = localHourCandidates(value);
  const matching = candidates.findIndex(
    (candidate) => new Date(candidate).getTimezoneOffset() === date.getTimezoneOffset(),
  );
  return { ...value, occurrence: candidates.length > 1 ? Math.max(0, matching) : undefined };
}
export function localHourToIso(value: LocalDateHour): string {
  const candidates = localHourCandidates(value);
  if (!candidates.length)
    throw new Error('This local hour does not exist. Choose another date or hour.');
  if (candidates.length > 1 && value.occurrence === undefined)
    throw new Error('This hour occurs twice. Choose the first or second occurrence.');
  const selected = candidates[value.occurrence ?? 0];
  if (!selected) throw new Error('Choose a valid local time.');
  return selected;
}
export function localDateLabel(key: string) {
  const parts = parseDate(key);
  return parts
    ? new Date(...parts, 12).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Choose date';
}
export function localHourLabel(hour: number) {
  return new Date(2026, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric' });
}
export function timezoneLabel() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Device local time';
}
