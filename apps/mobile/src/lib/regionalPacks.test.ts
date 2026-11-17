import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoPack } from '@anchor-buddy/domain/testing';
import {
  commitRegionalPointer,
  createPackOperation,
  pointerReferencesAsset,
  removeUnreferencedAsset,
} from './regionalPacks';
function pointer(key: string) {
  const pack = createDemoPack();
  pack.validation.status = 'reviewed';
  pack.validation.reviewedBy = 'Test';
  pack.validation.reviewedAt = pack.generatedAt;
  pack.sources = pack.sources.map((source) => ({ ...source, synthetic: false }));
  return JSON.stringify({ pack, assetKey: key, savedAt: '2026-11-17T10:00:00.000Z' });
}
test('commit boundary refuses cancellation and settles authoritative pointer after unmount', async () => {
  const operation = createPackOperation();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let value: string | null = pointer('old');
  let started!: () => void;
  const began = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pending = commitRegionalPointer({
    operation,
    assetKey: 'new',
    onBegin() {
      started();
    },
    async write() {
      await gate;
      value = pointer('new');
    },
    async readRaw() {
      return value;
    },
  });
  await began;
  assert.equal(operation.committing, true);
  assert.equal(operation.cancel(), false);
  release();
  await pending;
  assert.equal(pointerReferencesAsset(value, 'new'), 'referenced');
});
test('uncertain write uses pointer readback and never deletes referenced or unknown assets', async () => {
  const operation = createPackOperation();
  let value = pointer('new');
  await commitRegionalPointer({
    operation,
    assetKey: 'new',
    onBegin() {},
    async write() {
      throw new Error('ack lost');
    },
    async readRaw() {
      return value;
    },
  });
  let removed = 0;
  assert.equal(
    await removeUnreferencedAsset(
      'new',
      async () => value,
      () => {
        removed++;
      },
    ),
    false,
  );
  assert.equal(
    await removeUnreferencedAsset(
      'new',
      async () => '{broken',
      () => {
        removed++;
      },
    ),
    false,
  );
  assert.equal(
    await removeUnreferencedAsset(
      'new',
      async () => {
        throw new Error('offline');
      },
      () => {
        removed++;
      },
    ),
    false,
  );
  value = pointer('old');
  assert.equal(
    await removeUnreferencedAsset(
      'new',
      async () => value,
      () => {
        removed++;
      },
    ),
    true,
  );
  assert.equal(removed, 1);
});
test('failure to confirm pointer does not claim activation or authorize cleanup', async () => {
  const operation = createPackOperation();
  let reads = 0;
  await assert.rejects(
    commitRegionalPointer({
      operation,
      assetKey: 'new',
      onBegin() {},
      async write() {},
      async readRaw() {
        if (++reads === 1) return pointer('old');
        throw new Error('read unavailable');
      },
    }),
    /could not confirm/i,
  );
  assert.equal(operation.cancel(), false);
  assert.equal(pointerReferencesAsset('{bad', 'new'), 'unknown');
  assert.equal(pointerReferencesAsset(null, 'new'), 'unreferenced');
});

test('manifest and transfer cancellation abort network and suppress late responses', async () => {
  const { fetchRegional } = await import('./regionalPacks');
  for (const phase of ['manifest', 'body'] as const) {
    const operation = createPackOperation();
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    let signal: AbortSignal | null = null;
    const fetcher = (async (_url: string | URL | Request, init?: RequestInit) => {
      signal = init?.signal as AbortSignal;
      if (phase === 'manifest') {
        started();
        await gate;
      }
      return new Response('{}');
    }) as typeof fetch;
    const pending = fetchRegional(
      'https://example.test',
      5000,
      operation,
      async (response) => {
        if (phase === 'body') {
          started();
          await gate;
        }
        return response.text();
      },
      fetcher,
    );
    await ready;
    operation.cancel();
    assert.equal((signal as AbortSignal | null)?.aborted, true);
    release();
    await assert.rejects(pending, /cancelled/i);
  }
});

test('a remounted view cannot start a new operation until old commit settles', async () => {
  const { createRegionalCoordinator } = await import('./regionalPacks');
  const coordinator = createRegionalCoordinator();
  const old = coordinator.acquire()!;
  old.beginCommit();
  assert.equal(old.cancel(), false);
  assert.equal(coordinator.acquire(), null);
  coordinator.release(old);
  const next = coordinator.acquire();
  assert.ok(next);
  assert.notEqual(next, old);
  coordinator.release(old);
  assert.equal(coordinator.acquire(), null);
  coordinator.release(next!);
  assert.ok(coordinator.acquire());
});

test('corrupt, unsupported or unreadable preexisting pointer blocks write before commit', async () => {
  for (const raw of [
    '{broken',
    JSON.stringify({ ...JSON.parse(pointer('old')), schemaVersion: 99 }),
    'unreadable',
  ]) {
    const operation = createPackOperation();
    let writes = 0;
    await assert.rejects(
      commitRegionalPointer({
        operation,
        assetKey: 'new',
        onBegin() {},
        async write() {
          writes++;
        },
        async readRaw() {
          if (raw === 'unreadable') throw new Error('unavailable');
          return raw;
        },
      }),
      /active region/i,
    );
    assert.equal(writes, 0);
    assert.equal(operation.committing, false);
  }
});
