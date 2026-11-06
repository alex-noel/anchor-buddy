import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { prepareWebOffline } from './prepare-web-offline.mjs';

test('returning an exported origin to Metro releases only its application shell', async () => {
  const handlers = new Map();
  const removed = [],
    navigated = [];
  let skipped = false,
    unregistered = false;
  const client = (url) => ({ url, navigate: async (target) => navigated.push(target) });
  const source = await readFile(
    new URL('../apps/mobile/public/anchorbuddy-sw.js', import.meta.url),
    'utf8',
  );
  vm.runInNewContext(source, {
    URL,
    caches: {
      keys: async () => [
        'anchorbuddy-app-shell-v1-old',
        'anchorbuddy-world-map-v1-area',
        'other-app',
      ],
      delete: async (key) => removed.push(key),
    },
    self: {
      location: { origin: 'http://localhost:8081' },
      addEventListener: (name, handler) => handlers.set(name, handler),
      skipWaiting: async () => {
        skipped = true;
      },
      registration: {
        unregister: async () => {
          unregistered = true;
        },
      },
      clients: {
        matchAll: async () => [
          client('http://localhost:8081/?saved=true'),
          client('http://localhost:8081/unrelated'),
          client('http://localhost:8094/'),
        ],
      },
    },
  });
  for (const event of ['install', 'activate']) {
    let work;
    handlers.get(event)({
      waitUntil: (promise) => {
        work = promise;
      },
    });
    await work;
  }
  assert.equal(skipped, true);
  assert.equal(unregistered, true);
  assert.deepEqual(removed, ['anchorbuddy-app-shell-v1-old']);
  assert.deepEqual(navigated, ['http://localhost:8081/?saved=true']);
});

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), 'anchorbuddy-shell-'));
  try {
    await mkdir(join(dir, 'maplibre/6.16.0'), { recursive: true });
    await mkdir(join(dir, 'assets/@expo'), { recursive: true });
    await writeFile(join(dir, 'assets/@expo/icons.ttf'), 'font data');
    await writeFile(join(dir, 'index.html'), '<html>Anchor Buddy</html>');
    await writeFile(join(dir, 'app.js'), 'console.log("app");');
    await writeFile(
      join(dir, 'maplibre/6.16.0/maplibre-gl-worker.mjs'),
      'import "./maplibre-gl-shared.mjs";',
    );
    await writeFile(
      join(dir, 'maplibre/6.16.0/maplibre-gl-shared.mjs'),
      'export const shared = true;',
    );
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('exported shell contains matching versioned workers and deterministic resource hashes', () =>
  fixture(async (dir) => {
    const manifest = await prepareWebOffline(dir);
    assert.equal(manifest.assets.length, 5);
    for (const asset of manifest.assets) {
      const bytes = await readFile(join(dir, decodeURIComponent(asset.url.slice(1))));
      assert.equal(asset.bytes, bytes.length);
      assert.equal(
        asset.integrity,
        'sha256-' + createHash('sha256').update(bytes).digest('base64'),
      );
    }
    assert.equal((await prepareWebOffline(dir)).version, manifest.version);
    await writeFile(join(dir, 'app.js'), 'console.log("updated");');
    assert.notEqual((await prepareWebOffline(dir)).version, manifest.version);
    await rm(join(dir, 'maplibre/6.16.0/maplibre-gl-shared.mjs'));
    await assert.rejects(prepareWebOffline(dir), /missing index.html or the versioned MapLibre/);
  }));

async function workerHarness(dir, { failPath, badMime } = {}) {
  const manifest = await prepareWebOffline(dir);
  const handlers = new Map();
  const stores = new Map();
  const requests = [];
  let claimed = false;
  const origin = 'https://app.test';
  const normalized = (input) => new URL(typeof input === 'string' ? input : input.url, origin).href;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        put: async (url, response) => store.set(normalized(url), response.clone()),
        match: async (url) => store.get(normalized(url))?.clone(),
      };
    },
  };
  const context = {
    self: {
      location: { origin },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      addEventListener: (name, handler) => handlers.set(name, handler),
    },
    URL,
    Map,
    Error,
    crypto: webcrypto,
    caches,
    Request: class extends Request {
      constructor(url, options) {
        super(normalized(url), options);
      }
    },
    fetch: async (request) => {
      const path = decodeURIComponent(new URL(request.url).pathname);
      requests.push(request);
      if (path === failPath) throw new Error('disconnected');
      const bytes = await readFile(join(dir, path.slice(1)));
      if (request.integrity !== 'sha256-' + createHash('sha256').update(bytes).digest('base64'))
        throw new Error('integrity');
      return new Response(bytes, {
        headers: {
          'Content-Type': badMime
            ? 'text/html'
            : path.endsWith('.html')
              ? 'text/html'
              : 'text/javascript',
        },
      });
    },
  };
  vm.runInNewContext(await readFile(join(dir, 'anchorbuddy-sw.js'), 'utf8'), context);
  return {
    manifest,
    stores,
    requests,
    isClaimed: () => claimed,
    async lifecycle(name) {
      let work;
      handlers.get(name)({
        waitUntil: (promise) => {
          work = promise;
        },
      });
      await work;
    },
    async fetch(path, mode = 'cors', method = 'GET') {
      let result;
      handlers.get('fetch')({
        request: { url: normalized(path), mode, method },
        respondWith: (promise) => {
          result = promise;
        },
      });
      return result;
    },
  };
}

test('shell serves offline navigation and lazy workers without caching APIs or deleting saved map data', () =>
  fixture(async (dir) => {
    const worker = await workerHarness(dir);
    worker.stores.set('anchorbuddy-world-map-v1-test', new Map());
    worker.stores.set('anchorbuddy-app-shell-v1-old', new Map());
    await worker.lifecycle('install');
    assert.equal(worker.requests.length, 5);
    await worker.lifecycle('activate');
    assert.equal(worker.isClaimed(), true);
    assert.equal(worker.stores.has('anchorbuddy-app-shell-v1-old'), false);
    assert.equal(worker.stores.has('anchorbuddy-world-map-v1-test'), true);
    assert.equal(
      await (await worker.fetch('/?saved=true', 'navigate')).text(),
      '<html>Anchor Buddy</html>',
    );
    assert.match(
      await (await worker.fetch('/maplibre/6.16.0/maplibre-gl-worker.mjs')).text(),
      /shared/,
    );
    assert.equal(await (await worker.fetch('/assets/@expo/icons.ttf')).text(), 'font data');
    assert.equal(worker.requests.length, 5, 'cached shell does not need a network connection');
    for (const url of [
      '/v1/maps/resource',
      '/__anchorbuddy_world/tiles/0/0/0.pbf',
      'https://tiles.openfreemap.org/planet',
    ]) {
      assert.equal(await worker.fetch(url), undefined);
    }
    assert.equal(await worker.fetch('/app.js', 'cors', 'POST'), undefined);
  }));

test('interrupted or incorrectly served shell never leaves a partial cache to activate', () =>
  fixture(async (dir) => {
    for (const options of [
      { failPath: '/maplibre/6.16.0/maplibre-gl-worker.mjs' },
      { badMime: true },
    ]) {
      const worker = await workerHarness(dir, options);
      worker.stores.set('anchorbuddy-app-shell-v1-previous', new Map());
      await assert.rejects(worker.lifecycle('install'));
      assert.deepEqual([...worker.stores.keys()], ['anchorbuddy-app-shell-v1-previous']);
      assert.equal(worker.isClaimed(), false);
    }
  }));
