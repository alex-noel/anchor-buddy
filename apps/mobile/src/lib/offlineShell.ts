import type { OfflineShellStatus } from './offlineShellState';
const status: OfflineShellStatus = {
  platform: 'native',
  phase: 'ready',
  ready: true,
  updateWaiting: false,
};
/** Native binaries contain application code; this is not a browser worker claim. */
export async function prepareOfflineShell(): Promise<void> {}
export const getOfflineShellStatus = () => status;
export const subscribeOfflineShell = (_listener: () => void) => () => {};
