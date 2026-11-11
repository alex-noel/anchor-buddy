import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PbfWriter } from 'pbf';
import {
  createWorldMapCache,
  estimateMapArea,
  mapTiles,
  validateMapManifest,
  validateTileTemplate,
  onlineWorldMapStyle,
  cachedWorldMapStyle,
  mapAreaReadiness,
  tileGlyphRanges,
  mapLabelText,
  WORLD_MAP_ATTRIBUTION,
  type MapCacheIO,
  type MapAreaManifest,
} from './worldMapsCore.ts';

const template = 'https://tiles.openfreemap.org/planet/20261101_080013_pt/{z}/{x}/{y}.pbf';
const input = {
  name: 'Harbour map',
  bounds: [-81.11, 24.7, -81.1, 24.71] as [number, number, number, number],
  maxZoom: 1,
};
function memoryCache(
  options: { failAt?: number; abort?: AbortController; corrupt?: boolean } = {},
) {
  const manifests = new Map<string, MapAreaManifest>();
  const files = new Map<string, Uint8Array>();
  let requests = 0;
  const io: MapCacheIO = {
    list: async () => [...manifests.values()].map((m) => m.area),
    readManifest: async (id) => (manifests.has(id) ? structuredClone(manifests.get(id)!) : null),
    saveManifest: async (manifest) => {
      manifests.set(manifest.area.id, structuredClone(manifest));
    },
    read: async (id, path) => files.get(id + '/' + path) ?? null,
    write: async (id, path, bytes) => {
      files.set(id + '/' + path, new Uint8Array(bytes));
    },
    remove: async (id) => {
      manifests.delete(id);
      for (const key of files.keys()) if (key.startsWith(id + '/')) files.delete(key);
    },
    hash: async (bytes) => createHash('sha256').update(bytes).digest('hex'),
    fetch: async (url) => {
      if (url.endsWith('/planet'))
        return new TextEncoder().encode(JSON.stringify({ tiles: [template] }));
      requests++;
      if (requests === options.failAt) throw new Error('HTTP 429');
      if (options.abort && requests === 1) options.abort.abort();
      return url.includes('/fonts/') ? new Uint8Array([1, 2, 3]) : new Uint8Array();
    },
  };
  return { cache: createWorldMapCache(io), manifests, files, io, requests: () => requests };
}

