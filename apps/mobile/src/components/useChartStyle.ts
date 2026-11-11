import { useEffect, useState } from 'react';
import type { RegionPack } from '@anchor-buddy/domain';
import { loadInstalledChartStyle } from '../lib/packFiles';
import { loadWorldMapStyle, onlineWorldMapStyle, subscribeMapAreas } from '../lib/worldMaps';
export function useChartStyle(pack: RegionPack, online: boolean) {
  const [revision, setRevision] = useState(0);
  const [world, setWorld] = useState<{ online: boolean; style: Record<string, unknown> | null }>(
    () => ({ online, style: online ? onlineWorldMapStyle() : null }),
  );
  const [installed, setInstalled] = useState<{
    style: Record<string, unknown>;
    offlineReady: boolean;
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
        if (current) setWorld({ online, style: value });
      })
      .catch(() => {
        // A temporary cache/storage failure must not blank a working map.
      });
    return () => {
      current = false;
    };
  }, [online, revision]);
  useEffect(() => {
    let current = true;
    setInstalled(null);
    void loadInstalledChartStyle(pack)
      .then((value) => {
        if (current) setInstalled(value);
      })
      .catch(() => {
        if (current) setInstalled(null);
      });
    return () => {
      current = false;
    };
  }, [pack.id, pack.version]);
  return installed && (online || installed.offlineReady)
    ? installed.style
    : world.online === online
      ? world.style
      : online
        ? onlineWorldMapStyle()
        : null;
}
