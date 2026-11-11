import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertRadiusDraft,
  createRadiusDraft,
  evidenceRadiusNm,
  radiusInputUnit,
  readRadiusDraft,
} from './mapDownloadControls';
import { areaBounds } from './regionalDataCore';

test('download radius displays the selected units without changing the saved area', () => {
  const nauticalMiles = 3.123456789;
  for (const units of ['nautical', 'metric', 'imperial'] as const) {
    const draft = createRadiusDraft(nauticalMiles, units);
    assert.equal(readRadiusDraft(draft), nauticalMiles);
    assert.deepEqual(
      areaBounds([16.4, 43.45], readRadiusDraft(draft)),
      areaBounds([16.4, 43.45], nauticalMiles),
    );
    assert.equal(readRadiusDraft(convertRadiusDraft(draft, 'nautical')), nauticalMiles);
  }
  assert.equal(radiusInputUnit('metric'), 'km');
  assert.equal(radiusInputUnit('imperial'), 'mi');
});

test('edited radius drafts accept comma decimals and preserve invalid drafts for correction', () => {
  const metric = { ...createRadiusDraft(3, 'metric'), text: '1,852' };
  assert.equal(readRadiusDraft(metric), 1);
  const unfinished = { ...metric, text: '-' };
  assert.ok(Number.isNaN(readRadiusDraft(unfinished)));
  assert.equal(convertRadiusDraft(unfinished, 'imperial').text, '-');
  assert.throws(
    () => areaBounds([16.4, 43.45], readRadiusDraft({ ...metric, text: '100' })),
    /radius/,
  );
});

test('evidence downloads keep within the actual discovery radius limits', () => {
  assert.equal(evidenceRadiusNm(areaBounds([16.4, 43.45], 0.1)), 0.25);
  assert.ok(Math.abs(evidenceRadiusNm(areaBounds([16.4, 43.45], 3)) - 3) < 1e-10);
  assert.equal(evidenceRadiusNm(areaBounds([16.4, 43.45], 50)), 25);
});
