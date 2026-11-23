import test from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_CONVERSIONS, unitConversionTolerance } from '@anchor-buddy/domain';
import {
  convertRadiusDraft,
  createRadiusDraft,
  evidenceRadiusNm,
  mapDownloadProgressAnnouncement,
  mapTileProgressPercent,
  radiusInputUnit,
  readRadiusDraft,
  shouldAnnounceMapDownloadProgress,
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

test('edited radius converts once and survives repeated unit toggles within frozen tolerance', () => {
  const editedMetric = { ...createRadiusDraft(3, 'metric'), text: '6' };
  const expectedNm = 6 / CANONICAL_CONVERSIONS.kilometresPerNauticalMile;
  const imperial = convertRadiusDraft(editedMetric, 'imperial');
  const backToNautical = convertRadiusDraft(imperial, 'nautical');
  const throughMetricAgain = convertRadiusDraft(backToNautical, 'metric');
  for (const draft of [editedMetric, imperial, backToNautical, throughMetricAgain]) {
    assert.ok(Math.abs(readRadiusDraft(draft) - expectedNm) <= unitConversionTolerance(expectedNm));
  }
});

test('evidence downloads keep within the actual discovery radius limits', () => {
  assert.equal(evidenceRadiusNm(areaBounds([16.4, 43.45], 0.1)), 0.25);
  assert.ok(Math.abs(evidenceRadiusNm(areaBounds([16.4, 43.45], 3)) - 3) < 1e-10);
  assert.equal(evidenceRadiusNm(areaBounds([16.4, 43.45], 50)), 25);
});

test('map progress percentage requires a known denominator and is bounded to tile totals', () => {
  assert.equal(mapTileProgressPercent(5), null);
  assert.equal(mapTileProgressPercent(5, 0), null);
  assert.equal(mapTileProgressPercent(5, Number.NaN), null);
  assert.equal(mapTileProgressPercent(0, 20), 0);
  assert.equal(mapTileProgressPercent(9, 20), 45);
  assert.equal(mapTileProgressPercent(25, 20), 100);
});

test('progress announcements throttle tile updates but announce readiness and stage changes', () => {
  const start = { phase: 'map' as const, completedTiles: 0, tileCount: 100 };
  assert.equal(shouldAnnounceMapDownloadProgress(null, start), true);
  assert.equal(shouldAnnounceMapDownloadProgress(start, { ...start, completedTiles: 5 }), false);
  assert.equal(shouldAnnounceMapDownloadProgress(start, { ...start, completedTiles: 10 }), true);
  assert.equal(
    shouldAnnounceMapDownloadProgress(start, { ...start, completedTiles: 1, usableZoom: 0 }),
    true,
  );
  assert.equal(shouldAnnounceMapDownloadProgress(start, { phase: 'evidence' }), true);
  assert.match(
    mapDownloadProgressAnnouncement({ ...start, completedTiles: 100 }),
    /Completing required fonts and map checks/,
  );
  assert.match(
    mapDownloadProgressAnnouncement({ phase: 'evidence-failed' }),
    /Map files are saved, but regional evidence download failed/,
  );
});
