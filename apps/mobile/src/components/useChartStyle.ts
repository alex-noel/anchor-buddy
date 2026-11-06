import { useEffect, useState } from 'react';
import type { RegionPack } from '@anchor-buddy/domain';
import { loadInstalledChartStyle } from '../lib/packFiles';
import { loadWorldMapStyle, onlineWorldMapStyle, subscribeMapAreas } from '../lib/worldMaps';
export function useChartStyle(pack: RegionPack, online: boolean) {
  const [revision, setRevision] = useState(0);
  const [world, setWorld] = useState<Record<string, unknown> | null>(() =>
    online ? onlineWorldMapStyle() : null,
  );
  const [installed, setInstalled] = useState<{
    style: Record<string, unknown>;
    offlineReady: boolean;
  } | null>(null);
  useEffect(() => subscribeMapAreas(() => setRevision((value) => value + 1)), []);
  useEffect(() => {
    let current = true;
    setInstalled(null);
    setWorld(online ? onlineWorldMapStyle() : null);
    void loadWorldMapStyle(online)
      .then((value) => {
        if (current) setWorld(value);
      })
      .catch(() => {
        if (current) setWorld(null);
      });
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
  }, [pack.id, pack.version, online, revision]);
  return installed && (online || installed.offlineReady) ? installed.style : world;
}
