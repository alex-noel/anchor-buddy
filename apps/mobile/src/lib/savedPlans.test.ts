import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSearch, type SavedPlanPayload } from '@anchor-buddy/domain';
import { createSavedPlansRepository, SAVED_PLANS_KEY, validateSavedPlan } from './savedPlans';
const base: SavedPlanPayload = {
  name: 'Night plan',
  createdAt: '2026-11-17T10:00:00.000Z',
  updatedAt: '2026-11-17T10:00:00.000Z',
  selectedPosition: [16.4, 43.5],
  plannedRodeM: 52.123456,
  search: createDefaultSearch([16, 43], '2026-11-17T10:00:00Z'),
  depthAllowancePercent: 20,
  vesselId: 'vessel',
  vesselFingerprint: 'a'.repeat(64),
  sourcePacks: [{ id: 'p', version: 'v1', snapshotId: 's' }],
};
function fixture() {
  const data = new Map<string, string>();
  let fail = false;
  const store = {
    async getRaw(key: string) {
      return data.get(key) ?? null;
    },
    async set<T>(key: string, value: T) {
      if (fail) throw new Error('disk full');
      data.set(key, JSON.stringify(value));
    },
  };
  return {
    data,
    store,
    repo: createSavedPlansRepository(store),
    fail(v: boolean) {
      fail = v;
    },
  };
}
test('save failure leaves draft and committed bytes intact; retry reloads exact canonical inputs', async () => {
  const f = fixture();
  const first = await f.repo.save(base);
  assert.equal(first.status, 'committed');
  const bytes = f.data.get(SAVED_PLANS_KEY);
  f.fail(true);
  assert.equal(
    (await f.repo.save({ ...base, name: 'Changed', plannedRodeM: 61 })).status,
    'failed',
  );
  assert.equal(f.data.get(SAVED_PLANS_KEY), bytes);
  f.fail(false);
  assert.equal(
    (await f.repo.save({ ...base, name: 'Changed', plannedRodeM: 61 })).status,
    'committed',
  );
  const loaded = await createSavedPlansRepository(f.store).read();
  assert.equal(loaded.records.length, 2);
  assert.equal(loaded.records[0].payload.plannedRodeM, 61);
  assert.deepEqual(loaded.records[1].payload.selectedPosition, base.selectedPosition);
  assert.deepEqual(loaded.records[1].payload.sourcePacks, base.sourcePacks);
  assert.equal(loaded.records[1].payload.depthAllowancePercent, 20);
});
test('invalid and future records retain original bytes and block library writes without hiding valid drafts', async () => {
  const f = fixture();
  await f.repo.save(base);
  const valid = JSON.parse(f.data.get(SAVED_PLANS_KEY)!)[0];
  for (const invalid of [
    { schemaVersion: 99 },
    { ...valid, id: 'bad', payload: { ...valid.payload, selectedPosition: [181, 0] } },
  ]) {
    const raw = JSON.stringify([valid, invalid]);
    f.data.set(SAVED_PLANS_KEY, raw);
    const result = await f.repo.read();
    assert.equal(result.records.length, 1);
    assert.ok(result.issue);
    assert.equal((await f.repo.save(base)).status, 'failed');
    assert.equal(f.data.get(SAVED_PLANS_KEY), raw);
  }
});
test('at 30 drafts saves are refused and named deletion removes only one', async () => {
  const f = fixture();
  for (let i = 0; i < 30; i++)
    assert.equal((await f.repo.save({ ...base, name: `Plan ${i}` })).status, 'committed');
  const before = await f.repo.read();
  assert.equal((await f.repo.save(base)).status, 'failed');
  f.fail(true);
  assert.equal((await f.repo.remove(before.records[5].id)).status, 'unchanged');
  f.fail(false);
  assert.equal((await f.repo.remove(before.records[5].id)).status, 'complete');
  const after = await f.repo.read();
  assert.equal(after.records.length, 29);
  assert.deepEqual(
    after.records.map((r) => r.id),
    before.records.filter((r) => r.id !== before.records[5].id).map((r) => r.id),
  );
});
test('payload rejects restored confirmations, watch fields and contradictory rode', () => {
  assert.ok(validateSavedPlan({ ...base, monitoring: true }).length);
  assert.ok(validateSavedPlan({ ...base, search: { ...base.search, deployedRodeM: 50 } }).length);
  assert.ok(validateSavedPlan({ ...base, plannedRodeM: NaN }).length);
});

test('material changes detect current vessel and source identity without inventing approval', async () => {
  const { planMaterialChanges } = await import('./savedPlans');
  assert.deepEqual(
    planMaterialChanges(base, base.vesselId, base.vesselFingerprint, base.sourcePacks),
    [],
  );
  assert.equal(
    planMaterialChanges(base, 'another', base.vesselFingerprint, base.sourcePacks).length,
    1,
  );
  assert.equal(
    planMaterialChanges(base, base.vesselId, 'b'.repeat(64), base.sourcePacks).length,
    1,
  );
  assert.equal(planMaterialChanges(base, base.vesselId, base.vesselFingerprint, []).length, 1);
  assert.equal(
    planMaterialChanges({ ...base, sourcePacks: [] }, base.vesselId, base.vesselFingerprint, [])
      .length,
    1,
  );
  assert.equal(
    planMaterialChanges(base, base.vesselId, base.vesselFingerprint, [
      { ...base.sourcePacks[0], version: 'v2' },
    ]).length,
    1,
  );
});

test('lost save acknowledgement is reconciled and retry reuses the proposed identifier', async () => {
  let raw: string | null = null;
  let readFails = false;
  let failAck = true;
  const store = {
    async getRaw() {
      if (readFails) throw new Error('unavailable');
      return raw;
    },
    async set<T>(_key: string, value: T) {
      raw = JSON.stringify(value);
      if (failAck) {
        readFails = true;
        throw new Error('ack lost');
      }
    },
  };
  const repository = createSavedPlansRepository(store);
  assert.equal((await repository.save(base, undefined, undefined, 'stable-id')).status, 'failed');
  readFails = false;
  failAck = false;
  assert.equal(
    (await repository.save(base, undefined, undefined, 'stable-id')).status,
    'committed',
  );
  const loaded = await repository.read();
  assert.equal(loaded.records.length, 1);
  assert.equal(loaded.records[0].id, 'stable-id');
});

test('queued save refuses changed source inputs before durable write', async () => {
  const f = fixture();
  const result = await f.repo.save(base, undefined, () => {
    throw new Error('source changed');
  });
  assert.equal(result.status, 'failed');
  assert.equal(f.data.has(SAVED_PLANS_KEY), false);
});

test('expired draft requires date review and restores only proposed inputs', async () => {
  const { prepareSavedPlan } = await import('./savedPlans');
  const restored = prepareSavedPlan(base, new Date('2026-12-01T10:00:00Z'));
  assert.equal(restored.needsDateReview, true);
  assert.ok(Date.parse(restored.search.departure) > Date.parse('2026-12-01T10:00:00Z'));
  assert.deepEqual(restored.selectedPosition, base.selectedPosition);
  assert.equal(restored.plannedRodeM, base.plannedRodeM);
  assert.equal(restored.depthAllowancePercent, 20);
  assert.deepEqual(Object.keys(restored).sort(), [
    'depthAllowancePercent',
    'needsDateReview',
    'plannedRodeM',
    'search',
    'selectedPosition',
  ]);
  assert.equal(restored.search.deployedRodeM, undefined);
});
