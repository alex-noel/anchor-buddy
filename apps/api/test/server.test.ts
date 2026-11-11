import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { searchRegion, type RegionPack } from '@anchor-buddy/domain';
import { DEFAULT_VESSEL as TEST_VESSEL, createDefaultSearch } from '@anchor-buddy/domain/testing';
const DEFAULT_VESSEL = { ...TEST_VESSEL, anchor: { ...TEST_VESSEL.anchor, scopeGuidance: null } };
import { DiscoveryService } from '../src/providers/discovery.js';
import { OverpassProvider } from '../src/providers/overpass.js';
import { ProviderError } from '../src/providers/http.js';
import type { PackStore } from '../src/packs.js';

const now = new Date('2026-10-30T12:00:00Z');
async function fixture() {
  // Transport fixtures exist only under test; no runtime demo pack or bypass is involved.
  const discovery = new DiscoveryService(
    {
      places: new OverpassProvider({
        async json<T>(url: string) {
          return {
            data: {
              elements: [
                {
                  type: 'node',
                  id: 1,
                  lon: -81.8,
                  lat: 24.55,
                  tags: { leisure: 'marina', name: 'Test marina' },
                },
              ],
            } as T,
            provenance: {
              providerId: 'test-only',
              url,
              retrievedAt: now.toISOString(),
              validUntil: '2026-10-31T12:00:00Z',
            },
          };
        },
      }),
      wind: {
        async forecast() {
          throw new ProviderError('UPSTREAM_UNAVAILABLE', 'Test offline');
        },
      },
    },
    () => now,
  );
  const result = await discovery.discover({
    center: [-81.8, 24.55],
    radiusNm: 2,
    from: now.toISOString(),
  });
  return {
    discovery,
    pack: result.pack,
    search: { ...createDefaultSearch(now), origin: [-81.8, 24.55] as [number, number] },
  };
}
test('API and local domain engine give identical results for identical snapshots', async (t) => {
  const { discovery, pack, search } = await fixture();
  const app = createApp({ now: () => now, discovery });
  t.after(() => app.close());
  const options = { gridSpacingM: 500, maxGeneratedCandidates: 500 };
  const result = await app.inject({
    method: 'POST',
    url: '/v1/search',
    payload: { regionId: pack.id, vessel: DEFAULT_VESSEL, search, options },
  });
  assert.equal(result.statusCode, 200, result.body);
  assert.deepEqual(
    result.json(),
    searchRegion(pack, DEFAULT_VESSEL, search, options, {
      assessedAt: now.toISOString(),
      purpose: 'current',
    }),
  );
  assert.equal(result.json().simulated, false);
});

test('API search supplies server current time and ignores client historical context', async (t) => {
  const { discovery, pack, search } = await fixture();
  const app = createApp({ now: () => now, discovery });
  t.after(() => app.close());
  const result = await app.inject({
    method: 'POST',
    url: '/v1/search',
    payload: {
      regionId: pack.id,
      vessel: DEFAULT_VESSEL,
      search,
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
      regionId: 'invalid-request',
      vessel: DEFAULT_VESSEL,
      search: createDefaultSearch(now),
      options: { maxGeneratedCandidates: 1e9 },
    },
  });
  assert.equal(excessive.statusCode, 400);
  const guidance = await app.inject({
    method: 'POST',
    url: '/v1/search',
    payload: {
      regionId: 'invalid-request',
      vessel: TEST_VESSEL,
      search: createDefaultSearch(now),
    },
  });
  assert.equal(guidance.statusCode, 400);
  assert.ok(guidance.json().details.some((value: string) => value.includes('Demonstration')));
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
  assert.equal((await app.inject('/v1/demo')).statusCode, 404);
});

test('catalogue and search expose no built-in demo or synthetic source pack', async (t) => {
  const { pack, search } = await fixture();
  const mixed: RegionPack = structuredClone(pack);
  mixed.validation.status = 'reviewed';
  mixed.sources[0]!.synthetic = true;
  const store = {
    regions: async () => [
      {
        id: 'old-demo',
        version: 'v1',
        label: 'Old demo',
        synthetic: true,
        releaseStatus: 'reviewed',
      },
    ],
    assessment: async () => mixed,
  } as unknown as PackStore;
  const app = createApp({ now: () => now, packStore: store });
  t.after(() => app.close());
  assert.deepEqual((await app.inject('/v1/regions')).json().regions, []);
  for (const route of ['/v1/search', '/v1/estimate']) {
    const result = await app.inject({
      method: 'POST',
      url: route,
      payload: {
        regionId: 'old-demo',
        placeId: pack.places[0]!.id,
        vessel: DEFAULT_VESSEL,
        search,
      },
    });
    assert.equal(result.statusCode, 503);
    assert.equal(result.json().error, 'SYNTHETIC_DATA_REJECTED');
  }
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
