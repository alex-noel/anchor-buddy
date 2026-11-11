/** Explicit integration check against previously downloaded real evidence.
 * Run separately: node --import tsx apps/api/test/cache-e2e.ts
 * No upstream requests, manufactured chart evidence, or writes to the source cache.
 */
import assert from 'node:assert/strict';
import { cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { validateLiveRegionPack, createDefaultSearch, type RegionPack } from '@anchor-buddy/domain';
import { DEFAULT_VESSEL as requestFixture } from '@anchor-buddy/domain/testing';
import { createApp } from '../src/server.js';
import { DiscoveryService } from '../src/providers/discovery.js';
import { JsonDiskCache } from '../src/providers/disk-cache.js';
import { ProviderError } from '../src/providers/http.js';
import type { DiscoveryResult } from '../src/providers/live-types.js';

const source = resolve(process.env.E2E_CACHE_ROOT ?? 'apps/api/data/live-cache/snapshots');
const temporary = await mkdtemp(join(tmpdir(), 'anchor-real-cache-e2e-'));
const cachePath = join(temporary, 'snapshots');
// Vessel dimensions are isolated request inputs, never a real vessel declaration or source data.
const vessel = { ...requestFixture, anchor: { ...requestFixture.anchor, scopeGuidance: null } };
let upstreamAttempts = 0;
const unavailable = async (): Promise<never> => {
  upstreamAttempts++;
  throw new ProviderError('UPSTREAM_UNAVAILABLE', 'E2E-controlled disconnected providers');
};
const observed: unknown[] = [];
try {
  await cp(source, cachePath, { recursive: true });
  const candidates: DiscoveryResult[] = [];
  for (const name of await readdir(source)) {
    if (!name.endsWith('.json')) continue;
    const envelope = JSON.parse(await readFile(join(source, name), 'utf8'));
    const payload = JSON.parse(envelope.payload);
    const value = payload.provenanceVersion === 2 ? payload.value : payload;
    if (
      value?.pack?.places?.length &&
      value.requestedArea &&
      !validateLiveRegionPack(value.pack).length
    )
      candidates.push(value);
  }
  assert.ok(
    candidates.length,
    'A prior real discovery with places is required; run a deliberate live-area request first.',
  );
  for (const original of candidates) {
    const now = new Date();
    const service = () =>
      new DiscoveryService(
        { places: { discover: unavailable }, wind: { forecast: unavailable } },
        () => now,
        new JsonDiskCache(cachePath),
      );
    let app = createApp({ discovery: service(), now: () => now });
    let url = await app.listen({ host: '127.0.0.1', port: 0 });
    const post = async (path: string, body: unknown) => {
      const response = await fetch(url + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      assert.equal(response.status, 200, JSON.stringify(result));
      return result;
    };
    try {
      assert.equal((await fetch(url + '/v1/demo')).status, 404);
      const catalog = (await (await fetch(url + '/v1/regions')).json()) as {
        regions: { synthetic: boolean }[];
      };
      assert.ok(catalog.regions.every((r) => r.synthetic === false));
      const discovered = (await post('/v1/regions/discover', {
        ...original.requestedArea,
        name: original.pack.name,
        timezone: original.pack.timezone,
        from: now.toISOString(),
        until: new Date(now.valueOf() + 24 * 3600000).toISOString(),
      })) as DiscoveryResult;
      assert.deepEqual(validateLiveRegionPack(discovered.pack), []);
      assert.equal(discovered.pack.places.length, original.pack.places.length);
      assert.ok(discovered.providers.some((p) => p.id === 'cached-places'));
      for (const place of discovered.pack.places)
        for (const id of place.sourceIds) {
          assert.deepEqual(
            discovered.pack.sources.find((s) => s.id === id),
            original.pack.sources.find((s) => s.id === id),
          );
        }
      const request = {
        regionId: discovered.pack.id,
        version: discovered.pack.version,
        vessel,
        search: {
          ...createDefaultSearch(original.requestedArea.center, now),
          maxDistanceNm: original.requestedArea.radiusNm,
        },
        options: { maxGeneratedCandidates: 5 },
      };
      const result = (await post('/v1/search', request)) as {
        simulated: boolean;
        assessments: {
          status: string;
          swingRadiusM: number | null;
          requiredRodeM: number | null;
        }[];
      };
      assert.equal(result.simulated, false);
      assert.ok(result.assessments.length);
      assert.ok(result.assessments.every((a) => a.status !== 'passes'));
      assert.ok(
        result.assessments.every((a) => a.swingRadiusM === null && a.requiredRodeM === null),
        'Unreviewed live POIs with no chart depths cannot supply a resolved footprint or rode length',
      );
      const estimate = (await post('/v1/estimate', {
        ...request,
        placeId: discovered.pack.places[0]!.id,
      })) as { estimate: { status: string; total: number | null } };
      assert.equal(estimate.estimate.status, 'unknown');
      // Recreate API and service: no in-memory snapshots survive this restart.
      await app.close();
      now.setTime(now.valueOf() + 2 * 86400000);
      app = createApp({ discovery: service(), now: () => now });
      url = await app.listen({ host: '127.0.0.1', port: 0 });
      request.search = {
        ...createDefaultSearch(original.requestedArea.center, now),
        maxDistanceNm: original.requestedArea.radiusNm,
      };
      const expired = (await post('/v1/search', request)) as {
        simulated: boolean;
        assessments: {
          status: string;
          swingRadiusM: number | null;
          requiredRodeM: number | null;
        }[];
      };
      assert.ok(expired.assessments.length);
      assert.ok(expired.assessments.every((a) => a.status !== 'passes'));
      assert.ok(
        expired.assessments.every((a) => a.swingRadiusM === null && a.requiredRodeM === null),
      );
      observed.push({
        region: original.pack.name,
        places: discovered.pack.places.length,
        assessments: result.assessments.length,
        sourceDatesUnchanged: true,
        disconnectedRefresh: true,
        restartRestore: true,
        expiredCannotPass: true,
        unknownFootprintsRemainNull: true,
      });
    } finally {
      await app.close();
    }
  }
  console.log(
    JSON.stringify(
      {
        realCacheChecks: observed,
        controlledFailureCalls: upstreamAttempts,
        upstreamNetworkRequests: 0,
      },
      null,
      2,
    ),
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
