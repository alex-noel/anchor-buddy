import { createOfflineShellState, type OfflineShellStatus } from './offlineShellState';
const development = typeof __DEV__ !== 'undefined' && __DEV__;
const store = createOfflineShellState({
  platform: development ? 'development' : 'browser',
  phase: development ? 'unsupported' : 'not-ready',
  ready: false,
  updateWaiting: false,
});
let preparing: Promise<void> | null = null;
let observing = false;
const observed = new WeakSet<ServiceWorkerRegistration>();
const supported = () => globalThis.isSecureContext && 'serviceWorker' in navigator;
const isAppWorker = (worker: ServiceWorker | null | undefined) =>
  worker?.scriptURL === new URL('/anchorbuddy-sw.js', location.origin).href;
const controlsApp = (registration: ServiceWorkerRegistration) =>
  Boolean(
    registration.scope === new URL('/', location.origin).href &&
    isAppWorker(registration.active) &&
    isAppWorker(navigator.serviceWorker.controller) &&
    registration.active &&
    navigator.serviceWorker.controller?.scriptURL === registration.active.scriptURL,
  );
function report(registration: ServiceWorkerRegistration, error?: string) {
  const ready = controlsApp(registration);
  store.set({
    platform: 'browser',
    phase: ready ? 'ready' : error ? 'error' : 'not-ready',
    ready,
    updateWaiting: isAppWorker(registration.waiting),
    ...(error ? { error } : {}),
  });
}
function observe(registration: ServiceWorkerRegistration) {
  if (observed.has(registration)) return;
  observed.add(registration);
  const track = () => {
    const worker = registration.installing;
    if (!worker) {
      report(registration);
      return;
    }
    const changed = () => {
      if (worker.state === 'redundant')
        report(
          registration,
          'An application update could not be verified. Existing complete files remain available; stay online and retry.',
        );
      else report(registration);
    };
    worker.addEventListener('statechange', changed);
  };
  registration.addEventListener('updatefound', track);
  navigator.serviceWorker.addEventListener('controllerchange', () => report(registration));
  track();
}
function beginObservation() {
  if (observing || development) return;
  observing = true;
  if (!supported()) {
    store.set({
      platform: 'browser',
      phase: 'unsupported',
      ready: false,
      updateWaiting: false,
      error: 'Offline browser startup requires HTTPS or localhost and service worker support.',
    });
    return;
  }
  void navigator.serviceWorker
    .getRegistration('/')
    .then((registration) => {
      if (registration) {
        observe(registration);
        report(registration);
      }
    })
    .catch((error) => store.set({ ...store.get(), phase: 'error', error: String(error) }));
}
export const getOfflineShellStatus = () => store.get();
export function subscribeOfflineShell(listener: () => void) {
  const unsubscribe = store.subscribe(listener);
  beginObservation();
  return unsubscribe;
}
/** Only production exports install an app-shell worker; Metro remains uncached. */
export function prepareOfflineShell(): Promise<void> {
  if (development) return Promise.resolve();
  if (preparing) return preparing;
  preparing = (async () => {
    if (!supported())
      throw new Error(
        'Offline browser startup requires HTTPS or localhost and service worker support.',
      );
    store.set({ ...store.get(), phase: 'preparing', error: undefined });
    const registration = await navigator.serviceWorker.register('/anchorbuddy-sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    if (!registration)
      throw new Error(
        'This browser blocked saving application files. Allow service workers and retry.',
      );
    observe(registration);
    if (controlsApp(registration)) {
      await registration.update();
      report(registration);
      return;
    }
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const worker = registration.installing ?? registration.waiting ?? registration.active;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener('controllerchange', controlled);
        worker?.removeEventListener('statechange', changed);
        if (error) reject(error);
        else {
          report(registration);
          resolve();
        }
      };
      const controlled = () => {
        if (controlsApp(registration)) finish();
      };
      const changed = () => {
        if (worker?.state === 'redundant')
          finish(
            new Error(
              'Application files could not be verified or saved. Check available storage, stay online and retry.',
            ),
          );
        else controlled();
      };
      const timeout = setTimeout(
        () => finish(new Error('Offline application files are not ready. Stay online and retry.')),
        45_000,
      );
      navigator.serviceWorker.addEventListener('controllerchange', controlled);
      worker?.addEventListener('statechange', changed);
      changed();
    });
  })()
    .catch((error) => {
      const previous = store.get();
      store.set({
        ...previous,
        phase: previous.ready ? 'ready' : 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    })
    .finally(() => {
      preparing = null;
    });
  return preparing;
}
