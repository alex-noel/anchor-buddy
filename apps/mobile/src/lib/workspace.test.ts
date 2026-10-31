import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSearch } from '@anchor-buddy/domain';
import { DEFAULT_FILTERS, freshSearch, readSavedSearches } from './workspace';
test('new searches roll old defaults forward without carrying deployed rode or changing the stay duration', () => {
  const original = { ...createDefaultSearch('2026-01-01T00:00:00Z'), deployedRodeM: 50 };
  const now = new Date('2026-10-30T12:37:10Z');
  const next = freshSearch(original, now);
  assert.ok(Date.parse(next.arrival) > now.getTime());
  assert.equal(new Date(next.arrival).getMinutes(), 0);
  assert.equal(new Date(next.arrival).getSeconds(), 0);
  assert.equal(
    Date.parse(next.departure) - Date.parse(next.arrival),
    Date.parse(original.departure) - Date.parse(original.arrival),
  );
  assert.equal(next.deployedRodeM, undefined);
  assert.equal(original.deployedRodeM, 50);
});
test('saved results remain dated snapshots; corrupt records and duplicate ids cannot be reopened', () => {
  const saved = {
    id: 'one',
    name: 'Weekend',
    savedAt: '2026-10-30T12:00:00Z',
    packId: 'keys',
    packVersion: '1',
    vesselName: 'Boat',
    search: createDefaultSearch('2026-10-30T12:00:00Z'),
    filters: DEFAULT_FILTERS,
    results: [{ id: 'a', name: 'Place', status: 'passes', depthM: 4, total: null, currency: null }],
  };
  assert.deepEqual(readSavedSearches([saved, saved, { ...saved, id: 'bad', search: {} }]), [saved]);
  assert.equal(
    readSavedSearches([{ ...saved, results: [{ ...saved.results[0], total: -10 }] }]).length,
    0,
  );
  assert.equal(readSavedSearches(null).length, 0);
});
