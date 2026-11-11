import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegionPack } from '@anchor-buddy/domain';
import { createDemoPack } from '@anchor-buddy/domain/testing';
import {
  areaBounds,
  cacheRegion,
  createEmptyRegion,
  providerBase,
  readRegionalData,
  readRegionCache,
  regionContains,
} from './regionalDataCore.ts';

test('new global areas contain no invented nautical evidence and validate', () => {
  const region = createEmptyRegion([16.4, 43.5], 3, 'Split');
  assert.deepEqual(validateRegionPack(region), []);
  assert.equal(region.validation.status, 'unreviewed');
  assert.deepEqual(
    [region.coverage.length, region.depths.length, region.weather.length, region.places.length],
    [0, 0, 0, 0],
  );
  assert.equal(regionContains(region, [16.4, 43.5], 2), true);
  assert.equal(regionContains(region, [-81.1, 24.7], 2), false);
  assert.throws(() => areaBounds([179.99, 0], 3), /date line/);
});
test('live responses reject synthetic/corrupt evidence and secret-bearing API addresses', () => {
  assert.throws(
    () => readRegionalData({ pack: createDemoPack(), providers: [], notices: [], partial: true }),
    /synthetic/i,
  );
  assert.throws(() => providerBase('https://user:password@example.com'), /credentials/);
  assert.throws(() => providerBase('http://example.com'), /HTTPS/);
  assert.equal(providerBase(' http://localhost:3001/ '), 'http://localhost:3001');
});
test('regional evidence cache replaces same region and preserves original expiry dates', () => {
  const pack = createEmptyRegion([16.4, 43.5], 3);
  const data = {
    pack,
    providers: [],
    notices: [],
    partial: true,
    savedAt: new Date().toISOString(),
  };
  assert.deepEqual(readRegionCache([data, { bad: true }, data]), [data]);
  assert.deepEqual(cacheRegion([data], data), [data]);
  assert.equal(cacheRegion([data], data)[0].pack.validUntil, pack.validUntil);
});
test('live cache lookup matches server request precision without expanding reviewed coverage', () => {
  const region = createEmptyRegion([16.44, 43.5116], 1.5);
  region.id = 'live-rounded';
  assert.equal(regionContains(region, [16.439966, 43.511638], 1.5001), true);
  assert.equal(regionContains(region, [16.45, 43.52], 1.5), false);
  region.id = 'reviewed-area';
  assert.equal(regionContains(region, [16.439966, 43.511638], 1.5001), false);
});

test('scientific context survives offline caching without becoming nautical analysis', () => {
  const pack = createEmptyRegion([16.44, 43.49], 3);
  const data = readRegionalData({
    pack,
    providers: [],
    notices: [],
    partial: true,
    savedAt: new Date().toISOString(),
    mapContext: {
      position: [16.44, 43.49],
      notice: 'Point context only',
      depth: { meanM: -42, minM: -44, maxM: -40, datum: 'LAT', interpolated: false },
      sources: [
        {
          id: 'emodnet',
          name: 'EMODnet',
          url: 'https://emodnet.ec.europa.eu',
          retrievedAt: pack.generatedAt,
          validUntil: pack.validUntil,
          attribution: 'EMODnet and originators',
          license: 'CC BY 4.0',
          synthetic: false,
        },
      ],
    },
  });
  const restored = readRegionCache(JSON.parse(JSON.stringify(cacheRegion([], data))))[0];
  assert.deepEqual(restored.mapContext, data.mapContext);
  assert.deepEqual(
    [restored.pack.depths, restored.pack.holdingAreas, restored.pack.coverage],
    [[], [], []],
  );
  assert.throws(
    () => readRegionalData({ ...data, mapContext: { ...data.mapContext, depth: { meanM: '42' } } }),
    /context/,
  );
});
