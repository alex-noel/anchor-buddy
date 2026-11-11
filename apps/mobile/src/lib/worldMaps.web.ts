import * as maplibregl from 'maplibre-gl';
import { getLocal, setLocal } from './storage';
import { getAPIBase } from './regionalData';
import { prepareOfflineShell } from './offlineShell';
import {
  createWorldMapCache,
  fetchBoundedMapResource,
  cachedWorldMapStyle,
  mapAreaReadiness,
  MAP_FONT_URL,
  MAP_FONT,
  onlineWorldMapStyle,
  validMapId,
  type MapArea,
  type MapAreaManifest,
  type MapCacheIO,
} from './worldMapsCore';
export * from './worldMapsCore';
const key = 'world-map-areas-v1';
const cacheName = (id: string) => `anchorbuddy-world-map-v1-${id}`;
const resourceUrl = (path: string) => `${location.origin}/__anchorbuddy_world/${path}`;
const hash = async (bytes: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
function requireCache() {
  if (!globalThis.caches || !globalThis.crypto?.subtle)
    throw new Error('Offline maps need a secure browser context (HTTPS or localhost).');
}
const io: MapCacheIO = {
  list: async () => {
    const value = await getLocal<unknown>(key);
    return Array.isArray(value) ? (value as MapArea[]) : [];
  },
  readManifest: async (id) => {
    requireCache();
    const r = await (await caches.open(cacheName(id))).match(resourceUrl('manifest.json'));
    return r ? ((await r.json()) as MapAreaManifest) : null;
  },
  saveManifest: async (manifest) => {
    requireCache();
    const cache = await caches.open(cacheName(manifest.area.id));
    await cache.put(
      resourceUrl('manifest.json'),
      new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }),
    );
    const areas = await io.list();
    await setLocal(key, [manifest.area, ...areas.filter((area) => area.id !== manifest.area.id)]);
  },
  read: async (id, path) => {
    requireCache();
    const response = await (await caches.open(cacheName(id))).match(resourceUrl(path));
    return response ? new Uint8Array(await response.arrayBuffer()) : null;
  },
  write: async (id, path, bytes) => {
    requireCache();
    await (
      await caches.open(cacheName(id))
    ).put(
      resourceUrl(path),
      new Response(new Uint8Array(bytes).buffer, {
        headers: { 'Content-Type': 'application/x-protobuf' },
      }),
    );
  },
  remove: async (id) => {
    requireCache();
    await caches.delete(cacheName(id));
    await setLocal(
      key,
      (await io.list()).filter((area) => area.id !== id),
    );
  },
  hash,
  fetch: async (url, signal) => {
    // Browser User-Agent is controlled by the browser; this fixed-host proxy identifies our app.
    const base = await getAPIBase();
    return fetchBoundedMapResource(
      `${base}/v1/maps/resource?url=${encodeURIComponent(url)}`,
      signal,
    );
  },
};
const cache = createWorldMapCache(io);
export const { listMapAreas, deleteMapArea, cancelMapArea, verifyMapArea } = cache;
export async function downloadMapArea(...args: Parameters<typeof cache.downloadMapArea>) {
  const signal = args[2];
  if (signal?.aborted) throw new Error('Map download cancelled.');
  await new Promise<void>((resolve, reject) => {
    const cancelled = () => reject(new Error('Map download cancelled.'));
    signal?.addEventListener('abort', cancelled, { once: true });
    void prepareOfflineShell()
      .then(resolve, reject)
      .finally(() => {
        signal?.removeEventListener('abort', cancelled);
      });
  });
  if (signal?.aborted) throw new Error('Map download cancelled.');
  return cache.downloadMapArea(...args);
}
export const subscribeMapAreas = cache.subscribe;
let registered = false;
function registerProtocol() {
  if (registered) return;
  registered = true;
  maplibregl.addProtocol('anchorbuddyworld', async (params, abortController) => {
    const url = new URL(params.url);
    const path = decodeURIComponent(url.pathname.slice(1));
    const areas =
      url.hostname === 'glyphs'
        ? (await listMapAreas()).filter((area) => area.usableZoom !== undefined)
        : (await listMapAreas()).filter(
            (area) => area.id === url.hostname && area.usableZoom !== undefined,
          );
    for (const area of areas) {
      let manifest: MapAreaManifest | null;
      try {
        manifest = await cache.readVerifiedManifest(area.id);
      } catch {
        continue;
      }
      const relative = url.hostname === 'glyphs' ? `glyphs/${path.split('/').at(-1)}` : path;
      const record = manifest?.resources[relative];
      if (!record) continue;
      const bytes = await io.read(area.id, relative);
      if (!bytes || bytes.byteLength !== record.bytes || (await hash(bytes)) !== record.sha256) {
        void cache.verifyMapArea(area.id).catch(() => {});
        continue;
      }
      return { data: new Uint8Array(bytes).buffer };
    }
    if (url.hostname === 'glyphs' && url.searchParams.get('online') === '1') {
      const range = path
        .split('/')
        .at(-1)
        ?.replace(/\.pbf$/, '');
      if (range && /^\d+-\d+$/.test(range)) {
        try {
          const bytes = await fetchBoundedMapResource(
            MAP_FONT_URL.replace('{fontstack}', encodeURIComponent(MAP_FONT)).replace(
              '{range}',
              range,
            ),
            abortController.signal,
          );
          return { data: new Uint8Array(bytes).buffer };
        } catch {
          /* Saved glyphs/geometry remain available during upstream failure. */
        }
      }
    }
    // Empty vector tiles keep areas outside downloaded coverage blank without network fallback.
    return { data: new ArrayBuffer(0) };
  });
}
export async function loadWorldMapStyle(online: boolean): Promise<Record<string, unknown> | null> {
  try {
    requireCache();
  } catch {
    return online ? onlineWorldMapStyle() : null;
  }
  registerProtocol();
  const areas = (await listMapAreas()).filter(
    (area) => area.usableZoom !== undefined && validMapId(area.id),
  );
  const available: { area: MapArea; tiles: string }[] = [];
  for (const area of areas) {
    try {
      const manifest = await cache.readVerifiedManifest(area.id);
      if (manifest)
        available.push({
          area: mapAreaReadiness(manifest),
          tiles: `anchorbuddyworld://${area.id}/tiles/{z}/{x}/{y}.pbf`,
        });
    } catch {
      /* One broken area must not hide other downloaded areas. */
    }
  }
  return cachedWorldMapStyle(
    online,
    available,
    `anchorbuddyworld://glyphs/{fontstack}/{range}.pbf?online=${online ? 1 : 0}`,
  );
}
