import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readStartupCategory, type StartupCategory } from './startupRecovery';
import { createSettingsRepository, SETTINGS_KEY } from './settingsPersistence';
import { createDefaultSearch, createVesselDraft } from '@anchor-buddy/domain';
import { DEFAULT_FILTERS } from './workspace';

function fixture() {
  const data = new Map<string, string>();
  const rejected = new Set<string>();
  const store = {
    async getRaw(key: string) {
      if (rejected.has(key)) throw new Error('unavailable');
      return data.get(key) ?? null;
    },
    async get<T>(key: string): Promise<T | null> {
      const raw = data.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    async set<T>(key: string, value: T) {
      data.set(key, JSON.stringify(value));
    },
  };
  const repository = createSettingsRepository(store);
  return {
    data,
    rejected,
    store,
    repository,
    read: (category: StartupCategory) =>
      readStartupCategory(category, store.getRaw, repository.read),
  };
}

test('corrupt optional cache and a rejected read do not hide valid settings or searches', async () => {
  const f = fixture();
  const vessel = {
    ...createVesselDraft(),
    id: 'boat',
    name: 'Boat',
    lengthM: 10,
    beamM: 3,
    loadedDraftM: 1.5,
    displacementKg: 4000,
    anchor: {
      ...createVesselDraft().anchor,
      type: 'other',
      usableLengthM: 60,
      bowRollerHeightM: 0,
    },
  };
  const search = createDefaultSearch([16, 43]);
  assert.equal(
    (
      await f.repository.commit({
        vessel,
        searchDefaults: search,
        confirmed: { vessel: true, defaults: true },
      })
    ).status,
    'committed',
  );
  f.data.set('regional-evidence-v1', '{broken');
  const saved = {
    id: 'one',
    evidence: 'non-synthetic',
    name: 'Trip',
    savedAt: '2026-10-30T12:00:00Z',
    packId: 'r',
    packVersion: '1',
    vesselName: 'Boat',
    search,
    filters: DEFAULT_FILTERS,
    results: [],
  };
  f.data.set('saved-searches', JSON.stringify([saved]));
  f.rejected.add('active-region');
  const [settings, evidence, searches, region] = await Promise.all(
    ['settings', 'evidence', 'searches', 'region'].map((c) => f.read(c as StartupCategory)),
  );
  assert.equal(settings.issue, undefined);
  assert.deepEqual((settings.value as any).vessel, vessel);
  assert.equal(evidence.issue?.kind, 'invalid');
  assert.deepEqual(searches.value, [saved]);
  assert.equal(region.issue?.kind, 'unreadable');
  assert.equal(f.data.get('regional-evidence-v1'), '{broken');
  f.rejected.delete('active-region');
  assert.equal((await f.read('region')).missing, true);
});

test('future, corrupt and missing settings remain distinct and cannot be overwritten', async () => {
  for (const [raw, kind] of [
    [undefined, undefined],
    ['{bad', 'invalid'],
    [JSON.stringify({ schemaVersion: 99 }), 'unsupported-version'],
  ] as const) {
    const f = fixture();
    if (raw !== undefined) f.data.set(SETTINGS_KEY, raw);
    const result = await f.read('settings');
    assert.equal(result.issue?.kind, kind);
    if (raw === undefined) assert.equal(result.missing, true);
    if (raw !== undefined) {
      assert.equal((await f.repository.commit({ offline: true })).status, 'failed');
      assert.equal(f.data.get(SETTINGS_KEY), raw);
    }
  }
});

test('malformed legacy bytes block migration and are retained', async () => {
  const f = fixture();
  f.data.set('vessel', '{broken');
  const result = await f.read('settings');
  assert.equal(result.issue?.kind, 'invalid');
  assert.equal((await f.repository.commit({ offline: true })).status, 'failed');
  assert.equal(f.data.get('vessel'), '{broken');
  assert.equal(f.data.has(SETTINGS_KEY), false);
});

test('mixed list retains readable entries while blocking replacement of original', async () => {
  const f = fixture();
  f.data.set('saved-searches', JSON.stringify([{ invalid: true }]));
  const result = await f.read('searches');
  assert.equal(result.issue?.kind, 'invalid');
  assert.deepEqual(result.value, []);
  assert.equal(f.data.get('saved-searches'), '[{"invalid":true}]');
  f.data.set('saved-searches', JSON.stringify([{ schemaVersion: 9 }]));
  assert.equal((await f.read('searches')).issue?.kind, 'unsupported-version');
});

test('evidence cleanup markers survive reload and malformed markers remain blocked', async () => {
  const f = fixture();
  f.data.set('evidence-cleanup-v1', JSON.stringify([{ id: 'r', name: 'Harbour' }]));
  const pending = await f.read('evidence-cleanup');
  assert.deepEqual(pending.value, [{ id: 'r', name: 'Harbour' }]);
  f.data.set('evidence-cleanup-v1', '{broken');
  assert.equal((await f.read('evidence-cleanup')).issue?.kind, 'invalid');
  assert.equal(f.data.get('evidence-cleanup-v1'), '{broken');
});
