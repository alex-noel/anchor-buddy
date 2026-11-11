import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scanner = fileURLToPath(new URL('./scan.mjs', import.meta.url));
const canary = 'ghp_' + 'a'.repeat(36);

function temporaryDirectory(t) {
  const dir = mkdtempSync(join(tmpdir(), 'anchor-scan-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function scan(dir, args, status, message) {
  const result = spawnSync(process.execPath, [scanner, ...args], { cwd: dir, encoding: 'utf8' });
  const output = result.stdout + result.stderr;
  assert.equal(result.status, status);
  assert.match(output, message);
  assert.ok(!output.includes(canary), 'Scanner output contained the credential marker');
  return output;
}

test('source scanner checks tracked and new files and redacts findings', (t) => {
  const dir = temporaryDirectory(t);
  execFileSync('git', ['init', '-q'], { cwd: dir });
  writeFileSync(join(dir, '.env.example'), 'PUBLIC_SAMPLE=true');
  writeFileSync(join(dir, 'notes.md'), 'Public documentation');
  scan(dir, ['source'], 0, /Source scan passed/);

  writeFileSync(join(dir, 'notes.md'), canary);
  scan(dir, ['source'], 1, /1 credential or private-file findings/);
  writeFileSync(join(dir, 'notes.md'), 'Public documentation');

  writeFileSync(join(dir, '.gitignore'), '*.gpx\n');
  writeFileSync(join(dir, 'private-track.gpx'), '<gpx/>');
  scan(dir, ['source'], 0, /Source scan passed/);
  execFileSync('git', ['add', '-f', 'private-track.gpx'], { cwd: dir });
  const output = scan(dir, ['source'], 1, /1 credential or private-file findings/);
  assert.doesNotMatch(output, /private-track/);
});

test('bundle scanner requires readable source maps and rejects embedded test modules and credentials', (t) => {
  const dir = temporaryDirectory(t);
  const bundle = join(dir, 'index.js');
  const map = join(dir, 'index.js.map');
  writeFileSync(bundle, 'console.log("public bundle");');
  scan(dir, ['web', '.'], 1, /could not read the expected input/);
  writeFileSync(map, '{' + canary);
  scan(dir, ['web', '.'], 1, /could not read the expected input/);
  writeFileSync(map, JSON.stringify({ version: 3, sources: ['packages/domain/src/testing.ts'] }));
  scan(dir, ['web', '.'], 1, /1 test-runtime findings/);
  writeFileSync(
    map,
    JSON.stringify({
      version: 3,
      sections: [
        {
          offset: { line: 0, column: 0 },
          map: {
            version: 3,
            sourceRoot: '/modules/anchor-watch/src',
            sources: ['testing/kernel.ts'],
          },
        },
      ],
    }),
  );
  scan(dir, ['web', '.'], 1, /1 test-runtime findings/);
  writeFileSync(map, JSON.stringify({ version: 3, sources: ['apps/mobile/src/App.tsx'] }));
  writeFileSync(bundle, `console.log('${canary}');`);
  scan(dir, ['web', '.'], 1, /1 credential or private-file findings/);
  writeFileSync(bundle, 'console.log("public bundle");');
  scan(dir, ['web', '.'], 0, /Bundle scan passed/);
  scan(dir, ['hermes', '.'], 1, /could not read the expected input/);
});
