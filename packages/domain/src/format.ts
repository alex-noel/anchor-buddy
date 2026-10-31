import type { UnitSystem } from './types.ts';
export function formatDepth(metres: number | null, units: UnitSystem = 'nautical'): string {
  return metres === null
    ? 'Unknown'
    : units === 'imperial'
      ? `${(metres / 0.3048).toFixed(1)} ft`
      : `${metres.toFixed(1)} m`;
}
export function formatDistance(nauticalMiles: number, units: UnitSystem = 'nautical'): string {
  return units === 'metric'
    ? `${(nauticalMiles * 1.852).toFixed(1)} km`
    : units === 'imperial'
      ? `${(nauticalMiles * 1.15078).toFixed(1)} mi`
      : `${nauticalMiles.toFixed(1)} nm`;
}
export function formatPrice(total: number | null, currency: string | null): string {
  if (total === null) return 'Price unknown';
  if (total === 0) return 'Free';
  if (!currency) return `${total.toFixed(2)} (currency unknown)`;
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(total);
  } catch {
    return `${total.toFixed(2)} ${currency}`;
  }
}
