/** TEST ONLY analytical geometry and sources; no runtime registry/coverage approval. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { assessHazardPrimitives, MAX_HAZARD_PRIMITIVES } from '../src/hazards.ts';
import {
  areaContainsDisk,
  destination,
  primitiveDistanceBounds,
  PRIMITIVE_GEOMETRY_LIMITS,
  rectangle,
} from '../src/geo.ts';
import { assessCandidate } from '../src/engine.ts';
import { validateRegionPack } from '../src/validation.ts';
import { around } from '../../../apps/api/src/providers/live-types.ts';
import { DiscoveryService, validateDiscovery } from '../../../apps/api/src/providers/discovery.ts';
import { createApp } from '../../../apps/api/src/server.ts';
import { createDefaultSearch, createDemoPack, DEFAULT_VESSEL } from '../src/testing.ts';
import type { HazardPrimitive } from '../src/contracts.ts';
import type { Position } from '../src/types.ts';
const now = '2026-11-11T00:00:00Z';
const origin: Position = [-81.104, 24.715];
const source = {
  sourceId: 'demo-fixture',
  documentRevision: 'test-only',
  locator: 'test-only geometry',
};
const primitive = (geometry: HazardPrimitive['geometry'], id = 'test-hazard'): HazardPrimitive => ({
  id,
  name: 'Analytical test hazard',
  kind: 'obstruction',
  objectClass: 'OBSTRN',
  geometry,
  sourceIds: [source.sourceId],
  extentM: 0,
  positionalUncertaintyM: 0,
  extentSource: source,
  uncertaintySource: source,
});
const point = (metres: number) =>
  primitive({ type: 'Point', coordinates: destination(origin, 90, metres) });
const excluded = (r: ReturnType<typeof assessHazardPrimitives>) =>
  r.reasons.some((r) => r.severity === 'excluded');
const evaluate = (primitives: HazardPrimitive[]) => {
  const pack = createDemoPack(now);
  pack.hazardPrimitives = primitives;
  const search = createDefaultSearch(now);
  return {
    pack,
    search,
    vessel: structuredClone(DEFAULT_VESSEL),
    candidate: { id: 'test-drop', name: 'Test drop', kind: 'generated' as const, position: origin },
  };
};

test('S01-T01: internal point and guarded tangent exclude with original source identity', () => {
  for (const metres of [10, 50 + PRIMITIVE_GEOMETRY_LIMITS.guardM]) {
    const hazard = point(metres);
    const result = assessHazardPrimitives(origin, 50, [hazard]);
    assert.equal(excluded(result), true);
    assert.deepEqual(result.reasons.find((r) => r.severity === 'excluded')!.sourceIds, [
      'demo-fixture',
    ]);
    const f = evaluate([hazard]);
    assert.deepEqual(validateRegionPack(f.pack), []);
    assert.equal(assessCandidate(f.candidate, f.vessel, f.search, f.pack).status, 'excluded');
  }
});

test('S01-T02: crossing cable detects interior intersection and is byte-identical on reversal', () => {
  const coordinates = [destination(origin, 270, 200), destination(origin, 90, 200)];
  const hazard = {
    ...primitive({ type: 'LineString', coordinates }),
    kind: 'cable' as const,
    objectClass: 'CBLSUB',
  };
  const a = assessHazardPrimitives(origin, 50, [hazard]);
  const b = assessHazardPrimitives(origin, 50, [
    { ...hazard, geometry: { type: 'LineString', coordinates: [...coordinates].reverse() } },
  ]);
  assert.equal(excluded(a), true);
  assert.deepEqual(a, b);
  const zero = primitive({ type: 'LineString', coordinates: [origin, origin] });
  assert.equal(excluded(assessHazardPrimitives(origin, 50, [zero])), true);
});

test('S01-T03: unknown extent/uncertainty cannot support hazard completeness or a pass', () => {
  for (const key of ['extentM', 'positionalUncertaintyM'] as const) {
    const hazard = { ...point(1000), [key]: null };
    const f = evaluate([hazard]);
    assert.deepEqual(validateRegionPack(f.pack), []);
    const result = assessCandidate(f.candidate, f.vessel, f.search, f.pack);
    assert.equal(result.status, 'insufficient_evidence');
    assert.ok(result.reasons.some((r) => r.code === 'hazard_primitive_uncertainty'));
    assert.ok(result.reasons.some((r) => r.code === 'hazards_coverage'));
    assert.equal(assessHazardPrimitives(origin, 50, [hazard]).complete, false);
  }
  assert.equal(
    excluded(
      assessHazardPrimitives(origin, 50, [
        { ...point(10), extentM: null, positionalUncertaintyM: null },
      ]),
    ),
    true,
  );
  // Even known dimensions do not invent a model approval. Identical rule for all inputs.
  const known = assessHazardPrimitives(origin, 50, [point(1000)]);
  assert.equal(known.complete, false);
  assert.ok(known.reasons.some((r) => r.code === 'hazard_model_review_required'));
});

test('S01-T04: tiny enclosed polygon and hole boundaries use full geometry', () => {
  const w = destination(origin, 270, 0.5)[0],
    e = destination(origin, 90, 0.5)[0];
  const s = destination(origin, 180, 0.5)[1],
    n = destination(origin, 0, 0.5)[1];
  assert.equal(
    excluded(assessHazardPrimitives(origin, 100, [primitive(rectangle(w, s, e, n))])),
    true,
  );
  const square = (m: number) =>
    rectangle(
      destination(origin, 270, m)[0],
      destination(origin, 180, m)[1],
      destination(origin, 90, m)[0],
      destination(origin, 0, m)[1],
    );
  const outer = square(200),
    inner = square(80);
  assert.equal(outer.type, 'Polygon');
  assert.equal(inner.type, 'Polygon');
  if (outer.type !== 'Polygon' || inner.type !== 'Polygon') return;
  const habitat = {
    ...primitive({ type: 'Polygon', coordinates: [outer.coordinates[0]!, inner.coordinates[0]!] }),
    kind: 'habitat' as const,
  };
  assert.equal(excluded(assessHazardPrimitives(origin, 50, [habitat])), false);
  assert.equal(excluded(assessHazardPrimitives(origin, 80, [habitat])), true);
});

test('S01-T05: wind and deeper alternatives cannot remove an existing full-circle exclusion', () => {
  const f = evaluate([point(10)]);
  for (const direction of [0, 180]) {
    f.pack.weather.forEach((w) => {
      w.windDirectionDeg = direction;
    });
    for (const allowance of [0, 20, 30] as const) {
      const result = assessCandidate(f.candidate, f.vessel, f.search, f.pack, undefined, allowance);
      assert.equal(result.status, 'excluded');
      assert.ok(result.reasons.some((r) => r.code === 'hazard_obstruction'));
    }
  }
  const baseline = assessCandidate(f.candidate, f.vessel, f.search, f.pack);
  const deeper = structuredClone(f);
  deeper.pack.depths.forEach((depth) => {
    if (depth.maxDepthM !== null) depth.maxDepthM += 1;
  });
  const deeperResult = assessCandidate(
    deeper.candidate,
    deeper.vessel,
    deeper.search,
    deeper.pack,
    undefined,
    20,
  );
  assert.ok(deeperResult.requiredRodeM! > baseline.requiredRodeM!);
  assert.ok(deeperResult.swingRadiusM! >= baseline.swingRadiusM!);
  assert.equal(deeperResult.status, 'excluded');
  f.search.deployedRodeM = 65;
  const extended = assessCandidate(f.candidate, f.vessel, f.search, f.pack);
  assert.ok(extended.swingRadiusM! >= baseline.swingRadiusM!);
  assert.equal(extended.status, 'excluded');
  assert.equal(excluded(assessHazardPrimitives(origin, 50, [point(65)])), false);
  assert.equal(excluded(assessHazardPrimitives(origin, 70, [point(65)])), true);
});

test('S01-T06: adjacent polygons and a narrow seam never union into full-footprint coverage', () => {
  for (const gap of [0, 0.000001]) {
    const left = rectangle(origin[0] - 0.01, origin[1] - 0.01, origin[0] - gap, origin[1] + 0.01);
    const right = rectangle(origin[0] + gap, origin[1] - 0.01, origin[0] + 0.01, origin[1] + 0.01);
    assert.equal(areaContainsDisk(origin, 50, left), false);
    assert.equal(areaContainsDisk(origin, 50, right), false);
  }
});

test('S01-T07: fixed PROJ WGS84 corpus lies within deterministic conservative distance bounds', (t) => {
  const reference = JSON.parse(
    readFileSync(new URL('./fixtures/primitive-geodesic-reference.json', import.meta.url), 'utf8'),
  ) as {
    testOnly: boolean;
    cases: {
      id: string;
      origin: Position;
      geometry: HazardPrimitive['geometry'];
      referenceM: number;
    }[];
  };
  assert.equal(reference.testOnly, true);
  let maxSpan = 0,
    maxEvaluations = 0;
  const start = performance.now();
  for (const c of reference.cases) {
    const budget = { remaining: PRIMITIVE_GEOMETRY_LIMITS.maxDistanceEvaluations };
    const result = primitiveDistanceBounds(c.origin, c.geometry, budget);
    assert.equal(result.status, 'bounded', c.id);
    if (result.status !== 'bounded') continue;
    assert.ok(
      result.lowerM <= c.referenceM + 0.00001,
      `${c.id}: lower ${result.lowerM} > ${c.referenceM}`,
    );
    assert.ok(
      result.upperM + 0.00001 >= c.referenceM,
      `${c.id}: upper ${result.upperM} < ${c.referenceM}`,
    );
    assert.deepEqual(primitiveDistanceBounds(c.origin, c.geometry), result);
    if (c.geometry.type === 'LineString')
      assert.deepEqual(
        primitiveDistanceBounds(c.origin, {
          ...c.geometry,
          coordinates: [...c.geometry.coordinates].reverse(),
        }),
        result,
      );
    maxSpan = Math.max(maxSpan, result.upperM - result.lowerM);
    maxEvaluations = Math.max(
      maxEvaluations,
      PRIMITIVE_GEOMETRY_LIMITS.maxDistanceEvaluations - budget.remaining,
    );
  }
  t.diagnostic(
    JSON.stringify({
      cases: reference.cases.length,
      maxSpanM: maxSpan,
      maxEvaluations,
      elapsedMs: performance.now() - start,
    }),
  );
});

test('primitive work is bounded and unsupported extent never becomes assured clearance', () => {
  const geometry = point(100).geometry;
  assert.deepEqual(primitiveDistanceBounds(origin, geometry, { remaining: 0 }), {
    status: 'unsupported',
    reason: 'complexity',
  });
  assert.deepEqual(primitiveDistanceBounds(origin, point(60_000).geometry), {
    status: 'unsupported',
    reason: 'extent',
  });
  assert.equal(
    primitiveDistanceBounds([179.99, 0], {
      type: 'LineString',
      coordinates: [
        [179.99, 0],
        [-179.99, 0],
      ],
    }).status,
    'unsupported',
  );
  assert.equal(primitiveDistanceBounds([0, 85.01], geometry).status, 'unsupported');
  const north = destination(origin, 0, 50);
  const a = destination(north, 270, 200),
    b = destination(north, 90, 200);
  const pathological = {
    type: 'LineString' as const,
    coordinates: Array.from({ length: 4096 }, (_, index) => (index % 2 ? a : b)),
  };
  const budget = { remaining: PRIMITIVE_GEOMETRY_LIMITS.maxDistanceEvaluations };
  assert.deepEqual(primitiveDistanceBounds(origin, pathological, budget), {
    status: 'unsupported',
    reason: 'complexity',
  });
  assert.equal(budget.remaining, 0);
  const bounded = assessHazardPrimitives(origin, 50, [
    point(10),
    primitive(pathological, 'z-complex'),
  ]);
  assert.equal(excluded(bounded), true);
  assert.ok(bounded.reasons.some((reason) => reason.code === 'hazard_primitive_unsupported'));
  const tooMany = Array.from({ length: MAX_HAZARD_PRIMITIVES + 1 }, (_, i) => ({
    ...point(100),
    id: `test-${i}`,
  }));
  const result = assessHazardPrimitives(origin, 50, tooMany);
  assert.equal(result.complete, false);
  assert.ok(result.reasons.some((r) => r.code === 'hazard_primitive_unsupported'));
  const before = JSON.stringify(tooMany);
  assessHazardPrimitives(origin, 50, tooMany);
  assert.equal(JSON.stringify(tooMany), before);
});

test('primitive provenance, malformed geometry, duplicates and unsupported count reject before assessment', () => {
  const f = evaluate([point(10)]);
  for (const hazard of [
    { ...point(10), sourceIds: ['unresolved'] },
    { ...point(10), extentM: -1 },
    { ...point(10), geometry: { type: 'LineString', coordinates: [origin] } },
    { ...point(10), geometry: { type: 'Point', coordinates: [NaN, 0] } },
  ])
    assert.ok(validateRegionPack({ ...f.pack, hazardPrimitives: [hazard] }).length);
  assert.match(
    validateRegionPack({ ...f.pack, hazardPrimitives: [point(10), point(20)] }).join(' '),
    /Duplicate/,
  );
  const tooComplex = primitive({
    type: 'LineString',
    coordinates: Array.from({ length: 4097 }, () => origin),
  });
  assert.match(
    validateRegionPack({ ...f.pack, hazardPrimitives: [tooComplex] }).join(' '),
    /complexity/,
  );
  assert.equal(
    excluded(assessHazardPrimitives(origin, 50, [{ ...point(100), extentM: 60 }])),
    true,
  );
  assert.equal(
    excluded(assessHazardPrimitives(origin, 50, [{ ...point(100), positionalUncertaintyM: 60 }])),
    true,
  );
  const input = [point(100), { ...point(10), id: 'a-test' }];
  assert.deepEqual(
    assessHazardPrimitives(origin, 50, input),
    assessHazardPrimitives(origin, 50, [...input].reverse()),
  );
  assert.ok(
    validateRegionPack({ ...f.pack, schemaVersion: 2 }).some((e) =>
      e.includes('UNSUPPORTED_V2_ACTIVATION'),
    ),
  );
});

test('supported region latitude bounds include ±85 and discovery rejects unsupported latitudes before work', () => {
  const pack = createDemoPack(now);
  assert.deepEqual(validateRegionPack({ ...pack, bounds: [-180, -85, 180, 85] }), []);
  for (const bounds of [
    [-180, -85.001, 180, 85],
    [-180, -85, 180, 85.001],
    [-180, -100, 180, 100],
    [179, -1, -179, 1],
    [-1, 2, 1, 1],
  ]) {
    assert.ok(
      validateRegionPack({ ...pack, bounds }).some((error) => error.includes('Region bounds')),
    );
  }
  for (const latitude of [-85, 85]) {
    const input = { center: [0, latitude], radiusNm: 1 };
    assert.deepEqual(validateDiscovery(input, new Date(now)).center, input.center);
    assert.deepEqual(validateRegionPack({ ...pack, bounds: around([0, latitude], 1) }), []);
  }
  assert.throws(() => validateDiscovery({ center: [0, 85.001], radiusNm: 1 }, new Date(now)), {
    code: 'INVALID_DISCOVERY',
    status: 400,
  });
});

test('monorepo discovery HTTP boundary returns empty unknown at ±85 and actionable 400 outside it', async (t) => {
  let upstream = 0;
  const unavailable = async (): Promise<never> => {
    upstream++;
    throw new Error('Controlled unavailable source');
  };
  const discovery = new DiscoveryService(
    { places: { discover: unavailable }, wind: { forecast: unavailable } },
    () => new Date(now),
  );
  const app = createApp({ discovery, now: () => new Date(now) });
  t.after(() => app.close());
  for (const latitude of [-85, 85]) {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/regions/discover',
      payload: { center: [0, latitude], radiusNm: 1 },
    });
    assert.equal(response.statusCode, 200, response.body);
    const result = response.json();
    assert.equal(result.pack.validation.status, 'unreviewed');
    assert.deepEqual(result.pack.coverage, []);
    assert.deepEqual(validateRegionPack(result.pack), []);
  }
  const before = upstream;
  const invalid = await app.inject({
    method: 'POST',
    url: '/v1/regions/discover',
    payload: { center: [0, 85.001], radiusNm: 1 },
  });
  assert.equal(invalid.statusCode, 400, invalid.body);
  assert.equal(upstream, before);
});
