import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheRegion,
  createEmptyRegion,
  readRegionCache,
  utf8Bytes,
  type RegionalData,
} from './regionalDataCore';
import { knownStorageUsage } from './storageUsage';
import type { MapArea } from './worldMapsCore';

function row(id: string, retention?: RegionalData['retention']): RegionalData {
  return {
    pack: { ...createEmptyRegion([16, 43], 3), id, validUntil: '2027-01-01T00:00:00.000Z' },
    providers: [],
    notices: [],
    partial: true,
    savedAt: '2026-01-01T00:00:00.000Z',
    ...(retention ? { retention } : {}),
  };
}
test('eight-plus regions evict only automatic data, keeping explicit and ambiguous legacy evidence', () => {
  const protectedRows = [
    row('legacy'),
    ...Array.from({ length: 6 }, (_, i) => row(`kept-${i}`, 'retained')),
  ];
  const old = row('old', 'automatic');
  const original = [...protectedRows, old];
  const next = row('new', 'automatic');
  const cached = cacheRegion(original, next);
  assert.equal(cached.length, 8);
  assert.deepEqual(cached.slice(1), protectedRows);
  assert.equal(original.length, 8);
  assert.equal(
    cached.some((item) => item.pack.id === 'old'),
    false,
  );
  assert.equal(cached[1].retention, undefined);
  assert.equal(cached[1].pack.validUntil, '2027-01-01T00:00:00.000Z');
  assert.equal(
    cacheRegion(original, { ...row('legacy', 'automatic'), notices: ['new'] }),
    original,
  );
});

test('protected full or oversized legacy cache remains untouched; freeing one entry allows retry', () => {
  const original = Array.from({ length: 9 }, (_, i) => row(`legacy-${i}`));
  assert.equal(readRegionCache(original).length, 9);
  const serialized = JSON.stringify(original);
  assert.throws(() => cacheRegion(original, row('new', 'automatic')), /Manage cached data/);
  assert.equal(JSON.stringify(original), serialized);
  const reduced = original.slice(0, 7);
  assert.equal(cacheRegion(reduced, row('new', 'retained')).length, 8);
});

test('quota failure before durable replacement preserves original and retry commits', async () => {
  const old = [row('kept', 'retained')];
  let stored = JSON.stringify(old);
  let reject = true;
  const commit = async (value: RegionalData[]) => {
    if (reject) throw new Error('QuotaExceededError');
    stored = JSON.stringify(value);
  };
  const next = cacheRegion(old, row('next', 'automatic'));
  await assert.rejects(commit(next), /QuotaExceeded/);
  assert.deepEqual(JSON.parse(stored), old);
  reject = false;
  await commit(next);
  assert.deepEqual(JSON.parse(stored), next);
});

test('reported map bytes deduplicate area identities and evidence size is UTF-8', () => {
  const map = { id: 'a', bytes: 120 } as MapArea;
  const evidence = [row('å')];
  const result = knownStorageUsage([map, map, { id: 'b', bytes: 200 } as MapArea], evidence);
  assert.equal(result.mapBytes, 320);
  assert.equal(result.evidenceBytes, Buffer.byteLength(JSON.stringify(evidence), 'utf8'));
  assert.equal(utf8Bytes('é⛵😀'), Buffer.byteLength('é⛵😀', 'utf8'));
});
