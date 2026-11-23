import assert from 'node:assert/strict';
import test from 'node:test';
import { chartIssue, chartLoadReducer as reduce, initialChartLoad } from './chartLoad';

test('a rendered frame and unrelated tile success cannot clear a source error', () => {
  const failed = { sourceId: 'world', tileKey: '12' };
  let load = reduce(initialChartLoad, { type: 'sourceFailed', source: failed });
  load = reduce(load, { type: 'rendered' });
  load = reduce(load, { type: 'sourceRecovered', source: { ...failed, tileKey: '13' } });
  load = reduce(load, { type: 'sourcesDisplayed', ids: new Set(['world']) });
  assert.equal(load.phase, 'ready');
  assert.equal(chartIssue(load), 'partial');
  load = reduce(load, { type: 'sourceRecovered', source: failed });
  assert.equal(chartIssue(load), undefined);
});

test('renderer recovery needs a successful new render and retains new tile failures', () => {
  let load = reduce(initialChartLoad, { type: 'rendererFailed' });
  load = reduce(load, { type: 'rendered' });
  assert.equal(chartIssue(load), 'renderer');
  load = reduce(load, { type: 'start' });
  assert.equal(load.phase, 'loading');
  assert.equal(chartIssue(load), 'renderer');
  load = reduce(load, { type: 'sourceFailed', source: { sourceId: 'world' } });
  load = reduce(load, { type: 'rendered' });
  assert.equal(chartIssue(load), 'partial');
  load = reduce(load, { type: 'start' });
  load = reduce(load, { type: 'slow' });
  assert.equal(chartIssue(load), 'partial');
  load = reduce(load, { type: 'rendered' });
  assert.equal(chartIssue(load), undefined);
  assert.equal(load.slow, false);
});
