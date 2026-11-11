import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateRegionPack, searchRegion } from '@anchor-buddy/domain';
import { createDefaultSearch, DEFAULT_VESSEL as TEST_VESSEL } from '@anchor-buddy/domain/testing';
const DEFAULT_VESSEL = { ...TEST_VESSEL, anchor: { ...TEST_VESSEL.anchor, scopeGuidance: null } };
import { JsonDiskCache } from '../src/providers/disk-cache.js';
import { GovernmentHttp, ProviderError } from '../src/providers/http.js';
import { OverpassProvider } from '../src/providers/overpass.js';
import type { HttpTransport } from '../src/providers/contracts.js';
import {
  DiscoveryService,
  validateDiscovery,
  retainMapContext,
} from '../src/providers/discovery.js';
import type { MapContext } from '@anchor-buddy/domain';
import { usesEuropeExtract, RegionalPlacesProvider } from '../src/providers/place-router.js';
import type { DiscoverRequest } from '../src/providers/live-types.js';

const initial = new Date('2026-11-11T12:00:00Z');
const request = (date = initial): DiscoverRequest => ({
  center: [16.44, 43.5],
  radiusNm: 2,
  name: 'Split',
  timezone: 'Europe/Zagreb',
  from: date.toISOString(),
  until: new Date(date.valueOf() + 86400000).toISOString(),
});
const fail = async () => {
  throw new ProviderError('UPSTREAM_UNAVAILABLE', 'Fixture provider outage');
};
function places(date: Date, ids: number[], partial = false) {
  const http: HttpTransport = {
    async json<T>(url: string) {
      return {
        data: {
          elements: ids.map((id) => ({
            type: 'node',
            id,
            lon: 16.44,
            lat: 43.5,
            tags: { leisure: 'marina', name: `Marina ${id}` },
          })),
          ...(partial ? { remark: 'runtime error: query timed out' } : {}),
        } as T,
        provenance: {
          providerId: 'osm-overpass',
          url,
          retrievedAt: date.toISOString(),
          validUntil: new Date(date.valueOf() + 86400000).toISOString(),
        },
      };
    },
  };
  return new OverpassProvider(http);
}

test('persistent discovery survives restart and failed refresh preserves original place source dates', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'anchor-live-cache-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cache = new JsonDiskCache(directory);
  const firstService = new DiscoveryService(
    { places: places(initial, [1, 2]), wind: { forecast: fail } },
    () => initial,
    cache,
  );
  const first = await firstService.discover(request());
  const originalSource = first.pack.sources.find(
    (source) => source.id === first.pack.places[0]!.sourceIds[0],
  )!;
  const later = new Date(initial.valueOf() + 2 * 86400000);
  const restarted = new DiscoveryService(
    { places: { discover: fail }, wind: { forecast: fail } },
    () => later,
    new JsonDiskCache(directory),
  );
  assert.deepEqual(await restarted.restore(first.pack.id, first.pack.version), first.pack);
  const recovered = await restarted.discover(request(later));
  assert.equal(recovered.pack.places.length, 2);
  assert.deepEqual(
    recovered.pack.sources.find((source) => source.id === originalSource.id),
    originalSource,
  );
  assert.ok(Date.parse(originalSource.validUntil) < later.valueOf());
  assert.ok(
    recovered.providers.some(
      (provider) => provider.id === 'cached-places' && provider.status === 'partial',
    ),
  );
  assert.deepEqual(validateRegionPack(recovered.pack), []);
  assert.equal(recovered.pack.timezone, 'Europe/Zagreb');
  assert.equal(recovered.pack.validation.status, 'unreviewed');
  const assessed = searchRegion(
    recovered.pack,
    DEFAULT_VESSEL,
    { ...createDefaultSearch(later), origin: request().center, maxDistanceNm: 2 },
    undefined,
    { assessedAt: later.toISOString(), purpose: 'current' },
  );
  assert.ok(assessed.assessments.every((item) => item.status !== 'passes'));
});

