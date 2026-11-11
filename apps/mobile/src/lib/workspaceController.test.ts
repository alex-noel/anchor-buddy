import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSearch } from '@anchor-buddy/domain';
import {
  cacheCurrentEvidence,
  RequestGeneration,
  initialWorkspace,
  workspaceReducer,
} from './workspaceController';
import { DEFAULT_FILTERS } from './workspace';

const search = createDefaultSearch([10, 50]);
const reduce = workspaceReducer;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

test('cancel saved search draft preserves active search, filters, pin and area metadata', () => {
  const a = reduce(initialWorkspace, {
    type: 'commitSearch',
    search,
    area: { regionName: 'A', timezone: 'Europe/Warsaw' },
    filters: { ...DEFAULT_FILTERS, kind: 'marina' },
    pin: [10, 50],
  });
  const b = reduce(a, {
    type: 'beginSearch',
    draft: { ...search, origin: [11, 51] },
    area: { confirmed: true, name: 'B', timezone: 'UTC' },
    restore: { filters: DEFAULT_FILTERS, pin: [11, 51] },
  });
  const cancelled = reduce(b, { type: 'cancelSearch' });
  for (const key of [
    'activeSearch',
    'activeAreaName',
    'activeAreaTimezone',
    'filters',
    'customPin',
    'selectedId',
  ] as const)
    assert.deepEqual(cancelled[key], a[key]);
  assert.equal(cancelled.searchDraft, null);
  assert.equal(cancelled.draftRestore, undefined);
});

test('setup child returns to parent, and closing unrelated modal is a no-op', () => {
  const setup = reduce(initialWorkspace, { type: 'openModal', name: 'setup' });
  const child = reduce(setup, { type: 'openModal', name: 'profile' });
  assert.deepEqual(child.modal, { name: 'profile', parent: 'setup' });
  assert.equal(reduce(child, { type: 'closeModal', name: 'defaults' }), child);
  assert.deepEqual(reduce(child, { type: 'closeModal', name: 'profile' }).modal, { name: 'setup' });
});

test('profile invalidates plan and suggestion while leaving the watch route alone', () => {
  const plan = {
    instance: 1,
    candidate: {
      id: 'pin',
      name: 'Pin',
      kind: 'generated' as const,
      position: [10, 50] as [number, number],
    },
    allowance: 0 as const,
    search,
  };
  const planned = reduce(reduce(initialWorkspace, { type: 'commitSearch', search }), {
    type: 'openPlan',
    plan,
  });
  const watch = reduce(planned, { type: 'showWatch', setup: { position: [10, 50], radius: 50 } });
  const updated = reduce(watch, { type: 'commitProfile' });
  assert.equal(updated.plan, null);
  assert.equal(updated.watchSetup, undefined);
  assert.equal(updated.flow, 'watch');
});

test('late cache completion after a newer request cannot update active state or durable pointer', async () => {
  const generation = new RequestGeneration();
  const gate = deferred<void>();
  const cache: string[] = [];
  let active = 'previous';
  const storage = new Map<string, string>([['active-region', 'explicitly-saved']]);
  let writes = Promise.resolve();
  const cacheWrite = (value: string) => {
    const next = writes.then(async () => {
      if (value === 'A') await gate.promise;
      cache.push(value);
      storage.set('regional-evidence', cache.join(','));
      return value;
    });
    writes = next.then(() => undefined);
    return next;
  };
  const first = generation.begin();
  const pendingA = cacheCurrentEvidence(
    'A',
    cacheWrite,
    () => generation.current(first),
    (value) => {
      active = value;
    },
  );
  const second = generation.begin();
  const pendingB = cacheCurrentEvidence(
    'B',
    cacheWrite,
    () => generation.current(second),
    (value) => {
      active = value;
    },
  );
  gate.resolve();
  await Promise.all([pendingA, pendingB]);
  assert.deepEqual(cache, ['A', 'B']);
  assert.equal(active, 'B');
  // A simulated restart reads the separately saved pointer, not the cache entry.
  assert.equal(storage.get('active-region'), 'explicitly-saved');
  assert.equal(storage.get('regional-evidence'), 'A,B');
});

test('close and unmount suppress a pending cache completion', async () => {
  for (const close of ['cancel', 'dispose'] as const) {
    const generation = new RequestGeneration();
    const gate = deferred<void>();
    let activated = false;
    const request = generation.begin();
    const pending = cacheCurrentEvidence(
      'A',
      async (value) => {
        await gate.promise;
        return value;
      },
      () => generation.current(request),
      () => {
        activated = true;
      },
    );
    generation[close]();
    gate.resolve();
    await pending;
    assert.equal(activated, false);
  }
});

test('reopened draft commits its own pin and filters; later drafts do not reuse them', () => {
  const draft = reduce(initialWorkspace, {
    type: 'beginSearch',
    draft: search,
    area: { confirmed: true },
    restore: { pin: [10, 50], filters: { ...DEFAULT_FILTERS, kind: 'marina' } },
  });
  const committed = reduce(draft, { type: 'commitSearch', search });
  assert.equal(committed.filters.kind, 'marina');
  assert.deepEqual(committed.customPin?.position, [10, 50]);
  assert.equal(committed.draftRestore, undefined);
  const next = reduce(committed, { type: 'beginSearch', draft: search, area: { confirmed: true } });
  const withoutPin = reduce(next, { type: 'commitSearch', search });
  assert.equal(withoutPin.customPin, null);
});

test('detail and plan transitions retain candidate identity and return to base on tab change', () => {
  const candidate = {
    id: 'pin',
    name: 'Pin',
    kind: 'generated' as const,
    position: [10, 50] as [number, number],
  };
  const active = reduce(initialWorkspace, { type: 'commitSearch', search });
  const details = reduce(active, {
    type: 'openDetails',
    selection: { candidate, allowance: 20 },
    search,
  });
  assert.equal(details.detail?.candidate.id, 'pin');
  assert.equal(details.modal?.name, 'detail');
  const plan = reduce(details, {
    type: 'openPlan',
    plan: { instance: 1, candidate, allowance: 20, search },
  });
  assert.equal(plan.flow, 'plan');
  assert.equal(plan.modal, null);
  const saved = reduce(plan, { type: 'changeTab', tab: 'saved' });
  assert.equal(saved.flow, 'base');
  assert.equal(saved.tab, 'saved');
  assert.equal(saved.activeSearch, search);
});

// Compile-time regression: field keys and values cannot be mixed.
if (false) {
  // @ts-expect-error activeSearch requires a SearchRequest or null
  workspaceReducer(initialWorkspace, { type: 'set', key: 'activeSearch', value: 'saved' });
}
