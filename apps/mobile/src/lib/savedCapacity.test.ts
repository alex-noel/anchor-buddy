import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSearch } from '@anchor-buddy/domain';
import { addSavedSnapshot, SAVED_SEARCH_LIMIT } from './savedCapacity';
import { DEFAULT_FILTERS, readSavedSearches, type SavedSearch } from './workspace';

const snapshot = (id: string): SavedSearch => ({
  id,
  name: `Snapshot ${id}`,
  savedAt: '2026-11-17T10:00:00.000Z',
  search: createDefaultSearch([16, 43], '2026-11-17T10:00:00.000Z'),
  filters: DEFAULT_FILTERS,
  vesselName: 'Boat',
  evidence: 'non-synthetic',
  packId: 'r',
  packVersion: '1',
  results: [],
});

test('at capacity no named snapshot is discarded without explicit replacement', () => {
  const original = Array.from({ length: SAVED_SEARCH_LIMIT }, (_, i) => snapshot(String(i)));
  const encoded = JSON.stringify(original);
  assert.throws(() => addSavedSnapshot(original, snapshot('new')), /Choose a saved search/);
  assert.equal(JSON.stringify(original), encoded);
  assert.throws(
    () => addSavedSnapshot(original, snapshot('new'), 'missing'),
    /no longer available/,
  );
  const result = addSavedSnapshot(original, snapshot('new'), '7');
  assert.equal(result.length, SAVED_SEARCH_LIMIT);
  assert.equal(result[0].id, 'new');
  assert.equal(
    result.some((item) => item.id === '7'),
    false,
  );
  assert.deepEqual(
    result.slice(1).map((item) => item.id),
    original.filter((item) => item.id !== '7').map((item) => item.id),
  );
  assert.deepEqual(readSavedSearches(JSON.parse(JSON.stringify(result))), result);
});

test('under-cap adds without replacement; oversized legacy libraries remain readable and require deletion', () => {
  const items = Array.from({ length: 31 }, (_, i) => snapshot(String(i)));
  assert.equal(readSavedSearches(JSON.parse(JSON.stringify(items))).length, 31);
  assert.throws(() => addSavedSnapshot(items, snapshot('new'), '7'), /exceeds 30/);
  assert.equal(addSavedSnapshot(items.slice(0, 29), snapshot('new')).length, 30);
});
