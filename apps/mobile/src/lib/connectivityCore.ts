export type Connectivity = 'online' | 'offline' | 'unknown';

export function connectivityFromState(state: {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}): Connectivity {
  if (state.isConnected === false || state.isInternetReachable === false) return 'offline';
  if (state.isConnected === true || state.isInternetReachable === true) return 'online';
  return 'unknown';
}

export interface EvidenceRefreshState {
  offline: boolean;
  active: boolean;
  loading: boolean;
  expiresAt?: string;
  now: number;
  lastAttempt: number;
  force?: boolean;
}

export function shouldRefreshEvidence(input: EvidenceRefreshState) {
  if (input.offline || !input.active || input.loading || input.now - input.lastAttempt < 60_000)
    return false;
  return (
    input.force === true ||
    !input.expiresAt ||
    !Number.isFinite(Date.parse(input.expiresAt)) ||
    Date.parse(input.expiresAt) <= input.now
  );
}

/** A reconnect request survives a short outage's cooldown and any in-flight request. */
export function evidenceRefreshDecision(input: EvidenceRefreshState, reconnectPending: boolean) {
  if (input.offline || !input.active)
    return { refresh: false, reconnectPending: false, retryInMs: null };
  const refresh = shouldRefreshEvidence({ ...input, force: reconnectPending || input.force });
  return {
    refresh,
    reconnectPending: reconnectPending && !refresh,
    retryInMs:
      reconnectPending && !input.loading
        ? Math.max(1000, 60_000 - (input.now - input.lastAttempt))
        : null,
  };
}