test('map estimate bounds tile count and adaptively reduces detail for larger areas', () => {
  assert.throws(() => estimateMapArea({ bounds: [-181, 0, 0, 1] }), /valid map area/);
  assert.throws(() => estimateMapArea({ bounds: [-180, -85, 180, 85], maxZoom: 14 }), /3,000/);
  const estimate = estimateMapArea({ bounds: [-180, -85, 180, 85] });
  assert.ok(estimate.tileCount <= 3000);
  assert.ok(estimate.estimatedBytes <= 50_000_000);
  assert.ok(estimate.maxZoom < 14);
});
test('dateline tile enumeration keeps both sides without duplicating parent tiles', () => {
  const tiles = mapTiles([179, -1, -179, 1], 2);
  assert.equal(new Set(tiles.map((t) => t.path)).size, tiles.length);
  assert.deepEqual([...new Set(tiles.filter((t) => t.z === 2).map((t) => t.x))].sort(), [0, 3]);
});
test('only a versioned OpenFreeMap tile template is accepted', () => {
  assert.equal(validateTileTemplate(template), template);
  assert.throws(() => validateTileTemplate('https://tile.openstreetmap.org/{z}/{x}/{y}.png'));
  assert.throws(() =>
    validateTileTemplate('https://tiles.openfreemap.org.evil.test/planet/a/{z}/{x}/{y}.pbf'),
  );
});
test('explicit map download stores checksums and glyphs before becoming complete', async () => {
  const { cache, manifests } = memoryCache();
  const states: string[] = [];
  const area = await cache.downloadMapArea(input, (p) => states.push(p.status));
  assert.equal(area.status, 'complete');
  assert.equal(area.completedTiles, area.tileCount);
  assert.ok(states.includes('partial'));
  assert.equal(states.at(-1), 'complete');
  const manifest = manifests.get(area.id)!;
  validateMapManifest(manifest);
  assert.ok(manifest.resources['glyphs/0-255.pbf']);
  assert.ok(Object.values(manifest.resources).every((r) => /^[a-f0-9]{64}$/.test(r.sha256)));
  await cache.deleteMapArea(area.id);
  assert.equal((await cache.listMapAreas()).length, 0);
});
test('HTTP errors retain partial progress; explicit resume fetches only missing resources', async () => {
  const memory = memoryCache({ failAt: 2 });
  await assert.rejects(memory.cache.downloadMapArea(input), /429/);
  const [partial] = await memory.cache.listMapAreas();
  assert.equal(partial!.status, 'partial');
  assert.equal(partial!.completedTiles, 1);
  const resumed = await memory.cache.downloadMapArea({ ...input, id: partial!.id });
  assert.equal(resumed.status, 'complete');
  assert.equal(memory.requests(), 4);
});
test('cancelled map stays partial and can resume', async () => {
  const abort = new AbortController();
  const memory = memoryCache({ abort });
  await assert.rejects(memory.cache.downloadMapArea(input, undefined, abort.signal));
  const [partial] = await memory.cache.listMapAreas();
  assert.equal(partial!.status, 'partial');
  assert.match(partial!.error!, /paused/);
  const resumed = await memory.cache.downloadMapArea({ ...input, id: partial!.id });
  assert.equal(resumed.status, 'complete');
});
test('failed resource writes do not count as completed; resume repairs missing and corrupt data', async () => {
  const memory = memoryCache();
  const originalWrite = memory.io.write;
  let fail = true;
  memory.io.write = async (id, path, bytes) => {
    if (path.includes('tiles/0/') && fail) {
      fail = false;
      throw new Error('Storage full');
    }
    await originalWrite(id, path, bytes);
  };
  await assert.rejects(memory.cache.downloadMapArea(input), /Storage full/);
  const [partial] = await memory.cache.listMapAreas();
  assert.equal(partial!.completedTiles, 0);
  assert.equal(partial!.usableZoom, undefined);
  const completed = await memory.cache.downloadMapArea({ ...input, id: partial!.id });
  const tilePath = Object.keys(memory.manifests.get(completed.id)!.resources).find((path) =>
    path.startsWith('tiles/'),
  )!;
  memory.files.set(completed.id + '/' + tilePath, new Uint8Array([123]));
  const requestsBefore = memory.requests();
  const repaired = await memory.cache.downloadMapArea({ ...input, id: completed.id });
  assert.equal(repaired.status, 'complete');
  assert.equal(memory.requests(), requestsBefore + 1);
  memory.files.delete(completed.id + '/glyphs/0-255.pbf');
  const verified = await memory.cache.verifyMapArea(completed.id);
  assert.equal(verified!.status, 'partial');
  const repairedAgain = await memory.cache.downloadMapArea({ ...input, id: completed.id });
  assert.equal(repairedAgain.status, 'complete');
});

function labelTile(name: string, latin: string) {
  const writer = new PbfWriter();
  writer.writeMessage(
    3,
    (_, layer) => {
      layer.writeStringField(1, 'place');
      layer.writeVarintField(15, 2);
      layer.writeVarintField(5, 4096);
      for (const key of ['name', 'name:latin']) layer.writeStringField(3, key);
      for (const value of [name, latin])
        layer.writeMessage(4, (text, pbf) => pbf.writeStringField(1, text), value);
      layer.writeMessage(
        2,
        (_, feature) => {
          feature.writePackedVarint(2, [0, 0, 1, 1]);
          feature.writeVarintField(3, 1);
          feature.writePackedVarint(4, [9, 0, 0]);
        },
        null,
      );
    },
    null,
  );
  return writer.finish();
}

test('local Japanese, Chinese, Thai and European names drive the saved font ranges', () => {
  for (const [name, latin] of [
    ['東京湾', 'Tokyo Bay'],
    ['上海', 'Shanghai'],
    ['ภูเก็ต', 'Phuket'],
    ['İstanbul', 'Istanbul'],
    ['Αθήνα', 'Athens'],
  ]) {
    assert.equal(mapLabelText({ name, 'name:latin': latin }), name);
    const ranges = tileGlyphRanges(labelTile(name!, latin!));
    for (const character of name!) {
      const start = Math.floor(character.codePointAt(0)! / 256) * 256;
      assert.ok(ranges.has(`${start}-${start + 255}`), `${name}: missing local glyph range`);
    }
  }
});