test('partial refresh adds fresh places while preserving missing cached records with distinct dated sources', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'anchor-partial-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cache = new JsonDiskCache(directory);
  const first = await new DiscoveryService(
    { places: places(initial, [1, 2]), wind: { forecast: fail } },
    () => initial,
    cache,
  ).discover(request());
  const later = new Date(initial.valueOf() + 3600000);
  const service = new DiscoveryService(
    { places: places(later, [1, 3], true), wind: { forecast: fail } },
    () => later,
    cache,
  );
  const update = await service.discover(request(later));
  assert.deepEqual(update.pack.places.map((place) => place.id).sort(), [
    'osm-node-1',
    'osm-node-2',
    'osm-node-3',
  ]);
  const old = update.pack.places.find((place) => place.id === 'osm-node-2')!,
    fresh = update.pack.places.find((place) => place.id === 'osm-node-3')!;
  assert.notEqual(old.sourceIds[0], fresh.sourceIds[0]);
  assert.equal(
    update.pack.sources.find((source) => source.id === old.sourceIds[0])!.retrievedAt,
    initial.toISOString(),
  );
  assert.equal(
    update.pack.sources.find((source) => source.id === fresh.sourceIds[0])!.retrievedAt,
    later.toISOString(),
  );
  assert.deepEqual(await service.restore(first.pack.id, first.pack.version), first.pack);
});

test('a complete successful empty response can remove outdated cached places', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'anchor-empty-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cache = new JsonDiskCache(directory);
  await new DiscoveryService(
    { places: places(initial, [1]), wind: { forecast: fail } },
    () => initial,
    cache,
  ).discover(request());
  const later = new Date(initial.valueOf() + 86400000);
  const result = await new DiscoveryService(
    { places: places(later, []), wind: { forecast: fail } },
    () => later,
    cache,
  ).discover(request(later));
  assert.equal(result.pack.places.length, 0);
  assert.ok(!result.providers.some((provider) => provider.id === 'cached-places'));
});

test('synthetic or unclassified cached sources cannot be restored or retained after a failed refresh', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'anchor-reject-synthetic-cache-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cache = new JsonDiskCache(directory);
  const first = await new DiscoveryService(
    { places: places(initial, [1]), wind: { forecast: fail } },
    () => initial,
    cache,
  ).discover(request());
  for (const synthetic of [true, undefined]) {
    const mixed = structuredClone(first);
    mixed.pack.sources[0]!.synthetic = synthetic;
    await cache.write(`pack:${first.pack.id}/${first.pack.version}`, {
      provenanceVersion: 2,
      value: mixed.pack,
    });
    await cache.write(`latest:${first.pack.id}`, { provenanceVersion: 2, value: mixed });
    const restarted = new DiscoveryService(
      { places: { discover: fail }, wind: { forecast: fail } },
      () => initial,
      cache,
    );
    assert.equal(await restarted.restore(first.pack.id, first.pack.version), undefined);
    const result = await restarted.discover(request());
    assert.equal(result.pack.places.length, 0);
    assert.equal(result.pack.sources.length, 0);
    assert.ok(!result.providers.some((provider) => provider.id === 'cached-places'));
  }
});

test('disk cache rejects corruption, preserves previous complete entry after failed write and remains bounded', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'anchor-integrity-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cache = new JsonDiskCache(directory, { entries: 2, totalBytes: 2000, entryBytes: 800 });
  await cache.write('current', { value: 1 });
  await assert.rejects(cache.write('current', { value: 'x'.repeat(1000) }), /limit/);
  assert.deepEqual(await cache.read('current'), { value: 1 });
  const [name] = await readdir(directory);
  await writeFile(join(directory, name!), '{"schema":1,"payload":"{}","sha256":"wrong"}');
  assert.equal(await cache.read('current'), undefined);
  await cache.write('b', {});
  await cache.write('c', {});
  assert.equal((await readdir(directory)).filter((name) => name.endsWith('.json')).length, 2);
});

