import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkRuntimeGraph } from './check-runtime.mjs';

function project(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'anchor-runtime-guard-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, contents] of Object.entries({
    'package.json': '{"workspaces":[]}',
    ...files,
  })) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), contents);
  }
  return root;
}

test('runtime traversal handles cycles and excludes type-only imports and unreachable test fixtures', (t) => {
  const root = project(t, {
    'entry.ts': `import './live'; import type { Fixture } from './testing'; import { type Other } from './fixtures'; export type * from './testing'; const help = 'fixtures are not runtime data';`,
    'live.ts': `export * from './entry'; export const live = true;`,
    'testing.ts': `export interface Fixture { name: string };`,
    'fixtures.ts': `export interface Other { name: string };`,
    'unreachable.test.ts': `import './mock';`,
  });
  const result = checkRuntimeGraph(root, ['entry.ts']);
  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.files, ['entry.ts', 'live.ts']);
});

test('a test-only dependency behind a native platform variant is rejected with its import chain', (t) => {
  const root = project(t, {
    'entry.tsx': `import View from './View';`,
    'View.web.tsx': `export default function View() { return null; }`,
    'View.native.tsx': `export { replay as default } from './testing/replay';`,
    'testing/replay.ts': `export const replay = () => null;`,
  });
  const result = checkRuntimeGraph(root, ['entry.tsx']);
  assert.equal(result.violations.length, 1);
  assert.deepEqual(result.violations[0].chain, [
    'entry.tsx',
    'View.native.tsx',
    'testing/replay.ts',
  ]);
});

test('workspace reexports and conditional export targets cannot leak fixtures into API or app code', (t) => {
  const root = project(t, {
    'package.json': '{"workspaces":["packages/*"]}',
    'entry.ts': `export * from '@test/domain';`,
    'packages/domain/package.json': JSON.stringify({
      name: '@test/domain',
      exports: {
        '.': './src/index.ts',
        './testing': { browser: null, default: './src/testing.ts' },
      },
    }),
    'packages/domain/src/index.ts': `export * from './adapter.js';`,
    'packages/domain/src/adapter.ts': `export * from '@test/domain/testing';`,
    'packages/domain/src/testing.ts': `export const record = { invented: true };`,
  });
  const result = checkRuntimeGraph(root, ['entry.ts']);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].file, 'packages/domain/src/testing.ts');
  assert.equal(result.violations[0].chain.length, 4);
});

test('literal dynamic imports and require follow local modules; computed and broken imports fail closed', (t) => {
  const root = project(t, {
    'entry.ts': `void import('./later.js'); const asset = require('./mock.json'); void import(variable); import './missing';`,
    'later.ts': `export const ready = true;`,
    'mock.json': '{}',
  });
  const result = checkRuntimeGraph(root, ['entry.ts']);
  assert.ok(result.files.includes('later.ts'));
  assert.equal(result.violations.length, 3);
  assert.ok(result.violations.some((item) => item.file === 'mock.json'));
  assert.ok(result.violations.some((item) => item.message.includes('Computed')));
  assert.ok(result.violations.some((item) => item.message.includes('./missing')));
});

test('browser package overrides and mobile module main variants are included', (t) => {
  const root = project(t, {
    'package.json': '{"workspaces":["modules/*"]}',
    'entry.ts': `import '@test/watch';`,
    'modules/watch/package.json': JSON.stringify({
      name: '@test/watch',
      main: 'src/index.ts',
      browser: { './src/index.ts': './src/simulator.ts' },
    }),
    'modules/watch/src/index.ts': `export const native = true;`,
    'modules/watch/src/index.ios.ts': `export const native = true;`,
    'modules/watch/src/simulator.ts': `export const fake = true;`,
  });
  const result = checkRuntimeGraph(root, ['entry.ts']);
  assert.ok(result.files.includes('modules/watch/src/index.ios.ts'));
  assert.equal(result.violations[0].file, 'modules/watch/src/simulator.ts');
});
