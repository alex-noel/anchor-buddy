import { Directory, File, Paths } from 'expo-file-system';
import {
  OfflineManager,
  type OfflinePack,
  type OfflinePackStatus,
} from '@maplibre/maplibre-react-native';
import type { RegionPack } from '@anchor-buddy/domain';
import { getLocal, setLocal } from './storage';
import {
  validSegment,
  validateManifest,
  validateOfflineChartStyle,
  type Manifest,
} from './packInstall';

type Installed = { pack: RegionPack; manifest?: Manifest; assetKey?: string; savedAt: string };
export interface ChartCacheStatus {
  id: string;
  complete: boolean;
  resources: number;
  bytes: number;
}
export async function beginPackStage(sessionId: string) {
  if (!validSegment(sessionId)) throw new Error('Invalid download session.');
  const base = new Directory(Paths.document, 'regional-packs');
  base.create({ intermediates: true, idempotent: true });
  const directory = new Directory(base, 'stage-' + sessionId);
  directory.create({ intermediates: true });
  return {
    async stage(name: string, bytes: Uint8Array) {
      if (!validSegment(name)) throw new Error('Invalid asset name.');
      await new File(directory, name).write(bytes);
    },
    async finalize() {
      const key = 'installed-' + sessionId;
      await directory.move(new Directory(base, key));
      return key;
    },
    async rollback() {
      if (directory.exists) directory.delete();
    },
  };
}
async function installedStyle(pack: RegionPack) {
  const record = await getLocal<Installed>('active-region');
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
  const file = new File(
    Paths.document,
    'regional-packs',
    record.assetKey,
    record.manifest.offlineChart.styleAsset,
  );
  const asset = record.manifest.assets.find(
    (item) => item.path === record.manifest!.offlineChart!.styleAsset,
  )!;
  if (!file.exists || file.size !== asset.bytes || (await file.digest('SHA-256')) !== asset.sha256)
    throw new Error('Stored chart style failed its integrity check.');
  const style: unknown = JSON.parse(await file.text());
  validateOfflineChartStyle(style, record.manifest.offlineChart);
  return { style, file, record, approval: record.manifest.offlineChart };
}
export async function loadInstalledChartStyle(
  pack: RegionPack,
): Promise<{ style: Record<string, unknown>; offlineReady: boolean } | null> {
  const source = await installedStyle(pack);
  if (!source) return null;
  const cached = await getLocal<ChartCacheStatus>('chart-cache:' + source.record.assetKey);
  let offlineReady = false;
  try {
    const nativePack = cached
      ? await OfflineManager.getPack(cached.id)
      : (await OfflineManager.getPacks()).find(
          (item) => item.metadata.anchoraiAssetKey === source.record.assetKey,
        );
    offlineReady = !!nativePack && (await nativePack.status()).state === 'complete';
  } catch {
    offlineReady = false;
  }
  return { style: source.style, offlineReady };
}
export async function downloadOfflineChart(
  pack: RegionPack,
  onProgress: (message: string) => void,
): Promise<ChartCacheStatus> {
  const source = await installedStyle(pack);
  if (!source)
    throw new Error(
      'This regional pack has no approved operator-owned or licensed offline chart style.',
    );
  const { approval, record, file } = source;
  const key = record.assetKey!;
  const existing = (await OfflineManager.getPacks()).find(
    (item) => item.metadata.anchoraiAssetKey === key,
  );
  const existingStatus = existing ? await existing.status() : null;
  let result: ChartCacheStatus;
  if (existing && existingStatus?.state === 'complete') {
    result = {
      id: existing.id,
      complete: true,
      resources: existingStatus.completedResourceCount,
      bytes: existingStatus.completedResourceSize,
    };
  } else {
    result = await new Promise<ChartCacheStatus>((resolve, reject) => {
      let current: OfflinePack | undefined = existing;
      let finished = false;
      const done = (error?: Error, status?: OfflinePackStatus) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (current) OfflineManager.removeListener(current.id);
        if (error) {
          if (current) void current.pause().catch(() => {});
          reject(error);
        } else if (status)
          resolve({
            id: status.id,
            complete: true,
            resources: status.completedResourceCount,
            bytes: status.completedResourceSize,
          });
      };
      const timer = setTimeout(
        () =>
          done(
            new Error(
              'Chart download timed out. Partial resources can resume later; the active analysis pack is unchanged.',
            ),
          ),
        10 * 60 * 1000,
      );
      const progress = (offline: OfflinePack, status: OfflinePackStatus) => {
        current = offline;
        onProgress(
          'Chart tiles: ' +
            Math.floor(status.percentage) +
            '% · ' +
            status.completedResourceCount +
            ' resources',
        );
        if (status.state === 'complete') done(undefined, status);
      };
      const error = (_pack: OfflinePack, value: { message: string }) =>
        done(new Error('Chart download interrupted: ' + value.message));
      void (async () => {
        try {
          OfflineManager.setTileCountLimit(100000);
          if (existing) {
            await OfflineManager.addListener(existing.id, progress, error);
            await existing.resume();
          } else
            current = await OfflineManager.createPack(
              {
                mapStyle: file.uri,
                bounds: [...pack.bounds],
                minZoom: approval.minZoom,
                maxZoom: approval.maxZoom,
                metadata: {
                  anchoraiAssetKey: key,
                  regionId: pack.id,
                  version: pack.version,
                  styleUrl: approval.styleUrl,
                },
              },
              progress,
              error,
            );
          if (!finished && current) progress(current, await current.status());
        } catch (error) {
          done(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    });
  }
  await setLocal('chart-cache:' + key, result);
  return result;
}
