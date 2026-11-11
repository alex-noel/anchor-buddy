import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_REGIONS, searchMapRegions } from './mapRegions';
import { areaBounds } from './regionalDataCore';
import { estimateMapArea, MAX_MAP_BYTES, MAX_MAP_TILES } from './worldMapsCore';

test('every coastal preset fits live discovery and a bounded offline map download', () => {
  assert.equal(new Set(MAP_REGIONS.map((r) => r.id)).size, MAP_REGIONS.length);
  for (const region of MAP_REGIONS) {
    assert.ok(region.radiusNm > 0 && region.radiusNm <= 25, region.name);
    const bounds = areaBounds(region.center, region.radiusNm);
    const estimate = estimateMapArea({ bounds });
    assert.ok(estimate.tileCount <= MAX_MAP_TILES, region.name);
    assert.ok(estimate.estimatedBytes <= MAX_MAP_BYTES, region.name);
    assert.ok(estimate.maxZoom >= 10, region.name);
    assert.doesNotThrow(
      () => new Intl.DateTimeFormat('en', { timeZone: region.timezone }).format(0),
      region.name,
    );
    assert.deepEqual(Object.keys(region).sort(), [
      'center',
      'continent',
      'id',
      'name',
      'radiusNm',
      'timezone',
    ]);
  }
});

test('regional lookup works locally with diacritics, country names and continent filters', () => {
  assert.equal(searchMapRegions('cote d azur')[0]?.id, 'cote-azur');
  assert.equal(searchMapRegions('turkiye')[0]?.id, 'turkish-aegean');
  assert.deepEqual(
    searchMapRegions('JAPAN', 'Asia').map((r) => r.id),
    ['japan-seto', 'japan-okinawa'],
  );
  assert.deepEqual(searchMapRegions('Japan', 'Europe'), []);
  assert.equal(searchMapRegions('  Split croatia  ')[0]?.id, 'adriatic-croatia');
  assert.deepEqual(searchMapRegions('missing location'), []);
  assert.ok(searchMapRegions('', 'Europe').length >= 10);
  assert.ok(searchMapRegions('', 'Asia').length >= 10);
});
