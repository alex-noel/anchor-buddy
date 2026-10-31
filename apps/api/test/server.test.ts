import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import {
  createDemoPack,
  DEFAULT_VESSEL,
  createDefaultSearch,
  searchRegion,
} from '@anchor-buddy/domain';

const now = new Date('2026-10-30T12:00:00Z');
test('API and local domain engine give identical results for identical snapshots', async (t) => {
  const app = createApp({ now: () => now });
  t.after(() => app.close());
  const search = createDefaultSearch(now);
  const options = { gridSpacingM: 500, maxGeneratedCandidates: 500 };
  const result = await app.inject({
    method: 'POST',
    url: '/v1/search',
    payload: { regionId: 'florida-keys-demo', vessel: DEFAULT_VESSEL, search, options },
  });
  assert.equal(result.statusCode, 200, result.body);
  assert.deepEqual(
    result.json(),
    searchRegion(createDemoPack(now), DEFAULT_VESSEL, search, options, {
      assessedAt: now.toISOString(),
      purpose: 'current',
    }),
  );
  assert.equal(result.json().simulated, true);
});

test('API search supplies server current time and ignores client historical context', async (t) => {
  const app = createApp({ now: () => now });
  t.after(() => app.close());
  const result = await app.inject({
    method: 'POST',
    url: '/v1/search',
    payload: {
      regionId: 'florida-keys-demo',
      vessel: DEFAULT_VESSEL,
      search: createDefaultSearch(now),
      context: { assessedAt: '2000-01-01T00:00:00Z', purpose: 'historical' },
    },
  });
  assert.equal(result.statusCode, 200, result.body);
  assert.deepEqual(result.json().context, { assessedAt: now.toISOString(), purpose: 'current' });
});

test('invalid search and excessive generation inputs are rejected', async (t) => {
  const app = createApp({ now: () => now });
  t.after(() => app.close());
  const missing = await app.inject({ method: 'POST', url: '/v1/search', payload: {} });
  assert.equal(missing.statusCode, 400);
  const excessive = await app.inject({
    method: 'POST',
    url: '/v1/search',
    payload: {
      regionId: 'florida-keys-demo',
      vessel: DEFAULT_VESSEL,
      search: createDefaultSearch(now),
      options: { maxGeneratedCandidates: 1e9 },
    },
  });
  assert.equal(excessive.statusCode, 400);
});

test('assistant gate never affects core health or exposes a paid fallback', async (t) => {
  const app = createApp({ now: () => now });
  t.after(() => app.close());
  const assistant = await app.inject({
    method: 'POST',
    url: '/v1/assistant',
    payload: { prompt: 'Arm my watch' },
  });
  assert.equal(assistant.statusCode, 503);
  assert.equal(assistant.json().error, 'PARTNER_ACCESS_PENDING');
  assert.equal(assistant.json().billingFallback, false);
  assert.equal((await app.inject('/health')).statusCode, 200);
  const demo = await app.inject('/v1/demo');
  assert.match(demo.json().warning, /Synthetic/);
});

test('development CORS accepts only configured origins, methods and headers', async (t) => {
  const app = createApp();
  t.after(() => app.close());
  const permitted = await app.inject({
    url: '/v1/regions',
    headers: { origin: 'http://localhost:8081' },
  });
  assert.equal(permitted.statusCode, 200);
  assert.equal(permitted.headers['access-control-allow-origin'], 'http://localhost:8081');
  assert.equal(permitted.headers['access-control-allow-credentials'], undefined);
  assert.equal(
    (await app.inject({ url: '/v1/regions', headers: { origin: 'https://untrusted.example' } }))
      .statusCode,
    403,
  );
  const preflight = await app.inject({
    method: 'OPTIONS',
    url: '/v1/search',
    headers: {
      origin: 'http://localhost:8082',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  });
  assert.equal(preflight.statusCode, 204);
  assert.equal(
    (
      await app.inject({
        method: 'OPTIONS',
        url: '/v1/search',
        headers: { origin: 'http://localhost:8082', 'access-control-request-method': 'DELETE' },
      })
    ).statusCode,
    403,
  );
});
