import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoPack, createDefaultSearch, DEFAULT_VESSEL } from '@anchor-buddy/domain/testing';
import { reassessSelection } from './selectionAssessment';

test('refresh removing or moving a selected place leaves a recoverable detail state', () => {
  const now = '2026-11-11T12:00:00Z',
    pack = createDemoPack(now),
    search = createDefaultSearch(now);
  const place = pack.places[0]!;
  const candidate = {
    id: place.id,
    name: place.name,
    kind: place.kind,
    position: [...place.position] as [number, number],
  };
  const context = { assessedAt: now, purpose: 'current' as const };
  assert.ok(reassessSelection(candidate, DEFAULT_VESSEL, search, pack, context).assessment);
  place.position = [place.position[0] + 0.001, place.position[1]];
  assert.equal(
    reassessSelection(candidate, DEFAULT_VESSEL, search, pack, context).assessment,
    null,
  );
  pack.places = [];
  assert.match(
    reassessSelection(candidate, DEFAULT_VESSEL, search, pack, context).error,
    /no longer present/,
  );
  assert.ok(
    reassessSelection({ ...candidate, kind: 'generated' }, DEFAULT_VESSEL, search, pack, context)
      .assessment,
  );
});

test('a pin outside supported map coordinates fails without crashing the interface', () => {
  const now = '2026-11-11T12:00:00Z';
  const response = reassessSelection(
    { id: 'custom-pin', name: 'Selected position', kind: 'generated', position: [181, 86] },
    DEFAULT_VESSEL,
    createDefaultSearch(now),
    createDemoPack(now),
    { assessedAt: now, purpose: 'current' },
  );
  assert.equal(response.assessment, null);
  assert.ok(response.error);
});
