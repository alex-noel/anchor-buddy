export interface OfflineShellStatus {
  platform: 'native' | 'browser' | 'development';
  phase: 'not-ready' | 'preparing' | 'ready' | 'error' | 'unsupported';
  ready: boolean;
  updateWaiting: boolean;
  error?: string;
}
export function createOfflineShellState(initial: OfflineShellStatus) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: OfflineShellStatus) {
      if (JSON.stringify(state) === JSON.stringify(next)) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
  };
}