test('coarse map and its local labels are usable before a finer download fails', async () => {
  const memory = memoryCache();
  const original = memory.io.fetch;
  const order: string[] = [];
  memory.io.fetch = async (url, signal) => {
    order.push(url);
    if (url.includes('/planet/') && url.endsWith('/0/0/0.pbf'))
      return labelTile('東京湾', 'Tokyo Bay');
    if (url.includes('/planet/') && !url.endsWith('/0/0/0.pbf'))
      throw new Error('Network disconnected');
    return original(url, signal);
  };
  const revisions: (number | undefined)[] = [];
  let latest: number | undefined;
  memory.cache.subscribe(() => revisions.push(latest));
  await assert.rejects(
    memory.cache.downloadMapArea({ ...input, bounds: [139.7, 35.4, 139.8, 35.5] }, (area) => {
      latest = area.usableZoom;
    }),
    /disconnected/,
  );
  const [partial] = await memory.cache.listMapAreas();
  assert.equal(partial!.status, 'partial');
  assert.equal(partial!.usableZoom, 0);
  assert.equal(partial!.attribution, WORLD_MAP_ATTRIBUTION);
  assert.ok(revisions.includes(0));
  const firstDetail = order.findIndex(
    (url) => url.includes('/planet/') && !url.endsWith('/0/0/0.pbf'),
  );
  assert.ok(
    order.slice(0, firstDetail).some((url) => url.includes('/fonts/') && !url.includes('0-255')),
  );
  const manifest = memory.manifests.get(partial!.id)!;
  assert.equal(mapAreaReadiness(manifest).usableZoom, 0);
  // A missing required label range removes readiness rather than claiming completeness.
  const glyph = Object.keys(manifest.resources).find(
    (path) => path.startsWith('glyphs/') && !path.includes('0-255'),
  )!;
  memory.files.delete(partial!.id + '/' + glyph);
  assert.equal((await memory.cache.verifyMapArea(partial!.id))!.usableZoom, undefined);
});

test('partial cached sources sit below live detail and readiness cannot be forged', async () => {
  const memory = memoryCache();
  const complete = await memory.cache.downloadMapArea(input);
  const manifest = structuredClone(memory.manifests.get(complete.id)!);
  const detail = Object.keys(manifest.resources).find((path) => path.startsWith('tiles/1/'))!;
  delete manifest.resources[detail];
  manifest.area.completedTiles--;
  manifest.area.status = 'partial';
  manifest.area.usableZoom = 0;
  validateMapManifest(manifest);
  const partial = mapAreaReadiness(manifest);
  const style = cachedWorldMapStyle(
    true,
    [{ area: partial, tiles: 'cache://tiles/{z}/{x}/{y}.pbf' }],
    'cache://fonts/{range}.pbf',
  )!;
  const sources = style.sources as Record<string, any>;
  assert.equal(sources[`saved-${partial.id}-z0`].maxzoom, 0);
  assert.ok(sources.world);
  const layers = style.layers as { id: string; source?: string }[];
  assert.ok(
    layers.findIndex((layer) => layer.id === 'world-water') >
      layers.findIndex((layer) => layer.id === `saved-${partial.id}-z0-water`),
  );
  assert.ok(
    layers.findIndex((layer) => layer.id === 'world-places') >
      layers.findIndex((layer) => layer.id === `saved-${partial.id}-z0-places`),
  );
  const offline = cachedWorldMapStyle(
    false,
    [{ area: partial, tiles: 'cache://tiles/{z}/{x}/{y}.pbf' }],
    'cache://fonts/{range}.pbf',
  )!;
  assert.equal((offline.sources as any).world, undefined);
  assert.equal(cachedWorldMapStyle(false, [], 'cache://fonts'), null);
  manifest.area.usableZoom = 1;
  assert.throws(() => validateMapManifest(manifest), /readiness/);
});

