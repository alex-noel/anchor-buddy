import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as runtime from '../src/index.ts';
import { createDemoPack } from '@anchor-buddy/domain/testing';

test('production entry does not export or transitively import synthetic factories', () => {
  for (const name of ['createDemoPack', 'DEFAULT_VESSEL', 'SAMPLE_PACK'])
    assert.equal(name in runtime, false, `Unexpected production fixture export: ${name}`);
  const visited = new Set<string>();
  function visit(url: URL) {
    if (visited.has(url.href)) return;
    visited.add(url.href);
    assert.doesNotMatch(url.pathname, /\/(?:testing|demo)(?:\/|\.ts$)/);
    const source = readFileSync(url, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))
      visit(new URL(match[1]!, url));
  }
  visit(new URL('../src/index.ts', import.meta.url));
});

test('browser and React Native package conditions block the testing entry', () => {
  for (const condition of ['browser', 'react-native']) {
    const processResult = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        `--conditions=${condition}`,
        '--input-type=module',
        '-e',
        'import("@anchor-buddy/domain/testing")',
      ],
      { encoding: 'utf8' },
    );
    assert.notEqual(processResult.status, 0);
    assert.match(processResult.stderr, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
  }
});

test('new vessel drafts contain no invented measurements or reviewed anchoring guidance', () => {
  const first = runtime.createVesselDraft(),
    second = runtime.createVesselDraft();
  assert.ok(runtime.validateVessel(first).length > 0);
  assert.equal(first.name, '');
  assert.equal(first.lengthM, 0);
  assert.equal(first.beamM, 0);
  assert.equal(first.loadedDraftM, 0);
  assert.equal(first.displacementKg, 0);
  assert.equal(first.anchor.type, '');
  assert.equal(first.anchor.usableLengthM, 0);
  assert.equal(first.anchor.scopeGuidance, null);
  first.anchor.usableLengthM = 100;
  assert.equal(second.anchor.usableLengthM, 0);
});

test('starting search preferences require an explicit caller-selected position', () => {
  assert.throws(() => runtime.createDefaultSearch(undefined as any), /explicit valid map position/);
  assert.throws(() => runtime.createDefaultSearch([181, 0]), /explicit valid map position/);
  const origin: runtime.Position = [139.76, 35.45];
  const search = runtime.createDefaultSearch(origin, '2026-11-11T12:00:00Z');
  assert.deepEqual(runtime.validateSearch(search), []);
  assert.deepEqual(search.origin, origin);
  assert.equal(search.deployedRodeM, undefined);
  assert.deepEqual(search.preferredBeddings, []);
  origin[0] = 0;
  assert.equal(search.origin[0], 139.76);
});

test('live pack boundary rejects synthetic, mixed and unspecified provenance', () => {
  const pack = createDemoPack('2026-11-11T12:00:00Z');
  assert.ok(runtime.validateLiveRegionPack(pack).some((error) => /Synthetic/.test(error)));
  pack.validation.status = 'unreviewed';
  assert.ok(runtime.validateLiveRegionPack(pack).some((error) => /Every live source/.test(error)));
  pack.sources.forEach((source) => {
    source.synthetic = false;
  });
  assert.deepEqual(runtime.validateLiveRegionPack(pack), []);
  delete pack.sources[0]!.synthetic;
  assert.ok(
    runtime.validateLiveRegionPack(pack).some((error) => /unspecified provenance/.test(error)),
  );
  pack.sources[0]!.synthetic = false;
  pack.sources.push({ ...pack.sources[0]!, id: 'mixed-fixture', synthetic: true });
  assert.ok(runtime.validateLiveRegionPack(pack).some((error) => /mixed/.test(error)));
});
