import { useEffect, useState } from 'react';
import type { Connectivity } from './connectivityCore';
export function useConnectivity() {
  const [state, setState] = useState<Connectivity>(() => (navigator.onLine ? 'online' : 'offline'));
  useEffect(() => {
    const update = () => setState(navigator.onLine ? 'online' : 'offline');
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return state;
}
