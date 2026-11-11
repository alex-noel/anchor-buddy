import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/server.js';
import { PROVIDERS, type ProviderCapabilityReport } from '../src/providers/contracts.js';

test('provider HTTP report preserves legacy IDs, routes products and keeps configuration private without upstream work', async (t) => {
  const sentinel = ['fixture', 'private', 'provider', 'value'].join('_');
  const changes = {
    OPEN_METEO_MODE: 'commercial',
    OPEN_METEO_API_KEY: sentinel,
    OPEN_METEO_MARINE_URL: 'https://customer-marine-api.open-meteo.com/v1/marine',
    NOMINATIM_URL: 'https://geocoder.example.test/' + sentinel,
    OVERPASS_URL: 'https://overpass.example.test/' + sentinel,
    OVERPASS_EUROPE_URL: 'https://europe.example.test/' + sentinel,
  };
  const original = Object.fromEntries(Object.keys(changes).map((key) => [key, process.env[key]]));
  Object.assign(process.env, changes);
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    throw new Error('Capability reporting must not fetch provider data');
  });
  const app = createApp();
  t.after(() => app.close());
  const get = async (query = '') => {
    const response = await app.inject('/v1/providers' + query);
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.body.includes(sentinel), false);
    assert.equal(response.body.includes('example.test'), false);
    const report = response.json<ProviderCapabilityReport>();
    assert.deepEqual(report.providers.map(({ id }) => id), PROVIDERS.map(({ id }) => id));
    assert.equal(report.capabilities.schemaVersion, 2);
    return report.capabilities.products;
  };
  const all = await get();
  assert.equal(all.find(({ productId }) => productId === 'met-locationforecast-wind')?.statusBasis, 'configuration');
  assert.deepEqual(all.find(({ productId }) => productId === 'open-meteo-marine-waves')?.authentication, {
    mode: 'api-key', credential: 'configured',
  });
  const split = await get('?latitude=43.51&longitude=16.44&radiusNm=2');
  assert.equal(split.find(({ productId }) => productId === 'osm-overpass-europe')?.routing, 'eligible');
  assert.equal(split.find(({ productId }) => productId === 'osm-overpass-global')?.routing, 'not-selected');
  assert.equal(split.find(({ productId }) => productId === 'emodnet-dtm-context')?.role, 'scientific-context');
  const singapore = await get('?latitude=1.28&longitude=103.86&radiusNm=3');
  assert.equal(singapore.find(({ productId }) => productId === 'emodnet-dtm-context')?.status, 'not-covered');
  assert.equal(singapore.find(({ productId }) => productId === 'osm-overpass-global')?.routing, 'eligible');
  for (const query of ['?latitude=1', '?latitude=85.1&longitude=0', '?latitude=1&longitude=0&radiusNm=26', '?latitude=1&latitude=2&longitude=0']) {
    const invalid = await app.inject('/v1/providers' + query);
    assert.equal(invalid.statusCode, 400);
    assert.deepEqual(invalid.json(), { error: 'INVALID_PROVIDER_AREA' });
  }
  assert.equal((await app.inject('/health')).json().nauticalRelease, 'review-required');
  assert.equal(requests, 0);
});
