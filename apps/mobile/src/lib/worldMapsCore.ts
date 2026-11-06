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
export const MAX_MAP_BYTES = 50_000_000;
export const MAX_MAP_TILES = 3000;
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
      (tileCount > MAX_MAP_TILES || tileCount * 30_000 + 2_000_000 > MAX_MAP_BYTES)
    ) {
      maxZoom--;
      tileCount = mapTiles(input.bounds, maxZoom).length;
    }
  if (tileCount > MAX_MAP_TILES)
    throw new Error('This area exceeds 3,000 tiles. Reduce the area or offline detail.');
  return {
    tileCount,
    estimatedBytes: tileCount * 30_000 + 2_000_000,
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
      const text = p['name:latin'] ?? p['name:en'] ?? p.name;
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
  const listMapAreas = async () =>
    (await io.list())
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
      await io.saveManifest(manifest);
      changed();
    }
    return { ...manifest.area };
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
    const report = async () => {
      if (!manifest) return;
      manifest.area.updatedAt = new Date().toISOString();
      manifest.area.bytes = Object.values(manifest.resources).reduce((sum, r) => sum + r.bytes, 0);
      manifest.area.completedTiles = Object.values(manifest.resources).filter(
        (r) => r.kind === 'tile',
      ).length;
      await io.saveManifest(manifest);
      onProgress?.({ ...manifest.area });
      if (manifest.area.status === 'complete') changed();
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
          },
        };
      }
      delete manifest.area.error;
      await report();
      const ranges = new Set(manifest.glyphRanges);
      const ensure = async (path: string, url: string, kind: 'tile' | 'glyph') => {
        if (controller.signal.aborted) throw new Error('Map download cancelled.');
        const record = manifest!.resources[path];
        let bytes = record ? await io.read(id, path) : null;
        if (
          bytes &&
          (bytes.byteLength !== record!.bytes || (await io.hash(bytes)) !== record!.sha256)
        )
          bytes = null;
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
            for (const range of tileGlyphRanges(bytes)) ranges.add(range);
          } catch (error) {
            delete manifest!.resources[path];
            throw error;
          }
        }
      };
      const tiles = mapTiles(manifest.area.bounds, manifest.area.maxZoom);
      for (let index = 0; index < tiles.length; index += 3) {
        const outcomes = await Promise.allSettled(
          tiles
            .slice(index, index + 3)
            .map((tile) => ensure(tile.path, mapTileUrl(manifest!.tileTemplate, tile), 'tile')),
        );
        manifest.glyphRanges = [...ranges].sort();
        await report();
        const failure = outcomes.find((outcome) => outcome.status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
      }
      for (const range of ranges)
        await ensure(
          `glyphs/${range}.pbf`,
          MAP_FONT_URL.replace('{fontstack}', encodeURIComponent(MAP_FONT)).replace(
            '{range}',
            range,
          ),
          'glyph',
        );
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

export function worldVectorLayers(source = 'world', prefix = 'world') {
  const text = ['coalesce', ['get', 'name:latin'], ['get', 'name:en'], ['get', 'name']];
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
