import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSearch } from '@anchor-buddy/domain';
import {
  ActivationQueue,
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

test('only latest request activates; cancellation during storage restores previous pointer', async () => {
  const generation = new RequestGeneration();
  let pointer = 'previous';
  const gate = deferred<void>();
  let writing = false;
  const queue = new ActivationQueue<string>({
    read: async () => pointer,
    write: async (value) => {
      if (value === 'A') {
        writing = true;
        await gate.promise;
      }
      pointer = value;
    },
    remove: async () => {
      pointer = '';
    },
  });
  const a = generation.begin();
  const first = queue.activate('A', () => generation.current(a));
  while (!writing) await Promise.resolve();
  const b = generation.begin();
  const second = queue.activate('B', () => generation.current(b));
  gate.resolve();
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.equal(pointer, 'B');
  generation.dispose();
  assert.equal(generation.current(b), false);
});

test('closing a search before queued activation never changes the pointer', async () => {
  const generation = new RequestGeneration();
  let pointer = 'previous';
  const queue = new ActivationQueue<string>({
    read: async () => pointer,
    write: async (value) => {
      pointer = value;
    },
    remove: async () => {
      pointer = '';
    },
  });
  const request = generation.begin();
  const pending = queue.activate('new', () => generation.current(request));
  generation.cancel();
  assert.equal(await pending, false);
  assert.equal(pointer, 'previous');
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