test('legacy saved areas retain their cached Latin glyph policy while new areas use local names', async () => {
  const memory = memoryCache();
  const saved = await memory.cache.downloadMapArea(input);
  assert.equal(saved.labelPolicy, 'local');
  const legacy = structuredClone(memory.manifests.get(saved.id)!);
  delete legacy.area.labelPolicy;
  delete legacy.area.usableZoom;
  for (const resource of Object.values(legacy.resources)) delete resource.glyphRanges;
  validateMapManifest(legacy);
  const area = mapAreaReadiness(legacy);
  assert.equal(area.usableZoom, saved.maxZoom);
  assert.equal(area.labelPolicy, 'latin');
  const style = cachedWorldMapStyle(
    true,
    [{ area, tiles: 'cache://tiles/{z}/{x}/{y}.pbf' }],
    'cache://glyphs',
  )!;
  const layers = style.layers as any[];
  assert.deepEqual(
    layers.find((layer) => layer.id === `saved-${area.id}-z${area.usableZoom}-places`).layout[
      'text-field'
    ][1],
    ['get', 'name:latin'],
  );
  assert.deepEqual(layers.find((layer) => layer.id === 'world-places').layout['text-field'][1], [
    'get',
    'name',
  ]);
  memory.manifests.set(saved.id, legacy);
  assert.equal((await memory.cache.listMapAreas())[0]!.labelPolicy, 'latin');
});
test('only one area downloads at once and cancel by id keeps a resumable partial record', async () => {
  const memory = memoryCache();
  let release: (() => void) | undefined;
  const originalFetch = memory.io.fetch;
  memory.io.fetch = async (url, signal) => {
    if (url.includes('/planet/'))
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    return originalFetch(url, signal);
  };
  let id = '';
  const pending = memory.cache.downloadMapArea({ ...input, maxZoom: 0 }, (area) => {
    id = area.id;
  });
  while (!release) await new Promise((resolve) => setTimeout(resolve, 0));
  await assert.rejects(memory.cache.downloadMapArea(input), /One map area/);
  memory.cache.cancelMapArea(id);
  release();
  await assert.rejects(pending, /cancelled/);
  assert.equal((await memory.cache.listMapAreas())[0]!.status, 'partial');
});
test('parallel responses cannot reserve more than the 50 MB area cap', async () => {
  const memory = memoryCache();
  // A valid protobuf unknown field fills the tile without fabricating display features.
  const payload = new Uint8Array(8_000_000);
  payload[0] = 18;
  let length = payload.byteLength - 5,
    offset = 1;
  while (length >= 128) {
    payload[offset++] = (length & 127) | 128;
    length >>>= 7;
  }
  payload[offset] = length;
  const originalFetch = memory.io.fetch;
  memory.io.fetch = async (url, signal) =>
    url.includes('/planet/') ? payload : originalFetch(url, signal);
  await assert.rejects(memory.cache.downloadMapArea({ ...input, maxZoom: 8 }), /50 MB/);
  const [partial] = await memory.cache.listMapAreas();
  assert.equal(partial!.status, 'partial');
  assert.ok(partial!.bytes <= 50_000_000);
  validateMapManifest(memory.manifests.get(partial!.id));
});
test('manifest validation rejects false completeness and altered size totals', async () => {
  const { cache, manifests } = memoryCache();
  const area = await cache.downloadMapArea(input);
  const m = structuredClone(manifests.get(area.id)!);
  m.resources = {};
  assert.throws(() => validateMapManifest(m), /counts|incomplete/);
  const n = structuredClone(manifests.get(area.id)!);
  n.area.bytes++;
  assert.throws(() => validateMapManifest(n), /counts/);
});
test('online display uses attributed global vector maps without analysis claims', () => {
  const style = onlineWorldMapStyle();
  assert.equal((style.sources as any).world.url, 'https://tiles.openfreemap.org/planet');
  assert.equal((style.sources as any).world.attribution, WORLD_MAP_ATTRIBUTION);
  assert.equal(JSON.stringify(style).includes('tile.openstreetmap.org'), false);
});
