import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { connectivityFromState, type Connectivity } from './connectivityCore';

/** Connectivity is a hint, never proof that a particular data provider is reachable. */
export function useConnectivity() {
  const [state, setState] = useState<Connectivity>('unknown');
  useEffect(() => {
    let active = true;
    let version = 0;
    const refresh = () => {
      const request = ++version;
      void Network.getNetworkStateAsync()
        .then((value) => {
          if (active && request === version) setState(connectivityFromState(value));
        })
        .catch(() => {
          if (active && request === version) setState('unknown');
        });
    };
    const subscription = Network.addNetworkStateListener((value) => {
      // An event describes a newer state than an outstanding initial/foreground probe.
      version++;
      if (active) setState(connectivityFromState(value));
    });
    const foreground = AppState.addEventListener('change', (value) => {
      if (value === 'active') refresh();
    });
    refresh();
    return () => {
      active = false;
      subscription.remove();
      foreground.remove();
    };
  }, []);
  return state;
}
