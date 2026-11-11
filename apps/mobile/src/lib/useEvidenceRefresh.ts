import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { evidenceRefreshDecision } from './connectivityCore';
export function useEvidenceRefresh(options: {
  offline: boolean;
  active: boolean;
  loading: boolean;
  expiresAt?: string;
  lastAttempt: number;
  refresh: () => void;
  cancel: () => void;
}) {
  const current = useRef(options);
  current.current = options;
  const previousOffline = useRef(options.offline);
  const reconnectPending = useRef(false);
  const lastTriggered = useRef(0);
  const check = useCallback(() => {
    const foreground =
      Platform.OS === 'web'
        ? typeof document === 'undefined' || document.visibilityState === 'visible'
        : AppState.currentState === 'active';
    if (!foreground) return;
    const latest = current.current;
    const now = Date.now();
    const decision = evidenceRefreshDecision(
      { ...latest, now, lastAttempt: Math.max(latest.lastAttempt, lastTriggered.current) },
      reconnectPending.current,
    );
    reconnectPending.current = decision.reconnectPending;
    if (decision.refresh) {
      lastTriggered.current = now;
      latest.refresh();
    }
  }, []);
  useEffect(() => {
    const wasOffline = previousOffline.current;
    previousOffline.current = options.offline;
    if (options.offline) {
      reconnectPending.current = false;
      current.current.cancel();
      return;
    }
    if (wasOffline) reconnectPending.current = true;
  }, [options.offline]);
  useEffect(() => {
    if (options.offline || !options.active) {
      reconnectPending.current = false;
      return;
    }
    const decision = evidenceRefreshDecision(
      {
        ...options,
        now: Date.now(),
        lastAttempt: Math.max(options.lastAttempt, lastTriggered.current),
      },
      reconnectPending.current,
    );
    if (decision.retryInMs === null) return;
    const timer = setTimeout(check, decision.retryInMs);
    return () => clearTimeout(timer);
  }, [options.offline, options.active, options.loading, options.lastAttempt, check]);
  useEffect(() => {
    const timer = setInterval(check, 60_000);
    const listener = AppState.addEventListener('change', (value) => {
      if (value === 'active') check();
    });
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      listener.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', check);
    };
  }, [check]);
}
