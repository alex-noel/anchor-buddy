import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice } from '../src/format.ts';

test('price formatting never invents USD or converts an unknown zero to Free', () => {
  assert.equal(formatPrice(12), '12 (currency unknown)');
  assert.equal(formatPrice(0, 'USD'), 'Price unknown');
  assert.equal(formatPrice(0, 'USD', 'unknown'), 'Price unknown');
  assert.equal(formatPrice(0, 'USD', 'free'), 'Free');
  assert.equal(formatPrice(0, 'USD', 'paid'), '$0.00');
});

test('valid currencies use Intl display precision without claiming source precision', () => {
  for (const [currency, digits] of [
    ['JPY', 0],
    ['USD', 2],
    ['KWD', 3],
  ] as const) {
    const formatter = new Intl.NumberFormat('en', { style: 'currency', currency });
    assert.equal(formatter.resolvedOptions().maximumFractionDigits, digits);
    assert.equal(formatPrice(1234.5678, currency, 'paid'), formatter.format(1234.5678));
  }
});

test('malformed currencies and non-finite totals produce safe explicit fallback text', () => {
  assert.equal(formatPrice(12, 'US?', 'paid'), '12 (currency unknown)');
  assert.equal(formatPrice(12, '', 'paid'), '12 (currency unknown)');
  assert.equal(formatPrice(Number.NaN, 'USD', 'paid'), 'Price unknown');
  assert.equal(formatPrice(Number.POSITIVE_INFINITY, 'USD', 'paid'), 'Price unknown');
});
