import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { TransformRequestManager } from '@maplibre/maplibre-react-native';
import { getLocal, removeLocal, setLocal } from './storage';
import {
  createWorldMapCache,
  fetchBoundedMapResource,
  onlineWorldMapStyle,
  worldVectorLayers,
  WORLD_MAP_ATTRIBUTION,
  MAP_USER_AGENT,
  MAP_FONT,
  validMapId,
  type MapArea,
  type MapAreaManifest,
  type MapCacheIO,
} from './worldMapsCore';
export * from './worldMapsCore';
const key = 'world-map-areas-v1';
const root = () => new Directory(Paths.document, 'world-maps-v1');
const areaDirectory = (id: string) => {
  if (!validMapId(id)) throw new Error('Invalid map area.');
  return new Directory(root(), id);
};
const file = (id: string, path: string) => new File(areaDirectory(id), ...path.split('/'));
const hash = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes).buffer),
    ),
  )
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
const io: MapCacheIO = {
  list: async () => {
    const value = await getLocal<unknown>(key);
    return Array.isArray(value) ? (value as MapArea[]) : [];
  },
  readManifest: async (id) => getLocal<MapAreaManifest>('world-map-manifest:' + id),
  saveManifest: async (manifest) => {
    const directory = areaDirectory(manifest.area.id);
    directory.create({ intermediates: true, idempotent: true });
    await setLocal('world-map-manifest:' + manifest.area.id, manifest);
    const areas = await io.list();
    await setLocal(key, [manifest.area, ...areas.filter((area) => area.id !== manifest.area.id)]);
  },
  read: async (id, path) => {
    const f = file(id, path);
    return f.exists ? await f.bytes() : null;
  },
  write: async (id, path, bytes) => {
    const segments = path.split('/');
    const name = segments.pop()!;
    const directory = new Directory(areaDirectory(id), ...segments);
    directory.create({ intermediates: true, idempotent: true });
    new File(directory, name).write(bytes);
  },
  remove: async (id) => {
    const directory = areaDirectory(id);
    if (directory.exists) directory.delete();
    await removeLocal('world-map-manifest:' + id);
    await setLocal(
      key,
      (await io.list()).filter((area) => area.id !== id),
    );
  },
  hash,
  fetch: (url, signal) => fetchBoundedMapResource(url, signal, { 'User-Agent': MAP_USER_AGENT }),
};
const cache = createWorldMapCache(io);
export const { listMapAreas, downloadMapArea, deleteMapArea, cancelMapArea, verifyMapArea } = cache;
export const subscribeMapAreas = cache.subscribe;
// Registered before any native Map is mounted, including the initial online style.
TransformRequestManager.addHeader({
  id: 'anchorbuddy-map-agent',
  match: '^https://tiles\\.openfreemap\\.org/',
  name: 'User-Agent',
  value: MAP_USER_AGENT,
});
export async function loadWorldMapStyle(online: boolean): Promise<Record<string, unknown> | null> {
  if (online) return onlineWorldMapStyle();
  const areas = (await listMapAreas()).filter((area) => area.status === 'complete');
  const sources: Record<string, unknown> = {};
  const layers: object[] = [];
  const fontDirectory = new Directory(root(), 'fonts', MAP_FONT);
  fontDirectory.create({ intermediates: true, idempotent: true });
  for (const area of areas) {
    const verified = await cache.verifyMapArea(area.id);
    if (verified?.status !== 'complete') continue;
    const manifest = await cache.readVerifiedManifest(area.id);
    if (!manifest || manifest.area.status !== 'complete') continue;
    // verifyMapArea checks every tile before native file loading bypasses JS.
    for (const resource of Object.values(manifest.resources)) {
      if (resource.kind !== 'glyph') continue;
      const bytes = await io.read(area.id, resource.path);
      if (!bytes || bytes.byteLength !== resource.bytes || (await hash(bytes)) !== resource.sha256)
        throw new Error('Saved map integrity check failed. Delete and redownload this area.');
      new File(fontDirectory, resource.path.split('/').at(-1)!).write(bytes);
    }
    const source = `world-${area.id}`;
    sources[source] = {
      type: 'vector',
      tiles: [`${areaDirectory(area.id).uri.replace(/\/$/, '')}/tiles/{z}/{x}/{y}.pbf`],
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
    glyphs: `${root().uri.replace(/\/$/, '')}/fonts/{fontstack}/{range}.pbf`,
    sources,
    layers: [
      { id: 'world-background', type: 'background', paint: { 'background-color': '#F2F4F7' } },
      ...layers,
    ],
  };
}
