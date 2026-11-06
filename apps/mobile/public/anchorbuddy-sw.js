/* Development transition only. The export:web post-step replaces this file in
 * dist with the production offline worker. Metro never registers it itself.
 * An earlier exported app on the same origin may still be controlled by its
 * cached worker; its normal update check reaches this file and releases it. */
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith('anchorbuddy-app-shell-v1-')) await caches.delete(name);
      }
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: 'window' })) {
        const url = new URL(client.url);
        if (
          url.origin === self.location.origin &&
          (url.pathname === '/' || url.pathname === '/index.html')
        ) {
          await client.navigate(client.url);
        }
      }
    })(),
  );
});
