import type { FeeStatus, UnitSystem } from './types.ts';
import { CANONICAL_CONVERSIONS } from './contracts.ts';
export function formatDepth(metres: number | null, units: UnitSystem = 'nautical'): string {
  return metres === null
    ? 'Unknown'
    : units === 'imperial'
      ? `${(metres / CANONICAL_CONVERSIONS.metresPerFoot).toFixed(1)} ft`
      : `${metres.toFixed(1)} m`;
}
export function formatDistance(nauticalMiles: number, units: UnitSystem = 'nautical'): string {
  return units === 'metric'
    ? `${(nauticalMiles * CANONICAL_CONVERSIONS.kilometresPerNauticalMile).toFixed(1)} km`
    : units === 'imperial'
      ? `${(
          nauticalMiles *
          (CANONICAL_CONVERSIONS.metresPerNauticalMile / CANONICAL_CONVERSIONS.metresPerStatuteMile)
        ).toFixed(1)} mi`
      : `${nauticalMiles.toFixed(1)} nm`;
}
/** Currency digits are an Intl display fallback, not source precision metadata. */
export function formatPrice(
  total: number | null,
  currency?: string | null,
  status?: FeeStatus,
): string {
  if (total === null || !Number.isFinite(total)) return 'Price unknown';
  if (total === 0 && status === 'free') return 'Free';
  if (total === 0 && status !== 'paid') return 'Price unknown';
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency))
    return `${String(total)} (currency unknown)`;
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).format(total);
  } catch {
    return `${String(total)} (currency unknown)`;
  }
}