test('HTTP disk cache honors minimum product update interval across provider restart', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'anchor-http-cache-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let clock = initial.valueOf(),
    count = 0;
  const network = (async () => {
    count++;
    return new Response('{"live":true}', { headers: { 'cache-control': 'max-age=60' } });
  }) as typeof fetch;
  const options = {
    providerId: 'met-test',
    userAgent: 'fixture',
    hosts: ['fixture.example'],
    fetch: network,
    now: () => clock,
    minIntervalMs: 0,
    minimumCacheSeconds: 10800,
    diskCache: new JsonDiskCache(directory),
  };
  const first = await new GovernmentHttp(options).json('https://fixture.example/forecast');
  assert.equal(
    first.provenance.validUntil,
    new Date(initial.valueOf() + 60000).toISOString(),
    'Upstream expiry must not be extended to the three-hour requery limit',
  );
  clock += 3600000;
  const second = await new GovernmentHttp({
    ...options,
    diskCache: new JsonDiskCache(directory),
  }).json('https://fixture.example/forecast');
  assert.equal(count, 1);
  assert.deepEqual(second, first);
  assert.ok(
    Date.parse(second.provenance.validUntil) < clock,
    'The held response stays visibly expired',
  );
  clock += 3 * 3600000;
  await new GovernmentHttp(options).json('https://fixture.example/forecast');
  assert.equal(count, 2);
});

test('provider routing uses actual Europe extract outline, with no retry chain on provider failure', async () => {
  assert.equal(usesEuropeExtract(request()), true);
  assert.equal(usesEuropeExtract({ ...request(), center: [103.84, 1.25] }), false);
  assert.equal(usesEuropeExtract({ ...request(), center: [10.2, 36.8] }), false);
  let globalCalls = 0;
  const router = new RegionalPlacesProvider(
    {
      discover: async (input) => {
        globalCalls++;
        return places(initial, [1]).discover(input);
      },
    },
    { discover: fail },
  );
  await assert.rejects(router.discover(request()), /outage/);
  assert.equal(globalCalls, 0);
});

test('discovery timezone metadata is validated without changing explicit stay instants', () => {
  const validated = validateDiscovery(request(), initial);
  assert.equal(validated.timezone, 'Europe/Zagreb');
  assert.equal(validated.from, initial.toISOString());
  assert.throws(
    () => validateDiscovery({ ...request(), timezone: 'Europe/Invented' }, initial),
    /IANA/,
  );
});

test('partial map-context failures preserve only failed components and their original source dates', () => {
  const source = (id: string, date: string) => ({
    id,
    name: id,
    url: 'https://fixture.example/context',
    retrievedAt: date,
    validUntil: '2026-11-12T00:00:00Z',
    license: 'fixture',
    attribution: 'fixture',
    synthetic: false,
  });
  const old: MapContext = {
    position: request().center,
    notice: 'Point model context.',
    depth: { meanM: -10, minM: -12, maxM: -8, datum: 'LAT', interpolated: false },
    seabed: {
      label: 'Mud',
      scale: 100000,
      originator: 'fixture',
      reference: 'old-vintage',
      notes: '',
    },
    sources: [
      source('emodnet-dtm-context', initial.toISOString()),
      source('emodnet-seabed-context', initial.toISOString()),
    ],
  };
  const fresh: MapContext = {
    position: request().center,
    notice: 'Point model context.',
    depth: { meanM: -11, minM: -13, maxM: -9, datum: 'LAT', interpolated: false },
    sources: [source('emodnet-dtm-context', '2026-11-11T13:00:00Z')],
  };
  const merged = retainMapContext(old, fresh, ['seabed'], request().center);
  assert.equal(merged.context!.depth!.meanM, -11);
  assert.equal(merged.context!.seabed!.label, 'Mud');
  assert.equal(
    merged.context!.sources.find((source) => source.id === 'emodnet-seabed-context')!.retrievedAt,
    initial.toISOString(),
  );
  assert.match(merged.context!.notice, /Cached seabed/);
  assert.equal(
    retainMapContext(old, fresh, [], request().center).context!.seabed,
    undefined,
    'A successful empty seabed response must not resurrect old values',
  );
  assert.equal(retainMapContext(old, undefined, [], request().center).context, undefined);
  assert.equal(
    retainMapContext(old, fresh, ['seabed'], [103.84, 1.25]).context!.seabed,
    undefined,
    'A different position cannot inherit European context',
  );
});
