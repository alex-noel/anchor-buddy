import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const generated = new Set(['anchorbuddy-sw.js', 'offline-shell-manifest.json']);
const MAX_SHELL_BYTES = 30_000_000;

export async function prepareWebOffline(directory) {
  const assets = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Offline shell cannot contain symlinks.');
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await visit(path);
      else {
        const name = relative(directory, path).split(sep).join('/');
        if (
          generated.has(name) ||
          name.endsWith('.map') ||
          name === 'metadata.json' ||
          name.endsWith('LICENSE.txt')
        )
          continue;
        const bytes = await readFile(path);
        assets.push({
          url: '/' + name.split('/').map(encodeURIComponent).join('/'),
          bytes: bytes.byteLength,
          integrity: 'sha256-' + createHash('sha256').update(bytes).digest('base64'),
        });
      }
    }
  }
  await visit(directory);
  assets.sort((a, b) => a.url.localeCompare(b.url));
  if (
    !assets.some((asset) => asset.url === '/index.html') ||
    !assets.some((asset) => /\/maplibre\/[^/]+\/maplibre-gl-worker\.mjs$/.test(asset.url)) ||
    !assets.some((asset) => /\/maplibre\/[^/]+\/maplibre-gl-shared\.mjs$/.test(asset.url))
  ) {
    throw new Error(
      'Export is missing index.html or the versioned MapLibre worker modules. Run the full export:web command.',
    );
  }
  const bytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  if (bytes > MAX_SHELL_BYTES || assets.length > 500)
    throw new Error(
      'Offline application shell exceeds its bounded size; review the exported assets.',
    );
  const template = await readFile(resolve(root, 'scripts/web-offline-worker.js'), 'utf8');
  const version = createHash('sha256')
    .update(JSON.stringify(assets))
    .update(template)
    .digest('hex')
    .slice(0, 20);
  const manifest = { version, bytes, assets };
  await writeFile(
    resolve(directory, 'offline-shell-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  await writeFile(
    resolve(directory, 'anchorbuddy-sw.js'),
    template.replace('/* BUILD_MANIFEST */ null', JSON.stringify(manifest)),
  );
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(root, process.argv[2] || 'apps/mobile/dist');
  const manifest = await prepareWebOffline(directory);
  console.log(
    `Prepared offline application shell: ${manifest.assets.length} resources, ${(manifest.bytes / 1_000_000).toFixed(1)} MB, version ${manifest.version}.`,
  );
}
