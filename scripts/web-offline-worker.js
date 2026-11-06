/* This template is populated by prepare-web-offline.mjs, only after a web export. */
const SHELL = /* BUILD_MANIFEST */ null;
const PREFIX = 'anchorbuddy-app-shell-v1-';
const CACHE = PREFIX + SHELL.version;
function assetKey(input) {
  const url = new URL(input, self.location.origin);
  // Font loaders may spell a scoped package as @expo or %40expo. They refer to
  // the same asset, but Cache Storage/URL strings do not normalize this spelling.
  try {
    url.pathname = url.pathname
      .split('/')
      .map((part) => encodeURIComponent(decodeURIComponent(part)))
      .join('/');
    return url.href;
  } catch {
    return '';
  }
}
const assets = new Map(SHELL.assets.map((asset) => [assetKey(asset.url), asset]));

async function checkedResponse(asset) {
  const response = await fetch(
    new Request(asset.url, {
      cache: 'reload',
      credentials: 'same-origin',
      integrity: asset.integrity,
      redirect: 'error',
    }),
  );
  if (!response.ok || response.type === 'opaque')
    throw new Error('App shell resource unavailable: ' + asset.url);
  const type = response.headers.get('Content-Type') || '';
  if (/\.(?:m?js)$/.test(asset.url) && !/(?:javascript|ecmascript)/i.test(type)) {
    throw new Error('Serve JavaScript and .mjs workers with a JavaScript MIME type: ' + asset.url);
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        // Complete and verify every resource before the new worker can activate.
        for (const asset of SHELL.assets) await cache.put(asset.url, await checkedResponse(asset));
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
      // Updates wait for existing tabs to close, preserving their matching shell.
      // A first installation activates immediately through the normal lifecycle.
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // This app is deployed at the origin root. Do not intercept API, map-provider,
  // analysis-pack or arbitrary same-origin requests; these keep their own rules.
  const navigation =
    request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html');
  const asset = assets.get(assetKey(navigation ? '/index.html' : url.href));
  if (!asset) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const saved = await cache.match(asset.url);
      if (saved) return saved;
      const response = await checkedResponse(asset);
      await cache.put(asset.url, response.clone());
      return response;
    })(),
  );
});
