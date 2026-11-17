import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { prepareWebOffline } from '../../../scripts/prepare-web-offline.mjs';

const host = '127.0.0.1';
const port = 18082;
const mobile = fileURLToPath(new URL('../', import.meta.url));
const output = await mkdtemp(join(tmpdir(), 'anchor-buddy-e2e-'));
const stop = new AbortController();
const shutdown = () => stop.abort();
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
};

const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(output, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(output + sep) || request.method !== 'GET') {
      response.writeHead(404).end();
      return;
    }
    const bytes = await readFile(file);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
    });
    response.end(bytes);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
});

try {
  const expo = new URL('bin/cli', import.meta.resolve('expo/package.json'));
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [fileURLToPath(expo), 'export', '--platform', 'web', '--output-dir', output, '--source-maps'],
    {
      cwd: mobile,
      env: {
        ...process.env,
        EXPO_NO_DOTENV: '1',
        EXPO_NO_TELEMETRY: '1',
        EXPO_OFFLINE: '1',
        EXPO_PUBLIC_FOLDER: 'public',
        EXPO_PUBLIC_API_URL: `http://${host}:${port}`,
      },
      signal: stop.signal,
    },
  );
  console.log(stdout.trim());

  // Prepare the versioned worker in the isolated export. The usual preexport
  // command writes to the mobile public directory shared with local dev servers.
  const maplibreDir = dirname(fileURLToPath(import.meta.resolve('maplibre-gl/package.json')));
  const { version } = JSON.parse(await readFile(join(maplibreDir, 'package.json'), 'utf8'));
  const workerDir = join(output, 'maplibre', version);
  await mkdir(workerDir, { recursive: true });
  for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
    await copyFile(join(maplibreDir, 'dist', file), join(workerDir, file));
  }
  await prepareWebOffline(output);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('close', resolve);
    server.listen({ host, port, signal: stop.signal });
    if (stop.signal.aborted) server.close();
  });
} catch (error) {
  if (!stop.signal.aborted) {
    console.error(error.stderr || error.message);
    process.exitCode = 1;
  }
} finally {
  await rm(output, { recursive: true, force: true });
}
