import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceM, pointInArea, rectangle } from '@anchor-buddy/domain';
import { createDemoPack } from '@anchor-buddy/domain/testing';
import {
  buildMapStyle,
  circleGeometry,
  declutterEvidenceLabels,
  evidenceLabels,
  mapFitDiameter,
  radiusZoom,
} from '../components/mapStyle.ts';

const pack = () => createDemoPack('2026-10-30T12:00:00Z');
test('depth and seabed overlays default on and can be independently disabled', () => {
  const fixture = pack();
  const defaults = buildMapStyle(fixture, undefined, false);
  const ids = defaults.layers.map((layer: any) => layer.id);
  assert.ok(ids.includes('anchorbuddy-depth-fill'));
  assert.ok(ids.includes('anchorbuddy-bedding-fill'));
  const disabled = buildMapStyle(fixture, undefined, false, false, null, false);
  assert.ok(
    !disabled.layers.some((layer: any) =>
      ['anchorbuddy-depth-fill', 'anchorbuddy-bedding-fill'].includes(layer.id),
    ),
  );
  assert.equal(evidenceLabels(fixture, false, false).length, 0);
});

test('map preserves supplied hazard geometry without fixture-specific rendering exceptions', () => {
  const fixture = pack(),
    before = JSON.stringify(fixture);
  const style = buildMapStyle(fixture, undefined, false);
  const display = style.sources['anchorbuddy-hazards'].data.features;
  assert.equal(display.length, fixture.hazards.length);
  assert.ok(display.some((feature) => feature.properties.kind === 'shore'));
  assert.ok(display.some((feature) => feature.properties.kind === 'obstruction'));
  assert.equal(JSON.stringify(fixture), before);
  fixture.validation.status = 'reviewed';
  assert.ok(
    buildMapStyle(fixture, undefined, false).sources['anchorbuddy-hazards'].data.features.some(
      (feature) => feature.properties.kind === 'shore',
    ),
  );
});

test('European substrate imagery is bounded online context beneath analysis bedding', () => {
  const fixture = pack();
  const before = JSON.stringify(fixture);
  const style = buildMapStyle(fixture, undefined, true);
  const source = (style.sources as any)['anchorbuddy-emodnet-substrate'];
  assert.deepEqual(source.bounds, [-36, 15, 43, 85]);
  assert.ok(source.tiles[0].includes('seabed_substrate_250k'));
  const layers = style.layers as any[];
  assert.ok(
    layers.findIndex((layer) => layer.id === 'anchorbuddy-european-substrate') <
      layers.findIndex((layer) => layer.id === 'anchorbuddy-bedding-fill'),
  );
  assert.equal(
    (buildMapStyle(fixture, undefined, false).sources as any)['anchorbuddy-emodnet-substrate'],
    undefined,
  );
  assert.equal(
    (buildMapStyle(fixture, undefined, true, true, null, false).sources as any)[
      'anchorbuddy-emodnet-substrate'
    ],
    undefined,
  );
  assert.equal(JSON.stringify(fixture), before);
});

test('depth labels state source bounds and datum without treating them as point soundings', () => {
  const fixture = pack();
  const labels = evidenceLabels(fixture, true, false);
  assert.ok(labels.some((label) => label.text === '3.2–3.7 m' && label.detail.includes('MLLW')));
  assert.ok(labels.every((label) => label.detail.includes('synthetic test fixture')));
  fixture.depths[0]!.minDepthM = null;
  assert.ok(
    evidenceLabels(fixture, true, false).some((label) => label.text === 'Depth bounds unknown'),
  );
});

test('evidence labels stay inside their polygon and outside holes', () => {
  const fixture = pack();
  const geometry = rectangle(-81.12, 24.7, -81.1, 24.72);
  const hole = rectangle(-81.115, 24.705, -81.105, 24.715);
  assert.equal(geometry.type, 'Polygon');
  assert.equal(hole.type, 'Polygon');
  if (geometry.type !== 'Polygon' || hole.type !== 'Polygon')
    throw new Error('Expected polygon fixture');
  geometry.coordinates.push(hole.coordinates[0]!);
  fixture.depths = [{ ...fixture.depths[0]!, geometry }];
  const labels = evidenceLabels(fixture, true, false);
  assert.equal(labels.length, 1);
  assert.ok(pointInArea(labels[0]!.position, geometry));
});

test('search radius uses geographic metres and is independent of swing footprint', () => {
  const origin: [number, number] = [-81.104, 24.715];
  const radius = 3 * 1852;
  const geometry = circleGeometry(origin, radius);
  assert.ok(
    geometry.coordinates[0]!.every((point) => Math.abs(distanceM(origin, point) - radius) < 0.001),
  );
  const style = buildMapStyle(pack(), undefined, false, true, null, true, { origin, radiusNm: 3 });
  assert.equal(style.sources['anchorbuddy-search'].data.features.length, 1);
  assert.equal(style.sources['anchorbuddy-swing'].data.features.length, 0);
  assert.ok(radiusZoom(origin, 20) < radiusZoom(origin, 3));
  assert.ok(radiusZoom(origin, 50) < 8);
  assert.equal(radiusZoom(origin, Number.NaN), 12.2);
  // At MapLibre's 512px tile scale the circle fits a 270px-high form map with margins.
  const metresPerPixel =
    (78271.515 * Math.cos((origin[1] * Math.PI) / 180)) / 2 ** radiusZoom(origin, 3);
  assert.ok(Math.abs((2 * radius) / metresPerPixel - 220) < 0.01);
});

test('nearby depth labels declutter at overview scale and reveal detail when zoomed in', () => {
  const fixture = pack();
  const original = JSON.stringify(fixture);
  const labels = evidenceLabels(fixture, true, true);
  const overview = declutterEvidenceLabels(labels, 11);
  assert.ok(overview.some((label) => label.id.includes('demo-shallow-patch')));
  assert.ok(!overview.some((label) => label.id === 'depth-demo-main-depth-0'));
  const close = declutterEvidenceLabels(labels, 17);
  assert.ok(close.some((label) => label.id.includes('demo-shallow-patch')));
  assert.ok(close.some((label) => label.id === 'depth-demo-main-depth-0'));
  assert.ok(close.length > overview.length);
  assert.equal(JSON.stringify(fixture), original);
});

test('radius fit expands with the actual map container while keeping compact picker margins', () => {
  const origin: [number, number] = [-81.104, 24.715];
  assert.equal(mapFitDiameter(650, 270), 220);
  assert.equal(mapFitDiameter(1100, 730), 580);
  assert.equal(mapFitDiameter(1600, 1200), 650);
  assert.equal(mapFitDiameter(0, 0), 220);
  const compact = radiusZoom(origin, 3, 12.2, mapFitDiameter(650, 270));
  const full = radiusZoom(origin, 3, 12.2, mapFitDiameter(1100, 730));
  assert.ok(full > compact + 1);
  const metresPerPixel = (78271.515 * Math.cos((origin[1] * Math.PI) / 180)) / 2 ** full;
  assert.ok(Math.abs((3 * 1852 * 2) / metresPerPixel - 580) < 0.01);
});

test('depth labels yield to visible map markers without changing source evidence', () => {
  const labels = evidenceLabels(pack(), true, false);
  const shallow = labels.find((label) => label.id.includes('demo-shallow-patch'))!;
  const visible = declutterEvidenceLabels(labels, 17, 0, 0, [
    { position: shallow.position, radiusPx: 20 },
  ]);
  assert.ok(!visible.some((label) => label.id === shallow.id));
  assert.ok(labels.some((label) => label.id === shallow.id));
});
