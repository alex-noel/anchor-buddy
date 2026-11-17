import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteEvidence, type EvidenceCleanup } from './deletion';

function fixture() {
  let stored: EvidenceCleanup[] = [];
  let cache = true;
  let active = true;
  let phase = '';
  let blocked = false;
  const io = {
    async readMarkers() {
      return structuredClone(stored);
    },
    async writeMarkers(rows: EvidenceCleanup[]) {
      if (phase === (rows.length ? 'marker' : 'clear')) throw new Error(phase);
      stored = structuredClone(rows);
      if (phase === (rows.length ? 'marker-ack' : 'clear-ack')) throw new Error(phase);
    },
    onPending(_rows: EvidenceCleanup[]) {},
    async ensureAllowed() {
      if (blocked) throw new Error('watch active');
    },
    async removeCache() {
      if (phase === 'cache') throw new Error(phase);
      cache = false;
    },
    async removeActive() {
      if (phase === 'active') throw new Error(phase);
      active = false;
    },
  };
  return {
    io,
    phase(v: string) {
      phase = v;
    },
    blocked(v: boolean) {
      blocked = v;
    },
    get markers() {
      return stored;
    },
    get cache() {
      return cache;
    },
    get active() {
      return active;
    },
  };
}
const item = { id: 'r', name: 'Harbour' };

test('watch refusal and failed marker cause no evidence mutation', async () => {
  for (const failure of ['watch', 'marker']) {
    const f = fixture();
    if (failure === 'watch') f.blocked(true);
    else f.phase('marker');
    assert.equal((await deleteEvidence(item, f.io)).status, 'unchanged');
    assert.deepEqual(f.markers, []);
    assert.equal(f.cache, true);
    assert.equal(f.active, true);
  }
});

test('failures after marking retain cleanup on reload and retry idempotently', async () => {
  for (const phase of ['cache', 'active', 'clear']) {
    const f = fixture();
    f.phase(phase);
    assert.equal((await deleteEvidence(item, f.io)).status, 'cleanup-pending');
    assert.deepEqual(f.markers, [item]);
    f.phase('');
    assert.equal((await deleteEvidence(item, f.io)).status, 'complete');
    assert.deepEqual(f.markers, []);
    assert.equal(f.cache, false);
    assert.equal(f.active, false);
  }
});

test('acknowledgement errors reconcile durable marker outcomes', async () => {
  const f = fixture();
  f.phase('marker-ack');
  assert.equal((await deleteEvidence(item, f.io)).status, 'cleanup-pending');
  assert.deepEqual(f.markers, [item]);
  f.phase('clear-ack');
  assert.equal((await deleteEvidence(item, f.io)).status, 'complete');
  assert.deepEqual(f.markers, []);
});

test('a watch becoming active during cleanup prevents active-region removal', async () => {
  const f = fixture();
  const removeCache = f.io.removeCache;
  f.io.removeCache = async () => {
    await removeCache();
    f.blocked(true);
  };
  const result = await deleteEvidence(item, f.io);
  assert.equal(result.status, 'cleanup-pending');
  assert.equal(f.active, true);
  assert.deepEqual(f.markers, [item]);
  f.blocked(false);
  f.io.removeCache = removeCache;
  assert.equal((await deleteEvidence(item, f.io)).status, 'complete');
});
