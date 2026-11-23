import type { Connectivity } from './connectivityCore';

export function evidencePresentation(input: {
  preference: boolean;
  connectivity: Connectivity;
  loading: boolean;
  error: string;
  hasEvidence: boolean;
  partial: boolean;
  expiresAt?: string;
  now: number;
  lastAttempt: number;
  selectedArea: boolean;
}) {
  const offline = input.preference || input.connectivity === 'offline';
  const connection = input.preference
    ? 'Offline planning enabled'
    : input.connectivity === 'offline'
      ? 'No network connection'
      : input.connectivity === 'unknown'
        ? 'Connection status unknown'
        : 'Network connected';
  const expired =
    input.hasEvidence &&
    (!input.expiresAt ||
      !Number.isFinite(Date.parse(input.expiresAt)) ||
      Date.parse(input.expiresAt) <= input.now);
  const freshness = !input.hasEvidence
    ? 'No assessment evidence loaded'
    : expired
      ? 'Evidence expired or expiry unavailable'
      : input.partial
        ? 'Partial evidence · review coverage'
        : 'Review source coverage and dates';
  const remaining = Math.max(0, Math.ceil((60_000 - (input.now - input.lastAttempt)) / 1000));
  const retryHelp = input.preference
    ? 'Turn off Offline planning in Settings to retrieve sources.'
    : input.connectivity === 'offline'
      ? 'Reconnect to retrieve sources.'
      : input.loading
        ? 'Refreshing; available evidence keeps its original dates.'
        : remaining > 0
          ? `Refresh available in ${remaining}s.`
          : undefined;
  return {
    connection,
    freshness,
    expired,
    retrieval: input.loading
      ? 'Retrieving sources'
      : input.error
        ? 'Source retrieval needs attention'
        : undefined,
    retryHelp,
    retryDisabled: offline || input.loading || remaining > 0 || !input.selectedArea,
  };
}
