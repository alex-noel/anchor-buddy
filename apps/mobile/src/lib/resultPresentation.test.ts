import assert from 'node:assert/strict';
import test from 'node:test';
import { searchRegion } from '@anchor-buddy/domain';
import { createDefaultSearch, createDemoPack, DEFAULT_VESSEL } from '@anchor-buddy/domain/testing';
import { createResultPresentation, markerLabel, markerText } from './resultPresentation';

const date = '2026-10-30T12:00:00Z';
const sample = searchRegion(createDemoPack(date), DEFAULT_VESSEL, createDefaultSearch(date))
  .assessments[0]!;
const assessments = Array.from({ length: 55 }, (_, i) => ({
  ...sample,
  id: `result-${i + 1}`,
  candidate: { ...sample.candidate, id: `result-${i + 1}`, name: `Place ${i + 1}` },
}));

test('rank and selection stay shared across the normal boundary and the extra selected marker', () => {
  const last = assessments.at(-1)!;
  const display = createResultPresentation(assessments, last.id);
  assert.equal(display.results.length, 55);
  assert.equal(display.markers.length, 51);
  assert.equal(display.selectedBeyondLimit, true);
  assert.equal(display.results.at(-1), display.markers.at(-1));
  assert.equal(display.markers.at(-1), display.selected);
  assert.equal(display.selected?.rank, 55);
  assert.match(markerLabel(display.selected!), /Place 55\. Rank 55\./);
  assert.equal(
    display.markers.find((item) => item.rank === 51),
    undefined,
  );
  assert.equal(display.markers.filter((item) => item.selected).length, 1);

  const sorted = createResultPresentation([...assessments].reverse(), last.id);
  assert.equal(sorted.markers[0], sorted.selected);
  assert.equal(sorted.selected?.rank, 1);
  assert.equal(sorted.selectedBeyondLimit, false);

  const filtered = createResultPresentation(assessments.slice(0, -1), last.id);
  assert.equal(filtered.selected, undefined);
  assert.ok(filtered.markers.every((item) => !item.selected));
});

test('manual pin has its own symbol and retains status without changing result ranks or count', () => {
  const pin = {
    ...sample,
    id: 'custom-pin',
    status: 'insufficient_evidence' as const,
    candidate: { ...sample.candidate, id: 'custom-pin', name: 'Chosen position' },
  };
  const display = createResultPresentation(assessments, pin.id, pin);
  assert.equal(display.results.length, 55);
  assert.equal(display.markers.length, 51);
  assert.equal(display.markers[49]?.rank, 50);
  assert.equal(display.markers.at(-1), display.selected);
  assert.equal(display.selected?.rank, null);
  assert.equal(markerText(display.selected!), '◆ ?');
  assert.equal(markerLabel(display.selected!), 'Chosen position. Manual pin. Needs more evidence.');
});
