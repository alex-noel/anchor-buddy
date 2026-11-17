import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSettingsRepository, SETTINGS_KEY } from './settingsPersistence';

function fixture() {
  const data = new Map<string, string>();
  let fail = false;
  let gate: Promise<void> | undefined;
  let writes = 0;
  const store = {
    async getRaw(key: string) {
      return data.get(key) ?? null;
    },
    async get<T>(key: string): Promise<T | null> {
      const raw = data.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    async set<T>(key: string, value: T) {
      writes++;
      if (gate) await gate;
      if (fail) throw new Error('disk full');
      data.set(key, JSON.stringify(value));
    },
  };
  return {
    data,
    store,
    repository: createSettingsRepository(store),
    setFail: (v: boolean) => {
      fail = v;
    },
    setGate: (v?: Promise<void>) => {
      gate = v;
    },
    get writes() {
      return writes;
    },
  };
}

test('rejected commit retains previous record; retry persists intended patch across reload', async () => {
  const f = fixture();
  assert.equal((await f.repository.commit({ offline: true })).status, 'committed');
  const before = f.data.get(SETTINGS_KEY);
  f.setFail(true);
  const failed = await f.repository.commit({ units: 'metric' });
  assert.equal(failed.status, 'failed');
  assert.equal(f.data.get(SETTINGS_KEY), before);
  f.setFail(false);
  assert.equal((await f.repository.commit({ units: 'metric' })).status, 'committed');
  const reload = await createSettingsRepository(f.store).read();
  assert.equal(reload.status, 'supported');
  if (reload.status === 'supported') {
    assert.equal(reload.value.units, 'metric');
    assert.equal(reload.value.offline, true);
  }
  assert.equal(f.writes, 3);
});

test('delayed commands serialize and preserve each other', async () => {
  const f = fixture();
  let release!: () => void;
  f.setGate(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const first = f.repository.commit({ offline: true });
  const second = f.repository.commit({ units: 'imperial' });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(f.writes, 1);
  assert.equal(f.data.has(SETTINGS_KEY), false);
  release();
  assert.equal((await first).status, 'committed');
  assert.equal((await second).status, 'committed');
  const result = await f.repository.read();
  assert.equal(result.status, 'supported');
  if (result.status === 'supported') {
    assert.equal(result.value.offline, true);
    assert.equal(result.value.units, 'imperial');
  }
});

test('corrupt and future records block writes and retain original bytes', async () => {
  for (const raw of ['{broken', JSON.stringify({ schemaVersion: 99 }), JSON.stringify({ schemaVersion: 2, kind: 'settings', id: 'local-settings', revision: 'r', savedAt: '2026-01-01T00:00:00.000Z', payload: { units: 'metric', offline: false, language: 'en', layers: null } })]) {
    const f = fixture();
    f.data.set(SETTINGS_KEY, raw);
    assert.notEqual((await f.repository.read()).status, 'supported');
    assert.equal((await f.repository.commit({ offline: true })).status, 'failed');
    assert.equal(f.data.get(SETTINGS_KEY), raw);
    assert.equal(f.writes, 0);
  }
});

test('legacy source records migrate on first commit without deletion', async () => {
  const f = fixture();
  const legacy = JSON.stringify({
    units: 'metric',
    offline: true,
    layers: { depth: false, bedding: true, marks: false },
  });
  f.data.set('preferences', legacy);
  assert.equal((await f.repository.commit({ offline: false })).status, 'committed');
  assert.equal(f.data.get('preferences'), legacy);
  const result = await createSettingsRepository(f.store).read();
  assert.equal(result.status, 'supported');
  if (result.status === 'supported') {
    assert.equal(result.value.units, 'metric');
    assert.equal(result.value.offline, false);
    assert.equal(result.value.layers.depth, false);
  }
});
