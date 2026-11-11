import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { TransformRequestManager } from '@maplibre/maplibre-react-native';
import { getLocal, removeLocal, setLocal } from './storage';
import {
  createWorldMapCache,
  fetchBoundedMapResource,
  cachedWorldMapStyle,
  mapAreaReadiness,
  MAP_FONT_URL,
  MAP_USER_AGENT,
  MAP_FONT,
  validMapId,
  type MapArea,
  type MapAreaManifest,
  type MapCacheIO,
} from './worldMapsCore';
export * from './worldMapsCore';
const key = 'world-map-areas-v1';
// Native file reads bypass JS. Verify each immutable resource before first use;
// writes/deletes invalidate the in-process verification, and reopening verifies again.
const verifiedFiles = new Map<string, string>();
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
    verifiedFiles.delete(`${id}/${path}`);
    const segments = path.split('/');
    const name = segments.pop()!;
    const directory = new Directory(areaDirectory(id), ...segments);
    directory.create({ intermediates: true, idempotent: true });
    new File(directory, name).write(bytes);
  },
  remove: async (id) => {
    for (const key of verifiedFiles.keys()) if (key.startsWith(id + '/')) verifiedFiles.delete(key);
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
  const areas = (await listMapAreas()).filter((area) => area.usableZoom !== undefined);
  const available: { area: MapArea; tiles: string }[] = [];
  const glyphRanges = new Set<string>();
  const fontDirectory = new Directory(root(), 'fonts', MAP_FONT);
  fontDirectory.create({ intermediates: true, idempotent: true });
  for (const area of areas) {
    let manifest: MapAreaManifest | null;
    try {
      manifest = await cache.readVerifiedManifest(area.id);
    } catch {
      continue;
    }
    if (!manifest) continue;
    let damaged = false;
    for (const [path, resource] of Object.entries(manifest.resources)) {
      const identity = `${area.id}/${path}`;
      if (verifiedFiles.get(identity) !== resource.sha256) {
        const bytes = await io.read(area.id, path);
        if (
          !bytes ||
          bytes.byteLength !== resource.bytes ||
          (await hash(bytes)) !== resource.sha256
        ) {
          delete manifest.resources[path];
          damaged = true;
          continue;
        }
        if (resource.kind === 'glyph')
          new File(fontDirectory, path.split('/').at(-1)!).write(bytes);
        verifiedFiles.set(identity, resource.sha256);
      }
      if (resource.kind === 'glyph') glyphRanges.add(path.slice(7, -4));
    }
    if (damaged) void cache.verifyMapArea(area.id).catch(() => {});
    available.push({
      area: mapAreaReadiness(manifest),
      tiles: `${areaDirectory(area.id).uri.replace(/\/$/, '')}/tiles/{z}/{x}/{y}.pbf`,
    });
  }
  const localGlyphs = `${root().uri.replace(/\/$/, '')}/fonts/{fontstack}/{range}.pbf`;
  // Prefer only verified font ranges locally; uncached labels still load online.
  if (glyphRanges.size)
    TransformRequestManager.addUrlTransform({
      id: 'anchorbuddy-cached-glyphs',
      find: `^https://tiles\\.openfreemap\\.org/fonts/(?:Noto%20Sans%20Regular|Noto Sans Regular)/(${[...glyphRanges].join('|')})\\.pbf$`,
      replace: `${fontDirectory.uri.replace(/\/$/, '')}/$1.pbf`,
    });
  else TransformRequestManager.removeUrlTransform('anchorbuddy-cached-glyphs');
  return cachedWorldMapStyle(online, available, online ? MAP_FONT_URL : localGlyphs);
}
