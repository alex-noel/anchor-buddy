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
/** UTC is used only as a timezone-neutral frame for calendar dates. */
export function calendarDate(key: string): Date | null {
  const parts = parseDate(key);
  return parts ? new Date(Date.UTC(...parts)) : null;
}

export function calendarDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function mondayColumn(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

export function moveCalendarDate(key: string, command: string, shift = false): string {
  const date = calendarDate(key);
  if (!date) return key;
  switch (command) {
    case 'ArrowLeft':
    case 'ArrowRight':
      date.setUTCDate(date.getUTCDate() + (command === 'ArrowLeft' ? -1 : 1));
      break;
    case 'ArrowUp':
    case 'ArrowDown':
      date.setUTCDate(date.getUTCDate() + (command === 'ArrowUp' ? -7 : 7));
      break;
    case 'Home':
    case 'End':
      date.setUTCDate(date.getUTCDate() - mondayColumn(date) + (command === 'Home' ? 0 : 6));
      break;
    case 'PageUp':
    case 'PageDown': {
      const monthShift = (command === 'PageUp' ? -1 : 1) * (shift ? 12 : 1);
      const day = date.getUTCDate();
      date.setUTCMonth(date.getUTCMonth() + monthShift, 1);
      const last = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
      ).getUTCDate();
      date.setUTCDate(Math.min(day, last));
      break;
    }
    default:
      return key;
  }
  const next = calendarDateKey(date);
  return parseDate(next) ? next : key;
}

export function localDateLabel(key: string, full = false) {
  const date = calendarDate(key);
  return date
    ? date.toLocaleDateString(undefined, {
        timeZone: 'UTC',
        weekday: full ? 'long' : 'short',
        year: 'numeric',
        month: full ? 'long' : 'short',
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

export function stayTiming(
  arrival: LocalDateHour,
  departure: LocalDateHour,
  contingencyHours: number,
): { hours: number; departure: string; contingencyEnd?: string } | null {
  try {
    const start = Date.parse(localHourToIso(arrival));
    const departureIso = localHourToIso(departure);
    const end = Date.parse(departureIso);
    const hours = (end - start) / 3_600_000;
    if (hours <= 0 || hours > 168) return null;
    const contingencyEnd =
      Number.isFinite(contingencyHours) && contingencyHours >= 0 && contingencyHours <= 48
        ? new Date(end + contingencyHours * 3_600_000).toISOString()
        : undefined;
    return { hours, departure: departureIso, contingencyEnd };
  } catch {
    return null;
  }
}
