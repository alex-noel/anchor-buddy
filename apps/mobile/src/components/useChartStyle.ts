import { useEffect, useState } from 'react';
import type { RegionPack } from '@anchor-buddy/domain';
import { loadInstalledChartStyle } from '../lib/packFiles';
import { loadWorldMapStyle, onlineWorldMapStyle, subscribeMapAreas } from '../lib/worldMaps';
export type CachedChartState = 'checking' | 'available' | 'unconfirmed';

const onlineStyle = onlineWorldMapStyle();

export function useChartStyle(pack: RegionPack, online: boolean, attempt: number) {
  const [revision, setRevision] = useState(0);
  const [world, setWorld] = useState<{
    online: boolean;
    style: Record<string, unknown> | null;
    checked: boolean;
  }>(() => ({ online, style: online ? onlineStyle : null, checked: false }));
  const [installed, setInstalled] = useState<{
    packId: string;
    packVersion: string;
    chart: Awaited<ReturnType<typeof loadInstalledChartStyle>>;
  } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeMapAreas(() => {
      if (!timer)
        timer = setTimeout(() => {
          timer = undefined;
          setRevision((value) => value + 1);
        }, 1000);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    let current = true;
    void loadWorldMapStyle(online)
      .then((value) => {
        if (current) setWorld({ online, style: value, checked: true });
      })
      .catch(() => {
        // A temporary cache/storage failure must not blank a working map.
        if (current)
          setWorld((previous) => ({
            online,
            style: previous.online === online ? previous.style : online ? onlineStyle : null,
            checked: true,
          }));
      });
    return () => {
      current = false;
    };
  }, [online, revision, attempt]);
  useEffect(() => {
    let current = true;
    const finish = (chart: Awaited<ReturnType<typeof loadInstalledChartStyle>>) => {
      if (current) setInstalled({ packId: pack.id, packVersion: pack.version, chart });
    };
    void loadInstalledChartStyle(pack)
      .then(finish)
      .catch(() => finish(null));
    return () => {
      current = false;
    };
  }, [pack.id, pack.version, attempt]);
  const isCurrentPack = installed?.packId === pack.id && installed.packVersion === pack.version;
  const chart = isCurrentPack ? installed.chart : null;
  if (chart && (online || chart.offlineReady))
    return {
      style: chart.style,
      cached: chart.offlineReady ? 'available' : 'unconfirmed',
    } as const;
  const currentWorld = world.online === online ? world : null;
  const metadata = currentWorld?.style?.metadata as Record<string, unknown> | undefined;
  const cachedAreas = metadata?.['anchorbuddy:cachedAreas'];
  const cached: CachedChartState =
    Array.isArray(cachedAreas) && cachedAreas.length
      ? 'available'
      : !currentWorld?.checked || !isCurrentPack
        ? 'checking'
        : 'unconfirmed';
  return { style: currentWorld?.style ?? (online ? onlineStyle : null), cached };
}
