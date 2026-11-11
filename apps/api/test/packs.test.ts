import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { FilePackStore, type PackManifest } from '../src/packs.js';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'anchorbuddy-api-'));
  const directory = join(root, 'keys', 'v1');
  await mkdir(directory, { recursive: true });
  const content = Buffer.from('{"test":true}');
  const manifest: PackManifest = {
    schemaVersion: 1,
    regionId: 'keys',
    version: 'v1',
    createdAt: '2026-10-30T00:00:00Z',
    validUntil: '2099-01-01T00:00:00Z',
    label: 'fixture',
    synthetic: false,
    releaseStatus: 'review-required',
    bounds: [-82, 24, -80, 26],
    provenance: [
      {
        id: 'test-only',
        url: 'https://fixture.example/source',
        retrievedAt: '2026-10-30T00:00:00Z',
        attribution: 'Isolated test fixture',
        synthetic: false,
      },
    ],
    review: {
      maritime: false,
      coverage: false,
      geometry: false,
      stationMappings: false,
      onWaterValidation: false,
    },
    assets: [
      {
        path: 'assessment.json',
        sha256: createHash('sha256').update(content).digest('hex'),
        bytes: content.length,
        mediaType: 'application/json',
        purpose: 'display',
      },
    ],
  };
  await Promise.all([
    writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest)),
    writeFile(join(directory, 'assessment.json'), content),
    writeFile(join(root, 'keys', 'current.json'), '{"version":"v1"}'),
  ]);
  return { root, directory, manifest, store: new FilePackStore(root) };
}

test('pack store returns immutable checked assets and rejects tampering', async (t) => {
  const { root, directory, store } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal((await store.manifest('keys')).version, 'v1');
  assert.equal(
    (await store.asset('keys', 'v1', 'assessment.json')).buffer.toString(),
    '{"test":true}',
  );
  await writeFile(join(directory, 'assessment.json'), '{"test":fals}');
  await assert.rejects(store.asset('keys', 'v1', 'assessment.json'), /checksum|size/);
});

test('synthetic manifests, mixed provenance and synthetic assessment attachments are never listed or served', async (t) => {
  const { root, directory, manifest, store } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const variant of [
    { ...manifest, synthetic: true },
    {
      ...manifest,
      provenance: [...manifest.provenance, { ...manifest.provenance[0], synthetic: true }],
    },
    { ...manifest, provenance: [{ id: 'missing-classification' }] },
  ]) {
    await writeFile(join(directory, 'manifest.json'), JSON.stringify(variant));
    assert.deepEqual(await store.regions(), []);
    await assert.rejects(store.manifest('keys'), /real sources/);
    await assert.rejects(store.asset('keys', 'v1', 'assessment.json'), /real sources/);
  }
  const body = Buffer.from(
    JSON.stringify({
      validation: { status: 'reviewed' },
      sources: [{ synthetic: false }, { synthetic: true }],
    }),
  );
  manifest.assets[0] = {
    ...manifest.assets[0]!,
    purpose: 'assessment',
    bytes: body.length,
    sha256: createHash('sha256').update(body).digest('hex'),
  };
  await writeFile(join(directory, 'assessment.json'), body);
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest));
  assert.deepEqual(await store.regions(), []);
  await assert.rejects(store.manifest('keys'), /real-source/);
});

test('unreviewed real data cannot become live assessment and paths cannot escape root', async (t) => {
  const { root, store } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(store.assessment('keys'), /not released/);
  await assert.rejects(store.manifest('../keys'), /Invalid pack path/);
  await assert.rejects(store.asset('keys', 'v1', '../manifest.json'), /Invalid pack path/);
});
