import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVesselDraft, createDefaultSearch } from '@anchor-buddy/domain';
import { createSettingsRepository, SETTINGS_KEY } from './settingsPersistence';
import { completeSetup } from './setupCompletion';

function fixture() {
  const data = new Map<string, string>();
  let fail = false;
  let gate: Promise<void> | undefined;
  let release!: () => void;
  const store = {
    async getRaw(key: string) {
      return data.get(key) ?? null;
    },
    async get<T>(key: string): Promise<T | null> {
      const raw = data.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    async set<T>(key: string, value: T) {
      if (gate) await gate;
      if (fail) throw new Error('disk full');
      data.set(key, JSON.stringify(value));
    },
  };
  const repo = createSettingsRepository(store);
  return {
    data,
    store,
    repo,
    fail(v: boolean) {
      fail = v;
    },
    hold() {
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    release() {
      release();
      gate = undefined;
    },
  };
}
const vessel = {
  ...createVesselDraft(),
  id: 'boat',
  name: 'Boat',
  lengthM: 10.25,
  beamM: 3,
  loadedDraftM: 1.5,
  displacementKg: 4000,
  anchor: { ...createVesselDraft().anchor, type: 'other', usableLengthM: 60, bowRollerHeightM: 0 },
};
const defaults = createDefaultSearch([16, 43], '2026-11-17T10:00:00Z');
const seed = (f: ReturnType<typeof fixture>) =>
  f.repo.commit({ vessel, searchDefaults: defaults, confirmed: { vessel: true, defaults: true } });

test('completion cannot commit without both confirmed durable steps', async () => {
  const f = fixture();
  assert.equal((await completeSetup(f.repo.commit)).status, 'failed');
  assert.equal(f.data.has(SETTINGS_KEY), false);
  await f.repo.commit({ vessel, confirmed: { vessel: true, defaults: false } });
  const original = f.data.get(SETTINGS_KEY);
  assert.equal((await completeSetup(f.repo.commit)).status, 'failed');
  assert.equal(f.data.get(SETTINGS_KEY), original);
});

test('interrupted or failed completion retains progress; retry commits and reloads atomically', async () => {
  const f = fixture();
  assert.equal((await seed(f)).status, 'committed');
  const before = f.data.get(SETTINGS_KEY);
  f.hold();
  const pending = completeSetup(f.repo.commit);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.data.get(SETTINGS_KEY), before);
  f.fail(true);
  f.release();
  assert.equal((await pending).status, 'failed');
  assert.equal(f.data.get(SETTINGS_KEY), before);
  const restart = await createSettingsRepository(f.store).read();
  assert.equal(restart.status, 'supported');
  if (restart.status === 'supported') {
    assert.equal(restart.value.setupComplete, false);
    assert.deepEqual(restart.value.vessel, vessel);
  }
  f.fail(false);
  assert.equal((await completeSetup(f.repo.commit)).status, 'committed');
  assert.equal((await completeSetup(f.repo.commit)).status, 'committed');
  const done = await createSettingsRepository(f.store).read();
  assert.equal(done.status, 'supported');
  if (done.status === 'supported') {
    assert.equal(done.value.setupComplete, true);
    assert.deepEqual(done.value.vessel, vessel);
    assert.deepEqual(done.value.searchDefaults, defaults);
  }
  assert.equal(f.data.has('setup-complete-v2'), false);
});

test('legacy completion migrates only with complete confirmed data; marker is retained and superseded', async () => {
  const f = fixture();
  f.data.set('vessel', JSON.stringify(vessel));
  f.data.set('search-defaults', JSON.stringify(defaults));
  f.data.set('profile-confirmed-v3', 'true');
  f.data.set('setup-complete-v2', 'true');
  const old = await f.repo.read();
  assert.equal(old.status, 'supported');
  if (old.status === 'supported') assert.equal(old.value.setupComplete, true);
  assert.equal((await f.repo.commit({ offline: true })).status, 'committed');
  f.data.set('setup-complete-v2', '{broken');
  const migrated = await f.repo.read();
  assert.equal(migrated.status, 'supported');
  if (migrated.status === 'supported') assert.equal(migrated.value.setupComplete, true);
  assert.equal(f.data.get('setup-complete-v2'), '{broken');
});

test('old v2 record consults marker, retains corrupt marker and blocks writes', async () => {
  const f = fixture();
  await seed(f);
  const record = JSON.parse(f.data.get(SETTINGS_KEY)!);
  delete record.payload.setupComplete;
  const old = JSON.stringify(record);
  f.data.set(SETTINGS_KEY, old);
  f.data.set('setup-complete-v2', '{bad');
  assert.equal((await f.repo.read()).status, 'invalid');
  assert.equal((await completeSetup(f.repo.commit)).status, 'failed');
  assert.equal(f.data.get(SETTINGS_KEY), old);
  assert.equal(f.data.get('setup-complete-v2'), '{bad');
});

test('legacy marker cannot complete missing or unconfirmed steps', async () => {
  const f = fixture();
  f.data.set('vessel', JSON.stringify(vessel));
  f.data.set('setup-complete-v2', 'true');
  const result = await f.repo.read();
  assert.equal(result.status, 'supported');
  if (result.status === 'supported') assert.equal(result.value.setupComplete, false);
  assert.equal((await completeSetup(f.repo.commit)).status, 'failed');
  assert.equal(f.data.has(SETTINGS_KEY), false);
});

test('an envelope claiming completion without confirmed inputs is retained and rejected', async () => {
  const f = fixture();
  await f.repo.commit({ vessel, confirmed: { vessel: true, defaults: false } });
  const record = JSON.parse(f.data.get(SETTINGS_KEY)!);
  record.payload.setupComplete = true;
  const raw = JSON.stringify(record);
  f.data.set(SETTINGS_KEY, raw);
  assert.equal((await f.repo.read()).status, 'invalid');
  assert.equal((await completeSetup(f.repo.commit)).status, 'failed');
  assert.equal(f.data.get(SETTINGS_KEY), raw);
});
