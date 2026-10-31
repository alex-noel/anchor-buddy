import type { UnitSystem } from '@anchor-buddy/domain';
export function depth(m: number | null | undefined, units: UnitSystem = 'nautical') {
  if (m == null || !Number.isFinite(m)) return 'Unknown';
  return units === 'imperial' ? `${(m * 3.28084).toFixed(1)} ft` : `${m.toFixed(1)} m`;
}
export function distance(nm: number, units: UnitSystem = 'nautical') {
  return units === 'metric'
    ? `${(nm * 1.852).toFixed(1)} km`
    : units === 'imperial'
      ? `${(nm * 1.15078).toFixed(1)} mi`
      : `${nm.toFixed(1)} nm`;
}
export function wind(knots: number | null, units: UnitSystem = 'nautical', precision = 0) {
  if (knots === null) return 'Unknown';
  return units === 'metric'
    ? `${(knots * 1.852).toFixed(precision)} km/h`
    : units === 'imperial'
      ? `${(knots * 1.15078).toFixed(precision)} mph`
      : `${knots.toFixed(precision)} kt`;
}
export function money(amount: number | null, currency: string | null = 'USD') {
  return amount === null
    ? 'Price unknown'
    : amount === 0
      ? 'Free'
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency || 'USD',
          maximumFractionDigits: 2,
        }).format(amount);
}
export function direction(deg: number | null) {
  return deg == null ? '—' : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}
export function localTime(iso: string, timezone?: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
