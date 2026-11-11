import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSearch } from '@anchor-buddy/domain/testing';
import { DEFAULT_FILTERS, freshSearch, prepareSavedSearch, readSavedSearches } from './workspace';
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
    evidence: 'non-synthetic',
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

test('legacy saved searches retain user preferences but cannot display unproven old results', () => {
  const search = {
    id: 'old',
    name: 'Trip',
    savedAt: new Date().toISOString(),
    packId: 'florida-keys-demo',
    packVersion: '1',
    vesselName: 'Boat',
    search: createDefaultSearch(),
    filters: DEFAULT_FILTERS,
    results: [
      {
        id: 'demo',
        name: 'Imaginary place',
        status: 'passes',
        depthM: 4,
        total: 10,
        currency: 'USD',
      },
    ],
  };
  const [stored] = readSavedSearches([search]);
  assert.deepEqual(stored.results, []);
  assert.equal(stored.requiresReassessment, true);
  assert.equal(stored.name, 'Trip');
  assert.deepEqual(stored.search, search.search);
});

test('reopening an elapsed saved stay proposes new dates for explicit review and clears deployed rode', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  const old = { ...createDefaultSearch('2026-10-30T12:00:00Z'), deployedRodeM: 30 };
  const reopened = prepareSavedSearch(old, now);
  assert.equal(reopened.needsDateReview, true);
  assert.ok(Date.parse(reopened.search.arrival) > now.getTime());
  assert.equal(reopened.search.deployedRodeM, undefined);
  const upcoming = createDefaultSearch('2026-11-12T12:00:00Z');
  assert.deepEqual(prepareSavedSearch(upcoming, now), { needsDateReview: false, search: upcoming });
});

test('saved manual anchor positions survive reopening but corrupt coordinates are rejected', () => {
  const snapshot = {
    id: 'pin',
    evidence: 'non-synthetic',
    name: 'Selected position',
    savedAt: '2026-11-11T12:00:00Z',
    packId: 'area',
    packVersion: '1',
    vesselName: 'Boat',
    search: createDefaultSearch(),
    filters: DEFAULT_FILTERS,
    results: [],
    selectedPosition: [16.4, 43.5],
  };
  assert.deepEqual(readSavedSearches([snapshot])[0]?.selectedPosition, [16.4, 43.5]);
  for (const selectedPosition of [[181, 0], [0, 86], [NaN, 0], [16.4]])
    assert.equal(readSavedSearches([{ ...snapshot, selectedPosition }]).length, 0);
});
