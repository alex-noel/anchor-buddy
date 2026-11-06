import { mkdir, copyFile, readFile, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const { version } = JSON.parse(
  await readFile(new URL('node_modules/maplibre-gl/package.json', root), 'utf8'),
);
// Version the worker and its relative module import together, so an older open tab
// cannot accidentally load the worker from a newer MapLibre release.
const publicRoot = new URL('apps/mobile/public/maplibre/', root);
await rm(publicRoot, { recursive: true, force: true });
const target = new URL(version + '/', publicRoot);
await mkdir(target, { recursive: true });
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  await copyFile(new URL('node_modules/maplibre-gl/dist/' + name, root), new URL(name, target));
}
await copyFile(
  new URL('node_modules/maplibre-gl/LICENSE.txt', root),
  new URL('LICENSE.txt', target),
);
console.log('Prepared local MapLibre web worker assets.');
