let preparing: Promise<void> | null = null;

/** Only production exports install an app-shell worker; Metro must remain uncached. */
export function prepareOfflineShell(): Promise<void> {
  if (__DEV__) return Promise.resolve();
  if (!globalThis.isSecureContext || !('serviceWorker' in navigator)) {
    return Promise.reject(
      new Error('Offline browser startup requires HTTPS or localhost and service worker support.'),
    );
  }
  if (preparing) return preparing;
  preparing = (async () => {
    const registration = await navigator.serviceWorker.register('/anchorbuddy-sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    if (registration.active && navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          finish(
            new Error(
              'Offline application files are not ready. Stay online and retry the map download.',
            ),
          ),
        45_000,
      );
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener('controllerchange', controlled);
        worker?.removeEventListener('statechange', changed);
        error ? reject(error) : resolve();
      };
      const controlled = () => {
        if (navigator.serviceWorker.controller) finish();
      };
      const worker = registration.installing ?? registration.waiting ?? registration.active;
      const changed = () => {
        if (worker?.state === 'redundant')
          finish(
            new Error(
              'Offline application files could not be saved. Check the static server and available storage, then retry.',
            ),
          );
        else controlled();
      };
      navigator.serviceWorker.addEventListener('controllerchange', controlled);
      worker?.addEventListener('statechange', changed);
      changed();
    });
  })().catch((error) => {
    preparing = null;
    throw error;
  });
  return preparing;
}
