import { useEffect, useState } from 'react';
import type { RegionPack } from '@anchor-buddy/domain';
import { loadInstalledChartStyle } from '../lib/packFiles';
export function useChartStyle(pack: RegionPack, online: boolean) {
  const [installed, setInstalled] = useState<{
    style: Record<string, unknown>;
    offlineReady: boolean;
  } | null>(null);
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
  }, [pack.id, pack.version, online]);
  return installed && (online || installed.offlineReady) ? installed.style : null;
}
