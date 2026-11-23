import test from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_CONVERSIONS, unitConversionTolerance } from '@anchor-buddy/domain';
import { depth, distance, money, wind, direction } from './units';
test('unknown depth/price is never rendered as zero or free', () => {
  assert.equal(depth(null), 'Unknown');
  assert.equal(money(null), 'Price unknown');
  assert.equal(money(0), 'Price unknown');
});

test('money uses explicit fee status, valid currency, and currency display precision', () => {
  assert.equal(money(0, 'USD', 'free'), 'Free');
  assert.equal(money(0, 'USD', 'unknown'), 'Price unknown');
  assert.equal(
    money(0, 'USD', 'paid'),
    new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(0),
  );
  assert.equal(money(25, null, 'paid'), '25 (currency unknown)');
  assert.equal(money(25, 'US?', 'paid'), '25 (currency unknown)');
  assert.equal(money(Number.POSITIVE_INFINITY, 'USD', 'paid'), 'Price unknown');

  for (const [currency, digits] of [
    ['JPY', 0],
    ['USD', 2],
    ['KWD', 3],
  ] as const) {
    const formatter = new Intl.NumberFormat('en', { style: 'currency', currency });
    assert.equal(formatter.resolvedOptions().maximumFractionDigits, digits);
    assert.equal(money(1234.5678, currency, 'paid'), formatter.format(1234.5678));
  }
});
test('unit selection converts underlying SI/nautical values', () => {
  assert.equal(depth(1, 'imperial'), '3.3 ft');
  assert.equal(distance(1, 'metric'), '1.9 km');
  assert.equal(wind(10, 'metric'), '19 km/h');
  assert.equal(direction(360), 'N');
});

test('imperial depth, distance and wind use frozen exact conversion factors', () => {
  const feetPerMetre = 1 / CANONICAL_CONVERSIONS.metresPerFoot;
  const milesPerNauticalMile =
    CANONICAL_CONVERSIONS.metresPerNauticalMile / CANONICAL_CONVERSIONS.metresPerStatuteMile;
  assert.equal(depth(1, 'imperial'), `${feetPerMetre.toFixed(1)} ft`);
  assert.equal(distance(1, 'imperial'), `${milesPerNauticalMile.toFixed(1)} mi`);
  assert.equal(wind(1, 'imperial', 6), milesPerNauticalMile.toFixed(6) + ' mph');
  assert.ok(
    Math.abs(1 / feetPerMetre - CANONICAL_CONVERSIONS.metresPerFoot) <=
      unitConversionTolerance(CANONICAL_CONVERSIONS.metresPerFoot),
  );
});
