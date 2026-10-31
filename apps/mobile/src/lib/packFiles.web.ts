import type { RegionPack } from '@anchor-buddy/domain';
import { getLocal } from './storage';
import {
  validSegment,
  validateManifest,
  validateOfflineChartStyle,
  type Manifest,
} from './packInstall';
const cacheName = (key: string) => 'anchorai-regional-assets-v2-' + key;
const assetUrl = (key: string, name: string) =>
  location.origin + '/__offline/' + encodeURIComponent(key) + '/' + encodeURIComponent(name);
export async function beginPackStage(sessionId: string) {
  if (!validSegment(sessionId)) throw new Error('Invalid download session.');
  if (!globalThis.caches)
    throw new Error(
      'This browser cannot persist regional assets. Use HTTPS or a native development build.',
    );
  const key = 'installed-' + sessionId;
  const cache = await caches.open(cacheName(key));
  return {
    async stage(name: string, bytes: Uint8Array) {
      if (!validSegment(name)) throw new Error('Invalid asset name.');
      await cache.put(new Request(assetUrl(key, name)), new Response(new Uint8Array(bytes).buffer));
    },
    async finalize() {
      return key;
    },
    async rollback() {
      await caches.delete(cacheName(key));
    },
  };
}
export async function loadInstalledChartStyle(
  pack: RegionPack,
): Promise<{ style: Record<string, unknown>; offlineReady: boolean } | null> {
  const record = await getLocal<{ pack: RegionPack; manifest?: Manifest; assetKey?: string }>(
    'active-region',
  );
  if (
    !record?.manifest?.offlineChart ||
    !record.assetKey ||
    record.pack.id !== pack.id ||
    record.pack.version !== pack.version
  )
    return null;
  validateManifest(record.manifest, { regionId: pack.id, version: pack.version });
  if (
    !validSegment(record.assetKey) ||
    !pack.chart.offlineAllowed ||
    pack.chart.styleUrl !== record.manifest.offlineChart.styleUrl
  )
    throw new Error('Stored chart entitlement does not match this region.');
  const asset = record.manifest.assets.find(
    (item) => item.path === record.manifest!.offlineChart!.styleAsset,
  )!;
  const response = await (
    await caches.open(cacheName(record.assetKey))
  ).match(assetUrl(record.assetKey, asset.path));
  if (!response) throw new Error('Stored chart style is missing.');
  const bytes = await response.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
  if (bytes.byteLength !== asset.bytes || hash !== asset.sha256)
    throw new Error('Stored chart style failed its integrity check.');
  const style: unknown = JSON.parse(new TextDecoder().decode(bytes));
  validateOfflineChartStyle(style, record.manifest.offlineChart);
  return { style, offlineReady: false };
}
export async function downloadOfflineChart(
  _pack: RegionPack,
  _onProgress: (message: string) => void,
): Promise<{ id: string; complete: boolean; resources: number; bytes: number }> {
  throw new Error(
    'Offline chart tile downloads require the iOS or Android development build. The web preview saves analysis assets only.',
  );
}
