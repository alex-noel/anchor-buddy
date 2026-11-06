import * as maplibregl from 'maplibre-gl';
import { getLocal, setLocal } from './storage';
import { getAPIBase } from './regionalData';
import { prepareOfflineShell } from './offlineShell';
import {
  createWorldMapCache,
  fetchBoundedMapResource,
  onlineWorldMapStyle,
  worldVectorLayers,
  WORLD_MAP_ATTRIBUTION,
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
  maplibregl.addProtocol('anchorbuddyworld', async (params) => {
    const url = new URL(params.url);
    const path = decodeURIComponent(url.pathname.slice(1));
    const areas =
      url.hostname === 'glyphs'
        ? (await listMapAreas()).filter((area) => area.status === 'complete')
        : (await listMapAreas()).filter(
            (area) => area.id === url.hostname && area.status === 'complete',
          );
    for (const area of areas) {
      const manifest = await cache.readVerifiedManifest(area.id);
      const relative = url.hostname === 'glyphs' ? `glyphs/${path.split('/').at(-1)}` : path;
      const record = manifest?.resources[relative];
      if (!record) continue;
      const bytes = await io.read(area.id, relative);
      if (!bytes || bytes.byteLength !== record.bytes || (await hash(bytes)) !== record.sha256) {
        void cache.verifyMapArea(area.id).catch(() => {});
        throw new Error('Saved map integrity check failed. Redownload this area.');
      }
      return { data: new Uint8Array(bytes).buffer };
    }
    // Empty vector tiles keep areas outside downloaded coverage blank without network fallback.
    return { data: new ArrayBuffer(0) };
  });
}
export async function loadWorldMapStyle(online: boolean): Promise<Record<string, unknown> | null> {
  if (online) return onlineWorldMapStyle();
  requireCache();
  registerProtocol();
  const areas = (await listMapAreas()).filter(
    (area) => area.status === 'complete' && validMapId(area.id),
  );
  const sources: Record<string, unknown> = {};
  const layers: object[] = [];
  for (const area of areas) {
    const manifest = await cache.readVerifiedManifest(area.id);
    if (!manifest || manifest.area.status !== 'complete') continue;
    const source = `world-${area.id}`;
    sources[source] = {
      type: 'vector',
      tiles: [`anchorbuddyworld://${area.id}/tiles/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: area.maxZoom,
      bounds:
        area.bounds[0] < area.bounds[2] ? area.bounds : [-180, area.bounds[1], 180, area.bounds[3]],
      attribution: WORLD_MAP_ATTRIBUTION,
    };
    layers.push(...worldVectorLayers(source, source));
  }
  if (!layers.length) return null;
  return {
    version: 8,
    glyphs: 'anchorbuddyworld://glyphs/{fontstack}/{range}.pbf',
    sources,
    layers: [
      { id: 'world-background', type: 'background', paint: { 'background-color': '#F2F4F7' } },
      ...layers,
    ],
  };
}
