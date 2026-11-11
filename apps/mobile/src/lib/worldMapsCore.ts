import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';

export type MapBounds = [number, number, number, number];
export const WORLD_MAP_PROVIDER = 'openfreemap' as const;
export const WORLD_MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://openmaptiles.org">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export const WORLD_BATHYMETRY_NOTICE =
  'GEBCO global bathymetry is coarse modelled context, not charted clearance or navigation evidence. Online only.';
export const WORLD_MARKS_NOTICE =
  'OpenSeaMap community seamarks are incomplete display context, not verified hazard coverage. Online only.';
export const WORLD_BEDDING_NOTICE =
  'EMODnet European seabed substrate is broad-scale context (1:1M / 1:250k), not verified anchor holding or habitat permission. Online overview only; colours follow the provider legend.';
export const EMODNET_BEDDING_LEGEND_URL =
  'https://drive.emodnet-geology.eu/geoserver/gtk/wms?service=WMS&version=1.1.1&request=GetLegendGraphic&format=image/png&layer=seabed_substrate_250k';
export const MAX_MAP_BYTES = 50_000_000;
export const MAX_MAP_TILES = 3000;
// Multilingual/CJK glyph blocks can exceed tile bytes for small areas. This is
// still an estimate; enforce actual bytes and preserve partial progress at the cap.
const ESTIMATED_MAP_LABEL_BYTES = 20_000_000;
export const MAP_FONT = 'Noto Sans Regular';
export const MAP_FONT_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
export const MAP_TILEJSON_URL = 'https://tiles.openfreemap.org/planet';
export const MAP_USER_AGENT = 'AnchorBuddy/0.1 (user-selected offline maps)';
export interface MapArea {
  id: string;
  name: string;
  bounds: MapBounds;
  minZoom: 0;
  maxZoom: number;
  bytes: number;
  tileCount: number;
  completedTiles: number;
  /** Highest completely downloaded zoom covering this area; zero is usable. */
  usableZoom?: number;
  attribution?: string;
  /** Older downloaded areas only contain glyphs for their Latin-first labels. */
  labelPolicy?: 'local' | 'latin';
  status: 'partial' | 'complete';
  createdAt: string;
  updatedAt: string;
  refreshAfter: string;
  provider: typeof WORLD_MAP_PROVIDER;
  error?: string;
}
export interface MapAreaInput {
  name: string;
  bounds: MapBounds;
  maxZoom?: number;
  id?: string;
}
export interface CachedMapResource {
  path: string;
  url: string;
  sha256: string;
  bytes: number;
  kind: 'tile' | 'glyph';
  /** Exact label ranges needed by this tile; older manifests use the global set. */
  glyphRanges?: string[];
}
export interface MapAreaManifest {
  schemaVersion: 1;
  area: MapArea;
  tileTemplate: string;
  glyphRanges: string[];
  resources: Record<string, CachedMapResource>;
}
export interface MapCacheIO {
  list(): Promise<MapArea[]>;
  readManifest(id: string): Promise<MapAreaManifest | null>;
  saveManifest(manifest: MapAreaManifest): Promise<void>;
  read(id: string, path: string): Promise<Uint8Array | null>;
  write(id: string, path: string, bytes: Uint8Array): Promise<void>;
  remove(id: string): Promise<void>;
  hash(bytes: Uint8Array): Promise<string>;
  fetch(url: string, signal: AbortSignal): Promise<Uint8Array>;
}
export function validMapId(id: string) {
  return /^[a-z0-9][a-z0-9-]{0,100}$/.test(id);
}
export function validateMapBounds(bounds: MapBounds) {
  if (
    !Array.isArray(bounds) ||
    bounds.length !== 4 ||
    !bounds.every(Number.isFinite) ||
    bounds[0] < -180 ||
    bounds[0] > 180 ||
    bounds[2] < -180 ||
    bounds[2] > 180 ||
    bounds[1] < -85 ||
    bounds[3] > 85 ||
    bounds[1] >= bounds[3] ||
    bounds[0] === bounds[2]
  )
    throw new Error('Choose a valid map area between 85°S and 85°N.');
}
function tileX(longitude: number, zoom: number) {
  return Math.max(0, Math.min(2 ** zoom - 1, Math.floor(((longitude + 180) / 360) * 2 ** zoom)));
}
function tileY(latitude: number, zoom: number) {
  const rad = (latitude * Math.PI) / 180;
  return Math.max(
    0,
    Math.min(
      2 ** zoom - 1,
      Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * 2 ** zoom),
    ),
  );
}
export function mapTiles(bounds: MapBounds, maxZoom: number, stopAfter = MAX_MAP_TILES) {
  validateMapBounds(bounds);
  if (!Number.isInteger(maxZoom) || maxZoom < 0 || maxZoom > 14)
    throw new Error('Offline detail must be between zoom 0 and 14.');
  const tiles: { z: number; x: number; y: number; path: string }[] = [];
  for (let z = 0; z <= maxZoom; z++) {
    const ranges =
      bounds[0] < bounds[2]
        ? [[bounds[0], bounds[2]]]
        : [
            [bounds[0], 180],
            [-180, bounds[2]],
          ];
    const seen = new Set<string>();
    for (const [west, east] of ranges)
      for (let x = tileX(west!, z); x <= tileX(east!, z); x++)
        for (let y = tileY(bounds[3], z); y <= tileY(bounds[1], z); y++) {
          const path = `tiles/${z}/${x}/${y}.pbf`;
          if (seen.has(path)) continue;
          seen.add(path);
          tiles.push({ z, x, y, path });
          if (tiles.length > stopAfter) return tiles;
        }
  }
  return tiles;
}
export function estimateMapArea(input: { bounds: MapBounds; maxZoom?: number }) {
  let maxZoom = input.maxZoom ?? 14;
  let tileCount = mapTiles(input.bounds, maxZoom).length;
  if (input.maxZoom === undefined)
    while (
      maxZoom > 0 &&
      (tileCount > MAX_MAP_TILES || tileCount * 30_000 + ESTIMATED_MAP_LABEL_BYTES > MAX_MAP_BYTES)
    ) {
      maxZoom--;
      tileCount = mapTiles(input.bounds, maxZoom).length;
    }
  if (tileCount > MAX_MAP_TILES)
    throw new Error('This area exceeds 3,000 tiles. Reduce the area or offline detail.');
  return {
    tileCount,
    estimatedBytes: tileCount * 30_000 + ESTIMATED_MAP_LABEL_BYTES,
    maxZoom,
    maxBytes: MAX_MAP_BYTES,
  };
}
export function validateTileTemplate(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^https:\/\/tiles\.openfreemap\.org\/planet\/[a-zA-Z0-9_-]+\/\{z\}\/\{x\}\/\{y\}\.pbf$/.test(
      value,
    )
  )
    throw new Error('The map provider returned an unsupported tile source.');
  return value;
}
export function mapTileUrl(template: string, tile: { z: number; x: number; y: number }) {
  return template
    .replace('{z}', String(tile.z))
    .replace('{x}', String(tile.x))
    .replace('{y}', String(tile.y));
}
/** Only fonts actually referenced by label text in selected-area vector tiles are fetched. */
export function tileGlyphRanges(bytes: Uint8Array) {
  const result = new Set<string>(['0-255']);
  if (!bytes.byteLength) return result;
  const tile = new VectorTile(new PbfReader(bytes));
  for (const layerName of ['place', 'water_name', 'transportation_name']) {
    const layer = tile.layers[layerName];
    if (!layer) continue;
    for (let index = 0; index < layer.length; index++) {
      const p = layer.feature(index).properties;
      const text = mapLabelText(p);
      if (typeof text !== 'string') continue;
      for (const character of text) {
        const code = character.codePointAt(0)!;
        if (code > 65535) continue; // MapLibre glyph PBFs use the Basic Multilingual Plane.
        const start = Math.floor(code / 256) * 256;
        result.add(`${start}-${start + 255}`);
      }
    }
  }
  return result;
}
/** Keep glyph discovery and rendering on the same local-name-first policy. */
export function mapLabelText(properties: Record<string, unknown>) {
  return properties.name ?? properties['name:latin'] ?? properties['name:en'];
}
export function mapAreaReadiness(manifest: MapAreaManifest): MapArea {
  let usableZoom: number | undefined;
  const tiles = mapTiles(manifest.area.bounds, manifest.area.maxZoom);
  for (let zoom = 0; zoom <= manifest.area.maxZoom; zoom++) {
    if (
      tiles.some(
        (tile) =>
          tile.z === zoom &&
          (manifest.resources[tile.path]?.kind !== 'tile' ||
            manifest.resources[tile.path]?.url !== mapTileUrl(manifest.tileTemplate, tile) ||
            (manifest.resources[tile.path]?.glyphRanges ?? manifest.glyphRanges).some(
              (range) => !manifest.resources[`glyphs/${range}.pbf`],
            )),
      )
    )
      break;
    usableZoom = zoom;
  }
  const localNames = tiles
    .filter((tile) => usableZoom !== undefined && tile.z <= usableZoom)
    .every((tile) => manifest.resources[tile.path]?.glyphRanges !== undefined);
  return {
    ...manifest.area,
    usableZoom,
    attribution: WORLD_MAP_ATTRIBUTION,
    labelPolicy: localNames ? 'local' : 'latin',
  };
}
export function validateMapManifest(value: unknown): asserts value is MapAreaManifest {
  const m = value as MapAreaManifest;
  if (
    !m ||
    m.schemaVersion !== 1 ||
    !m.area ||
    !validMapId(m.area.id) ||
    m.area.provider !== WORLD_MAP_PROVIDER ||
    !['partial', 'complete'].includes(m.area.status) ||
    typeof m.area.name !== 'string' ||
    !Number.isInteger(m.area.maxZoom) ||
    m.area.maxZoom < 0 ||
    m.area.maxZoom > 14 ||
    !Number.isFinite(m.area.bytes) ||
    m.area.bytes < 0 ||
    m.area.bytes > MAX_MAP_BYTES ||
    m.area.minZoom !== 0 ||
    !Number.isInteger(m.area.tileCount) ||
    m.area.tileCount < 1 ||
    m.area.tileCount > MAX_MAP_TILES ||
    !Number.isInteger(m.area.completedTiles) ||
    m.area.completedTiles < 0 ||
    m.area.completedTiles > m.area.tileCount ||
    (m.area.usableZoom !== undefined &&
      (!Number.isInteger(m.area.usableZoom) ||
        m.area.usableZoom < 0 ||
        m.area.usableZoom > m.area.maxZoom)) ||
    (m.area.attribution !== undefined && m.area.attribution !== WORLD_MAP_ATTRIBUTION) ||
    (m.area.labelPolicy !== undefined && !['local', 'latin'].includes(m.area.labelPolicy)) ||
    ![m.area.createdAt, m.area.updatedAt, m.area.refreshAfter].every(
      (date) => typeof date === 'string' && Number.isFinite(Date.parse(date)),
    ) ||
    !Array.isArray(m.glyphRanges) ||
    m.glyphRanges.length > 256 ||
    m.glyphRanges.some((range) => {
      if (!/^\d+-\d+$/.test(range)) return true;
      const [start, end] = range.split('-').map(Number);
      return start! < 0 || start! > 65280 || start! % 256 !== 0 || end !== start! + 255;
    }) ||
    !m.resources ||
    typeof m.resources !== 'object' ||
    Array.isArray(m.resources)
  )
    throw new Error('Saved map metadata is invalid. Delete this area and download it again.');
  validateMapBounds(m.area.bounds);
  validateTileTemplate(m.tileTemplate);
  const expectedTiles = mapTiles(m.area.bounds, m.area.maxZoom);
  const expectedPaths = new Map(
    expectedTiles.map((tile) => [tile.path, mapTileUrl(m.tileTemplate, tile)]),
  );
  if (expectedTiles.length !== m.area.tileCount)
    throw new Error('Saved map tile count does not match its area.');
  const resources = Object.entries(m.resources);
  if (
    resources.length > MAX_MAP_TILES + 256 ||
    resources.some(
      ([path, r]) =>
        !r ||
        r.path !== path ||
        !/^(tiles\/\d+\/\d+\/\d+|glyphs\/\d+-\d+)\.pbf$/.test(path) ||
        !/^[a-f0-9]{64}$/.test(r.sha256) ||
        !Number.isFinite(r.bytes) ||
        r.bytes < 0 ||
        !['tile', 'glyph'].includes(r.kind) ||
        (r.glyphRanges !== undefined &&
          (!Array.isArray(r.glyphRanges) ||
            r.glyphRanges.some((range) => !m.glyphRanges.includes(range)))) ||
        (r.kind === 'tile' && expectedPaths.get(path) !== r.url) ||
        (r.kind === 'glyph' &&
          (!path.startsWith('glyphs/') ||
            !m.glyphRanges.includes(path.slice(7, -4)) ||
            r.url !==
              MAP_FONT_URL.replace('{fontstack}', encodeURIComponent(MAP_FONT)).replace(
                '{range}',
                path.slice(7, -4),
              ))) ||
        typeof r.url !== 'string' ||
        !r.url.startsWith('https://tiles.openfreemap.org/'),
    )
  )
    throw new Error('Saved map resource records are invalid.');
  if (
    resources.reduce((total, [, r]) => total + r.bytes, 0) !== m.area.bytes ||
    resources.filter(([, r]) => r.kind === 'tile').length !== m.area.completedTiles
  )
    throw new Error('Saved map resource counts do not match its manifest.');
  if (
    m.area.status === 'complete' &&
    (expectedTiles.some(
      (tile) =>
        !m.resources[tile.path] || m.resources[tile.path]!.url !== mapTileUrl(m.tileTemplate, tile),
    ) ||
      m.glyphRanges.some((range) => !m.resources[`glyphs/${range}.pbf`]))
  )
    throw new Error('Saved map is incomplete. Resume or redownload this area.');
  if (m.area.usableZoom !== undefined && m.area.usableZoom !== mapAreaReadiness(m).usableZoom)
    throw new Error('Saved map readiness does not match its downloaded tiles.');
}
export function createWorldMapCache(io: MapCacheIO) {
  let running: { id: string; controller: AbortController } | null = null;
  const listeners = new Set<() => void>();
  const changed = () => {
    for (const listener of listeners) listener();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const listMapAreas = async () => {
    const summaries = (await io.list())
      .filter(
        (area) =>
          !!area &&
          typeof area === 'object' &&
          typeof area.id === 'string' &&
          validMapId(area.id) &&
          typeof area.updatedAt === 'string' &&
          ['partial', 'complete'].includes(area.status),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const areas: MapArea[] = [];
    for (const summary of summaries) {
      try {
        const manifest = await readVerifiedManifest(summary.id);
        if (manifest) areas.push(mapAreaReadiness(manifest));
      } catch {
        areas.push({
          ...summary,
          usableZoom: undefined,
          status: 'partial',
          error: 'Saved map metadata is invalid. Delete and download it again.',
        });
      }
    }
    return areas;
  };
  const readVerifiedManifest = async (id: string) => {
    if (!validMapId(id)) throw new Error('Invalid map area identifier.');
    const manifest = await io.readManifest(id);
    if (!manifest) return null;
    validateMapManifest(manifest);
    if (manifest.area.id !== id)
      throw new Error('Saved map identity does not match its storage record.');
    return manifest;
  };
  const verifyMapArea = async (id: string) => {
    const manifest = await readVerifiedManifest(id);
    if (!manifest) return null;
    let damaged = false;
    for (const [path, resource] of Object.entries(manifest.resources)) {
      const bytes = await io.read(id, path);
      if (
        !bytes ||
        bytes.byteLength !== resource.bytes ||
        (await io.hash(bytes)) !== resource.sha256
      ) {
        delete manifest.resources[path];
        damaged = true;
      }
    }
    if (damaged) {
      manifest.area.status = 'partial';
      manifest.area.error = 'Missing or damaged map resources. Resume to repair this area.';
      manifest.area.bytes = Object.values(manifest.resources).reduce(
        (sum, resource) => sum + resource.bytes,
        0,
      );
      manifest.area.completedTiles = Object.values(manifest.resources).filter(
        (resource) => resource.kind === 'tile',
      ).length;
      manifest.area.updatedAt = new Date().toISOString();
      manifest.area = mapAreaReadiness(manifest);
      // A renderer checking an older published snapshot must never overwrite a
      // running download's newer manifest. That download verifies each reuse.
      if (running?.id !== id) {
        await io.saveManifest(manifest);
        changed();
      }
    }
    return mapAreaReadiness(manifest);
  };
  async function downloadMapArea(
    input: MapAreaInput,
    onProgress?: (area: MapArea) => void,
    signal?: AbortSignal,
  ): Promise<MapArea> {
    if (running)
      throw new Error(
        'One map area can download at a time. Cancel or finish the current download first.',
      );
    if (signal?.aborted) throw new Error('Map download cancelled.');
    const estimate = estimateMapArea(input);
    const id =
      input.id ?? `map-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (!validMapId(id)) throw new Error('Invalid map area identifier.');
    const controller = new AbortController();
    running = { id, controller };
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let manifest: MapAreaManifest | null = null;
    let publishedZoom: number | undefined;
    const report = async () => {
      if (!manifest) return;
      manifest.area.updatedAt = new Date().toISOString();
      manifest.area.bytes = Object.values(manifest.resources).reduce((sum, r) => sum + r.bytes, 0);
      manifest.area.completedTiles = Object.values(manifest.resources).filter(
        (r) => r.kind === 'tile',
      ).length;
      manifest.area = mapAreaReadiness(manifest);
      await io.saveManifest(manifest);
      onProgress?.({ ...manifest.area });
      if (
        manifest.area.usableZoom !== publishedZoom ||
        manifest.area.status === 'complete' ||
        manifest.area.error
      )
        changed();
      publishedZoom = manifest.area.usableZoom;
    };
    try {
      manifest = input.id ? await readVerifiedManifest(id) : null;
      if (input.id && !manifest) throw new Error('This saved map is no longer available.');
      if (
        manifest &&
        (JSON.stringify(input.bounds) !== JSON.stringify(manifest.area.bounds) ||
          (input.maxZoom !== undefined && input.maxZoom !== manifest.area.maxZoom))
      )
        throw new Error('Resume must use the original area and detail level.');
      if (manifest?.area.status === 'complete') {
        const verified = await verifyMapArea(id);
        if (verified?.status === 'complete') return verified;
        manifest = await readVerifiedManifest(id);
      }
      if (!manifest) {
        const metadata = JSON.parse(
          new TextDecoder().decode(await io.fetch(MAP_TILEJSON_URL, controller.signal)),
        ) as { tiles?: unknown[] };
        const tileTemplate = validateTileTemplate(metadata.tiles?.[0]);
        const now = new Date().toISOString();
        manifest = {
          schemaVersion: 1,
          tileTemplate,
          glyphRanges: ['0-255'],
          resources: {},
          area: {
            id,
            name: input.name.trim().slice(0, 100) || 'Saved map',
            bounds: [...input.bounds],
            minZoom: 0,
            maxZoom: estimate.maxZoom,
            bytes: 0,
            tileCount: estimate.tileCount,
            completedTiles: 0,
            status: 'partial',
            createdAt: now,
            updatedAt: now,
            refreshAfter: new Date(Date.now() + 7 * 86400000).toISOString(),
            provider: WORLD_MAP_PROVIDER,
            attribution: WORLD_MAP_ATTRIBUTION,
          },
        };
      }
      delete manifest.area.error;
      await report();
      const ranges = new Set(manifest.glyphRanges);
      const ensure = async (path: string, url: string, kind: 'tile' | 'glyph') => {
        if (controller.signal.aborted) throw new Error('Map download cancelled.');
        let record: CachedMapResource | undefined = manifest!.resources[path];
        let bytes = record ? await io.read(id, path) : null;
        if (
          bytes &&
          (bytes.byteLength !== record!.bytes || (await io.hash(bytes)) !== record!.sha256)
        )
          bytes = null;
        if (!bytes && record) {
          delete manifest!.resources[path];
          record = undefined;
        }
        if (!bytes) {
          bytes = await io.fetch(url, controller.signal);
          const sha256 = await io.hash(bytes);
          const used =
            Object.values(manifest!.resources).reduce((sum, resource) => sum + resource.bytes, 0) -
            (record?.bytes ?? 0);
          if (used + bytes.byteLength > MAX_MAP_BYTES)
            throw new Error(
              'Map exceeds 50 MB. Reduce the area or detail; the partial download is retained.',
            );
          // Reserve budget before yielding, so concurrent responses cannot exceed the cap.
          manifest!.resources[path] = { path, url, kind, bytes: bytes.byteLength, sha256 };
          try {
            await io.write(id, path, bytes);
          } catch (error) {
            if (record) manifest!.resources[path] = record;
            else delete manifest!.resources[path];
            throw error;
          }
        }
        if (kind === 'tile') {
          try {
            const required = [...tileGlyphRanges(bytes)];
            for (const range of required) ranges.add(range);
            manifest!.resources[path]!.glyphRanges = required;
          } catch (error) {
            delete manifest!.resources[path];
            throw error;
          }
        }
      };
      const tiles = mapTiles(manifest.area.bounds, manifest.area.maxZoom);
      // Finish coarse coverage first. Each level is useful immediately and stays
      // visible while finer detail (or its local-language labels) downloads.
      for (let zoom = 0; zoom <= manifest.area.maxZoom; zoom++) {
        const level = tiles.filter((tile) => tile.z === zoom);
        for (let index = 0; index < level.length; index += 3) {
          const outcomes = await Promise.allSettled(
            level
              .slice(index, index + 3)
              .map((tile) => ensure(tile.path, mapTileUrl(manifest!.tileTemplate, tile), 'tile')),
          );
          manifest.glyphRanges = [...ranges].sort();
          await report();
          const failure = outcomes.find((outcome) => outcome.status === 'rejected');
          if (failure?.status === 'rejected') throw failure.reason;
        }
        const glyphs = [...ranges];
        for (let index = 0; index < glyphs.length; index += 3) {
          const outcomes = await Promise.allSettled(
            glyphs
              .slice(index, index + 3)
              .map((range) =>
                ensure(
                  `glyphs/${range}.pbf`,
                  MAP_FONT_URL.replace('{fontstack}', encodeURIComponent(MAP_FONT)).replace(
                    '{range}',
                    range,
                  ),
                  'glyph',
                ),
              ),
          );
          const failure = outcomes.find((outcome) => outcome.status === 'rejected');
          if (failure?.status === 'rejected') throw failure.reason;
        }
        await report();
      }
      if (controller.signal.aborted) throw new Error('Map download cancelled.');
      manifest.glyphRanges = [...ranges].sort();
      manifest.area.status = 'complete';
      await report();
      return { ...manifest.area };
    } catch (error) {
      if (manifest) {
        manifest.area.status = 'partial';
        manifest.area.error = controller.signal.aborted
          ? 'Download paused. Resume when ready.'
          : error instanceof Error
            ? error.message
            : String(error);
        await report();
      }
      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
      running = null;
    }
  }
  const cancelMapArea = (id: string) => {
    if (running?.id === id) running.controller.abort();
  };
  const deleteMapArea = async (id: string) => {
    if (!validMapId(id)) throw new Error('Invalid map area identifier.');
    if (running?.id === id) throw new Error('Cancel this download before deleting it.');
    await io.remove(id);
    changed();
  };
  return {
    downloadMapArea,
    listMapAreas,
    deleteMapArea,
    cancelMapArea,
    readVerifiedManifest,
    verifyMapArea,
    subscribe,
  };
}

/** Stops immediately on service errors (including 429); a later explicit resume may retry. */
export async function fetchBoundedMapResource(
  url: string,
  signal: AbortSignal,
  headers?: Record<string, string>,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 30_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers,
      redirect: 'error',
      credentials: 'omit',
    });
    if (!response.ok)
      throw new Error(
        `Map service returned HTTP ${response.status}. Resume later; saved tiles are retained.`,
      );
    const maximum = 8_000_000;
    if (Number(response.headers.get('content-length')) > maximum)
      throw new Error('Map resource exceeds 8 MB.');
    if (!response.body?.getReader) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > maximum) throw new Error('Map resource exceeds 8 MB.');
      return bytes;
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) {
        await reader.cancel();
        throw new Error('Map resource exceeds 8 MB.');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

export function worldVectorLayers(source = 'world', prefix = 'world', localNames = true) {
  const text = localNames
    ? ['coalesce', ['get', 'name'], ['get', 'name:latin'], ['get', 'name:en']]
    : ['coalesce', ['get', 'name:latin'], ['get', 'name:en'], ['get', 'name']];
  return [
    {
      id: `${prefix}-landcover`,
      type: 'fill',
      source,
      'source-layer': 'landcover',
      paint: { 'fill-color': '#E7EBEF', 'fill-opacity': 0.55 },
    },
    {
      id: `${prefix}-landuse`,
      type: 'fill',
      source,
      'source-layer': 'landuse',
      paint: { 'fill-color': '#E0E5EA', 'fill-opacity': 0.45 },
    },
    {
      id: `${prefix}-water`,
      type: 'fill',
      source,
      'source-layer': 'water',
      paint: { 'fill-color': '#C6DAEC' },
    },
    {
      id: `${prefix}-waterway`,
      type: 'line',
      source,
      'source-layer': 'waterway',
      paint: { 'line-color': '#A5C6E1', 'line-width': 1.2 },
    },
    {
      id: `${prefix}-roads`,
      type: 'line',
      source,
      'source-layer': 'transportation',
      paint: {
        'line-color': '#FFFFFF',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 14, 2.2],
      },
    },
    {
      id: `${prefix}-boundaries`,
      type: 'line',
      source,
      'source-layer': 'boundary',
      paint: { 'line-color': '#A6B0BC', 'line-width': 0.8, 'line-dasharray': [3, 3] },
    },
    {
      id: `${prefix}-buildings`,
      type: 'fill',
      source,
      'source-layer': 'building',
      minzoom: 13,
      paint: { 'fill-color': '#BCC5CE', 'fill-opacity': 0.65 },
    },
    {
      id: `${prefix}-water-labels`,
      type: 'symbol',
      source,
      'source-layer': 'water_name',
      layout: { 'text-field': text, 'text-font': [MAP_FONT], 'text-size': 11, 'text-max-width': 8 },
      paint: { 'text-color': '#4B7091', 'text-halo-color': '#E7F0F7', 'text-halo-width': 1 },
    },
    {
      id: `${prefix}-places`,
      type: 'symbol',
      source,
      'source-layer': 'place',
      layout: {
        'text-field': text,
        'text-font': [MAP_FONT],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 12, 15],
        'text-max-width': 9,
      },
      paint: { 'text-color': '#344255', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.2 },
    },
  ];
}
export function onlineWorldMapStyle(): Record<string, unknown> {
  return {
    version: 8,
    glyphs: MAP_FONT_URL,
    sources: {
      world: { type: 'vector', url: MAP_TILEJSON_URL, attribution: WORLD_MAP_ATTRIBUTION },
    },
    layers: [
      { id: 'world-background', type: 'background', paint: { 'background-color': '#F2F4F7' } },
      ...worldVectorLayers(),
    ],
  };
}

/** Cached layers stay below live detail, so coarse downloads never cover newer tiles. */
export function cachedWorldMapStyle(
  online: boolean,
  areas: { area: MapArea; tiles: string }[],
  glyphs: string,
): Record<string, unknown> | null {
  const ready = areas
    .filter(({ area }) => area.usableZoom !== undefined)
    .sort(
      (a, b) =>
        a.area.usableZoom! - b.area.usableZoom! || a.area.updatedAt.localeCompare(b.area.updatedAt),
    );
  if (!online && !ready.length) return null;
  const sources: Record<string, unknown> = {};
  const cachedLayers: object[] = [];
  for (const { area, tiles } of ready) {
    // Changing only this source preserves live map sources during progressive updates.
    const source = `saved-${area.id}-z${area.usableZoom}`;
    sources[source] = {
      type: 'vector',
      tiles: [tiles],
      minzoom: 0,
      maxzoom: area.usableZoom,
      bounds:
        area.bounds[0] < area.bounds[2] ? area.bounds : [-180, area.bounds[1], 180, area.bounds[3]],
      attribution: WORLD_MAP_ATTRIBUTION,
    };
    cachedLayers.push(...worldVectorLayers(source, source, area.labelPolicy !== 'latin'));
  }
  const live = online ? onlineWorldMapStyle() : null;
  const renderedLayers = [...cachedLayers, ...(online ? worldVectorLayers() : [])] as {
    type?: string;
  }[];
  return {
    version: 8,
    glyphs,
    sources: { ...sources, ...((live?.sources as Record<string, unknown>) ?? {}) },
    layers: [
      { id: 'world-background', type: 'background', paint: { 'background-color': '#F2F4F7' } },
      ...renderedLayers.filter((layer) => layer.type !== 'symbol'),
      ...renderedLayers.filter((layer) => layer.type === 'symbol'),
    ],
    metadata: {
      'anchorbuddy:cachedAreas': ready.map(({ area }) => ({
        id: area.id,
        usableZoom: area.usableZoom,
        complete: area.status === 'complete',
      })),
    },
  };
}
