import test from 'node:test';
import assert from 'node:assert/strict';
import { depth, distance, money, wind, direction } from './units';
test('unknown depth/price is never rendered as zero or free', () => {
  assert.equal(depth(null), 'Unknown');
  assert.equal(money(null), 'Price unknown');
  assert.equal(money(0), 'Free');
});
test('unit selection converts underlying SI/nautical values', () => {
  assert.equal(depth(1, 'imperial'), '3.3 ft');
  assert.equal(distance(1, 'metric'), '1.9 km');
  assert.equal(wind(10, 'metric'), '19 km/h');
  assert.equal(direction(360), 'N');
});
