import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPreferenceCommands, type PreferenceStatuses } from './preferenceCommands';
import { createSettingsRepository } from './settingsPersistence';

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function fixture() {
  const data = new Map<string, string>();
  const statuses: PreferenceStatuses = {};
  let release: (() => void) | undefined;
  let block: Promise<void> | undefined;
  let fail = false;
  const store = {
    async getRaw(key: string) {
      return data.get(key) ?? null;
    },
    async get<T>(key: string): Promise<T | null> {
      const raw = data.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    async set<T>(key: string, value: T) {
      if (block) {
        const waiting = block;
        block = undefined;
        await waiting;
      }
      if (fail) throw new Error('disk full');
      data.set(key, JSON.stringify(value));
    },
  };
  const repo = createSettingsRepository(store);
  const commands = createPreferenceCommands(repo.commit, (key, status) => {
    if (status) statuses[key] = status;
    else delete statuses[key];
  });
  return {
    repo,
    commands,
    statuses,
    hold() {
      block = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    release() {
      release?.();
    },
    fail(value: boolean) {
      fail = value;
    },
  };
}

test('delayed rapid changes retain latest combined selections across reload', async () => {
  const f = fixture();
  f.hold();
  f.commands.change('units', 'metric');
  await tick();
  f.commands.change('depth', false);
  f.commands.change('offline', true);
  f.commands.change('units', 'imperial');
  f.commands.change('bedding', false);
  assert.equal(f.statuses.units?.state, 'pending');
  f.release();
  for (let i = 0; i < 8; i++) await tick();
  assert.deepEqual(f.statuses, {});
  const result = await f.repo.read();
  assert.equal(result.status, 'supported');
  if (result.status === 'supported') {
    assert.equal(result.value.units, 'imperial');
    assert.equal(result.value.offline, true);
    assert.deepEqual(result.value.layers, { depth: false, bedding: false, marks: true });
    assert.equal(result.value.vessel, null);
    assert.equal(result.value.searchDefaults, null);
  }
});

test('failure retains unsaved intent, isolates fields and retry persists it', async () => {
  const f = fixture();
  f.fail(true);
  f.commands.change('depth', false);
  await tick();
  assert.equal(f.statuses.depth?.state, 'error');
  f.fail(false);
  f.commands.change('marks', false);
  await tick();
  assert.equal(f.statuses.depth?.state, 'error');
  assert.equal(f.statuses.marks, undefined);
  f.commands.retry('depth');
  assert.equal(f.statuses.depth?.state, 'pending');
  await tick();
  assert.deepEqual(f.statuses, {});
  const result = await f.repo.read();
  assert.equal(result.status, 'supported');
  if (result.status === 'supported')
    assert.deepEqual(result.value.layers, { depth: false, bedding: true, marks: false });
});

test('older failure cannot replace a newer pending or successful choice', async () => {
  const calls: { resolve: (result: any) => void }[] = [];
  const statuses: PreferenceStatuses = {};
  const commands = createPreferenceCommands(
    () => new Promise((resolve) => calls.push({ resolve })),
    (key, status) => {
      if (status) statuses[key] = status;
      else delete statuses[key];
    },
  );
  commands.change('units', 'metric');
  commands.change('units', 'imperial');
  calls[1].resolve({ status: 'committed', value: {} });
  await tick();
  calls[0].resolve({ status: 'failed', error: 'late' });
  await tick();
  assert.equal(statuses.units, undefined);
});

test('unit changes leave stored vessel and search values unchanged', async () => {
  const { createVesselDraft, createDefaultSearch } = await import('@anchor-buddy/domain');
  const vessel = {
    ...createVesselDraft(),
    id: 'boat',
    name: 'Boat',
    lengthM: 10.1234,
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
  const f = fixture();
  assert.equal(
    (
      await f.repo.commit({
        vessel,
        searchDefaults: search,
        confirmed: { vessel: true, defaults: true },
      })
    ).status,
    'committed',
  );
  f.commands.change('units', 'imperial');
  await tick();
  const result = await f.repo.read();
  assert.equal(result.status, 'supported');
  if (result.status === 'supported') {
    assert.deepEqual(result.value.vessel, vessel);
    assert.deepEqual(result.value.searchDefaults, search);
  }
});
