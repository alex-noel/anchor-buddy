import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areaContainsDisk,
  assessCandidate,
  createDefaultSearch,
  createDemoPack,
  DEFAULT_VESSEL,
  destination,
  diskIntersectsArea,
  estimateCost,
  generateCandidates,
  rectangle,
  searchRegion,
  sortAssessments,
  validateRegionPack,
  validateSearch,
  validateVessel,
} from '../src/index.ts';
import type {
  Candidate,
  Place,
  Position,
  RegionPack,
  SearchRequest,
  VesselProfile,
} from '../src/index.ts';

const NOW = '2026-10-30T12:00:00Z';
const fixture = () => ({
  pack: createDemoPack(NOW),
  vessel: structuredClone(DEFAULT_VESSEL),
  search: createDefaultSearch(NOW),
});
const anchor = (pack: RegionPack): Candidate => {
  const place = pack.places[0]!;
  return { id: place.id, name: place.name, position: place.position, kind: place.kind, place };
};
const codes = (result: ReturnType<typeof assessCandidate>) =>
  result.reasons.map((reason) => reason.code);
const result = (f: ReturnType<typeof fixture>) =>
  assessCandidate(anchor(f.pack), f.vessel, f.search, f.pack);

test('baseline demonstration passes only with an explicit simulation flag and conservative depth/rode', () => {
  const f = fixture(),
    assessment = result(f);
  assert.equal(assessment.status, 'passes');
  assert.equal(assessment.simulated, true);
  assert.ok(Math.abs(assessment.minDepthM! - 3.15) < 1e-9);
  assert.equal(assessment.maxDepthM, 4.5);
  assert.equal(assessment.requiredRodeM, 39);
  assert.ok(Math.abs(assessment.swingRadiusM! - 57.05) < 1e-9);
  assert.equal(assessment.approach.status, 'unverified');
  assert.match(assessment.reasons[0]!.message, /SIMULATION/);
});

test('overnight low water excludes insufficient under-keel clearance', () => {
  const f = fixture();
  f.pack.tides[0]!.minWaterLevelM = -1;
  assert.ok(codes(result(f)).includes('under_keel_clearance'));
  assert.equal(result(f).status, 'excluded');
});

test('rising water increases rode, and actual deployed rode enlarges the assessed disk', () => {
  const f = fixture();
  const baseline = result(f);
  f.pack.tides[0]!.maxWaterLevelM = 1.05;
  assert.ok(result(f).requiredRodeM! > baseline.requiredRodeM!);
  f.search.deployedRodeM = 60;
  assert.equal(result(f).swingRadiusM, 78.05);
  f.search.deployedRodeM = 20;
  assert.ok(codes(result(f)).includes('deployed_rode_short'));
  f.search.deployedRodeM = 80;
  assert.ok(codes(result(f)).includes('deployed_rode_exceeds_equipment'));
});

test('tiny hazards anywhere inside full disk are detected even opposite forecast wind', () => {
  const f = fixture(),
    centre = anchor(f.pack).position;
  const p = destination(centre, 280, 35);
  f.pack.hazards.push({
    id: 'tiny',
    name: 'Tiny rock',
    kind: 'obstruction',
    geometry: rectangle(p[0], p[1], p[0] + 0.00001, p[1] + 0.00001),
    sourceIds: ['demo-fixture'],
  });
  assert.ok(codes(result(f)).includes('hazard_obstruction'));
  for (const frame of f.pack.weather) frame.windDirectionDeg = 100;
  assert.ok(codes(result(f)).includes('hazard_obstruction'));
  f.pack.weather[1]!.windDirectionDeg = 280;
  assert.equal(result(f).status, 'excluded');
});

test('deployed rode expansion detects previously distant hazards', () => {
  const f = fixture(),
    centre = anchor(f.pack).position;
  const p = destination(centre, 180, 72);
  f.pack.hazards.push({
    id: 'outer',
    name: 'Outer rock',
    kind: 'obstruction',
    geometry: rectangle(p[0], p[1], p[0] + 0.00001, p[1] + 0.00001),
    sourceIds: ['demo-fixture'],
  });
  assert.equal(result(f).status, 'passes');
  f.search.deployedRodeM = 65;
  assert.ok(codes(result(f)).includes('hazard_obstruction'));
});

test('a deeper strip in expanded footprint increases required rode and checks clearance everywhere', () => {
  const f = fixture(),
    centre = anchor(f.pack).position;
  const p = destination(centre, 90, 30);
  f.pack.depths.push({
    id: 'deep-strip',
    geometry: rectangle(p[0], p[1] - 0.0001, p[0] + 0.0001, p[1] + 0.0001),
    minDepthM: 4,
    maxDepthM: 6,
    verticalDatum: 'MLLW',
    surveyQuality: 'reviewed',
    sourceIds: ['demo-fixture'],
  });
  f.search.preferredMaxDepthM = 10;
  assert.equal(result(f).requiredRodeM, 55);
  assert.ok(result(f).swingRadiusM! > 70);
});

test('polygon holes and small islands are not treated as covered seabed', () => {
  const outer: Position[] = [
    [-81.12, 24.7],
    [-81.1, 24.7],
    [-81.1, 24.72],
    [-81.12, 24.72],
    [-81.12, 24.7],
  ];
  const hole: Position[] = [
    [-81.111, 24.709],
    [-81.109, 24.709],
    [-81.109, 24.711],
    [-81.111, 24.711],
    [-81.111, 24.709],
  ];
  const geometry = { type: 'Polygon' as const, coordinates: [outer, hole] };
  assert.equal(areaContainsDisk([-81.11, 24.71], 20, geometry), false);
  assert.equal(diskIntersectsArea([-81.11, 24.71], 20, geometry), false);
  assert.equal(diskIntersectsArea([-81.11, 24.71], 150, geometry), true);
  assert.equal(areaContainsDisk([-81.1089, 24.71], 40, geometry), false);
});

test('missing positive habitat coverage cannot pass, even with no mapped habitat hazards', () => {
  const f = fixture();
  f.pack.hazards = [];
  f.pack.coverage = f.pack.coverage.filter((area) => area.layer !== 'habitat');
  assert.equal(result(f).status, 'insufficient_evidence');
  assert.ok(codes(result(f)).includes('habitat_coverage'));
});

test('unknown bounds, unreviewed survey, mismatched datum and uncertain tides never pass', () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => {
      f.pack.depths[0]!.maxDepthM = null;
    },
    (f: ReturnType<typeof fixture>) => {
      f.pack.depths[0]!.surveyQuality = 'unknown';
    },
    (f: ReturnType<typeof fixture>) => {
      f.pack.tides[0]!.verticalDatum = 'NAVD88';
    },
    (f: ReturnType<typeof fixture>) => {
      f.pack.tides[0]!.uncertaintyM = null;
    },
    (f: ReturnType<typeof fixture>) => {
      f.pack.tides[0]!.stationRelationshipReviewed = false;
    },
  ]) {
    const f = fixture();
    mutate(f);
    assert.equal(result(f).status, 'insufficient_evidence');
  }
});

test('chart seams do not produce invented continuous coverage', () => {
  const f = fixture(),
    centre = anchor(f.pack).position;
  const depth = f.pack.depths[0]!;
  f.pack.depths = [
    { ...depth, id: 'west', geometry: rectangle(-81.145, 24.685, centre[0], 24.745) },
    { ...depth, id: 'east', geometry: rectangle(centre[0], 24.685, -81.055, 24.745) },
  ];
  assert.ok(codes(result(f)).includes('depth_coverage'));
  assert.equal(result(f).status, 'insufficient_evidence');
});

test('forecast and tide gaps include departure contingency', () => {
  const f = fixture();
  f.pack.weather = f.pack.weather.slice(0, 2);
  assert.ok(codes(result(f)).includes('forecast_gap'));
  const g = fixture();
  g.pack.tides[0]!.validUntil = g.search.departure;
  assert.ok(codes(result(g)).includes('tide_gap'));
});

test('wave, gust, current limits and official warnings are hard exclusions', () => {
  for (const [key, value, expected] of [
    ['waveM', 2, 'wave_limit'],
    ['gustKnots', 40, 'gust_limit'],
    ['currentKnots', 3, 'current_limit'],
  ] as const) {
    const f = fixture();
    f.pack.weather[1]![key] = value;
    assert.ok(codes(result(f)).includes(expected));
  }
  const f = fixture();
  f.pack.weather[1]!.warnings = ['Small craft advisory'];
  assert.ok(codes(result(f)).includes('official_warning'));
});

test('missing direction/current/wave evidence cannot be replaced by calm assumptions', () => {
  for (const key of [
    'windDirectionDeg',
    'currentKnots',
    'currentDirectionDeg',
    'waveM',
    'swellM',
  ] as const) {
    const f = fixture();
    f.pack.weather[1]![key] = null;
    assert.equal(result(f).status, 'insufficient_evidence');
  }
});

test('real pack requires maritime review, nonsynthetic sources and reviewed equipment guidance', () => {
  const f = fixture();
  f.pack.validation = { status: 'unreviewed', notice: 'Not reviewed' };
  assert.ok(codes(result(f)).includes('unreviewed_pack'));
  assert.ok(codes(result(f)).includes('scope_unreviewed'));
  f.pack.validation = {
    status: 'reviewed',
    notice: 'Reviewed',
    reviewedBy: 'Test reviewer',
    reviewedAt: NOW,
  };
  assert.ok(codes(result(f)).includes('source_unverified'));
  f.pack.sources[0]!.synthetic = false;
  f.vessel.anchor.scopeGuidance!.reviewStatus = 'reviewed';
  assert.equal(result(f).status, 'passes');
  assert.equal(result(f).simulated, false);
});

test('expired offline sources and snapshots produce insufficient evidence', () => {
  const f = fixture();
  f.pack.sources[0]!.validUntil = f.search.departure;
  assert.ok(codes(result(f)).includes('source_unverified'));
  f.pack.validUntil = f.search.departure;
  assert.ok(codes(result(f)).includes('expired_pack'));
});

test('scope must be provided, equipment-specific and within reviewed environmental envelope', () => {
  const f = fixture();
  f.vessel.anchor.scopeGuidance = null;
  assert.ok(codes(result(f)).includes('scope_unreviewed'));
  const g = fixture();
  g.vessel.anchor.scopeGuidance!.maxGustKnots = 18;
  assert.ok(codes(result(g)).includes('scope_conditions'));
});

test('restriction jurisdiction and effective intervals are resolved conservatively', () => {
  const f = fixture();
  f.pack.restrictions[0]!.geometry = f.pack.depths[0]!.geometry;
  f.pack.restrictions[0]!.resolved = false;
  assert.ok(codes(result(f)).includes('restriction_unresolved'));
  f.pack.restrictions[0]!.resolved = true;
  assert.ok(codes(result(f)).includes('restricted'));
  f.pack.restrictions[0]!.validFrom = '2026-11-01T00:00:00Z';
  assert.equal(result(f).status, 'passes');
});

test('day reef buoys excluded overnight and daytime switch cannot evade a night crossing', () => {
  const f = fixture(),
    place = f.pack.places.find((p) => p.floridaKeysReefBuoy)!;
  const candidate = {
    id: place.id,
    name: place.name,
    position: place.position,
    kind: place.kind,
    place,
  };
  assert.ok(codes(assessCandidate(candidate, f.vessel, f.search, f.pack)).includes('day_use_only'));
  f.search.visitMode = 'daytime';
  assert.ok(codes(assessCandidate(candidate, f.vessel, f.search, f.pack)).includes('day_use_only'));
  f.search.departure = '2026-10-30T18:00:00Z';
  assert.equal(assessCandidate(candidate, f.vessel, f.search, f.pack).status, 'passes');
});

test('dock dimensions, unknown overnight permission, entrance depth, access and availability remain distinct', () => {
  const f = fixture(),
    place = f.pack.places.find((p) => p.kind === 'marina')!;
  const candidate = {
    id: place.id,
    name: place.name,
    position: place.position,
    kind: place.kind,
    place,
  };
  const check = () => assessCandidate(candidate, f.vessel, f.search, f.pack);
  place.maxBeamM = 3;
  assert.ok(codes(check()).includes('vessel_limit'));
  place.maxBeamM = 8;
  place.entranceMinDepthM = 1.7;
  assert.equal(check().approach.status, 'excluded');
  place.entranceMinDepthM = 3.2;
  place.overnightAllowed = null;
  assert.ok(codes(check()).includes('overnight_unknown'));
  place.overnightAllowed = true;
  place.availability = 'unavailable';
  assert.ok(codes(check()).includes('unavailable'));
  place.availability = 'unknown';
  assert.equal(check().status, 'passes');
  assert.equal(check().availability, 'unknown');
  place.accessWindows = [{ from: f.search.arrival, until: f.search.departure }];
  assert.ok(codes(check()).includes('access_window'));
});

test('preferred depth fallback tries +20 before +30 and does not relax usable rode', () => {
  const f = fixture();
  f.pack.places = [f.pack.places[0]!];
  f.search.preferredMaxDepthM = 4;
  const options = { maxGeneratedCandidates: 10 };
  const twenty = searchRegion(f.pack, f.vessel, f.search, options);
  assert.equal(twenty.depthFallbackPercent, 20);
  assert.ok(twenty.assessments.every((a) => a.depthAllowancePercent === 20));
  f.search.preferredMaxDepthM = 3.5;
  assert.equal(searchRegion(f.pack, f.vessel, f.search, options).depthFallbackPercent, 30);
  f.vessel.anchor.usableLengthM = 30;
  const blocked = searchRegion(f.pack, f.vessel, f.search, options);
  assert.equal(blocked.depthFallbackPercent, 0);
  assert.ok(blocked.assessments.every((a) => a.status !== 'passes'));
});

test('candidate ids are stable and footprint assessment precedes clustering', () => {
  const f = fixture();
  const first = generateCandidates(f.pack, f.search, { maxGeneratedCandidates: 20 });
  const second = generateCandidates(
    f.pack,
    { ...f.search, origin: [-81.10201, 24.70901] },
    { maxGeneratedCandidates: 30 },
  );
  assert.ok(first.candidates.every((a) => second.candidates.some((b) => a.id === b.id)));
  const results = searchRegion(f.pack, f.vessel, f.search, {
    maxGeneratedCandidates: 30,
    clusterDistanceM: 350,
  });
  assert.ok(
    results.assessments
      .filter((a) => a.candidate.kind === 'generated')
      .every((a) => a.status === 'passes'),
  );
});

test('server/mobile replay of identical JSON inputs returns byte-identical results', () => {
  const f = fixture(),
    options = { maxGeneratedCandidates: 15 };
  const first = searchRegion(f.pack, f.vessel, f.search, options);
  const replay = JSON.parse(JSON.stringify(f)) as typeof f;
  assert.equal(
    JSON.stringify(first),
    JSON.stringify(searchRegion(replay.pack, replay.vessel, replay.search, options)),
  );
});

test('sorting preserves suitability and puts unknown price last within each safety outcome', () => {
  const f = fixture();
  const results = searchRegion(f.pack, f.vessel, f.search, { maxGeneratedCandidates: 10 });
  const sorted = sortAssessments(results.assessments, 'price');
  const passing = sorted.filter((a) => a.status === 'passes');
  assert.equal(passing[0]!.cost.status, 'free');
  const unknownIndex = passing.findIndex((a) => a.cost.status === 'unknown');
  assert.ok(unknownIndex >= 0);
  assert.ok(passing.slice(unknownIndex).every((a) => a.cost.total === null));
  const filtered = searchRegion(f.pack, f.vessel, f.search, {
    maxGeneratedCandidates: 5,
    filters: { fee: ['paid'], kinds: ['marina'] },
  });
  assert.equal(filtered.assessments.length, 1);
});

test('invalid numeric inputs, malformed topology and unordered intervals reject instead of producing a pass', () => {
  const f = fixture();
  assert.ok(validateVessel({ ...f.vessel, loadedDraftM: NaN }).length);
  assert.ok(validateSearch({ ...f.search, departure: 'invalid' }).length);
  assert.ok(validateSearch({ ...f.search, maxDistanceNm: Infinity }).length);
  f.pack.depths[0]!.geometry = {
    type: 'Polygon',
    coordinates: [
      [
        [-81.11, 24.7],
        [-81.1, 24.72],
        [-81.11, 24.72],
        [-81.1, 24.7],
        [-81.11, 24.7],
      ],
    ],
  };
  assert.ok(validateRegionPack(f.pack).some((e) => e.includes('topology')));
  assert.throws(() => result(f));
  const g = fixture();
  g.pack.weather[0]!.validUntil = g.pack.weather[0]!.validFrom;
  assert.ok(validateRegionPack(g.pack).length);
});

test('unknown prices stay unknown, and confirmed free is separate', () => {
  const f = fixture();
  assert.equal(estimateCost(f.pack.places[0]!, f.vessel, f.search).total, 0);
  assert.equal(
    estimateCost(
      f.pack.places.find((p) => p.kind === 'dock')!,
      f.vessel,
      f.search,
    ).total,
    null,
  );
  const paid = f.pack.places.find((p) => p.kind === 'marina')!;
  paid.tariff!.validUntil = f.search.arrival;
  assert.equal(estimateCost(paid, f.vessel, f.search).status, 'unknown');
});

test('seasonal tariffs itemize length, multihull, beam, minimums, required extras and taxes', () => {
  const f = fixture(),
    place = f.pack.places.find((p) => p.kind === 'marina')!;
  f.vessel.lengthM = 9.144;
  f.vessel.beamM = 7;
  f.vessel.type = 'catamaran';
  f.search.arrival = '2026-10-30T18:00:00Z';
  f.search.departure = '2026-11-01T16:00:00Z';
  place.tariff = {
    currency: 'USD',
    timezone: 'America/New_York',
    sourceIds: ['demo-fixture'],
    verifiedAt: NOW,
    validUntil: '2026-12-01T00:00:00Z',
    taxRate: 0.1,
    bands: [
      {
        id: 'a',
        label: 'Season A',
        validFrom: '2026-10-01',
        validUntil: '2026-10-30',
        basis: 'per_foot',
        rate: 2,
        period: 'night',
      },
      {
        id: 'b',
        label: 'Season B',
        validFrom: '2026-10-31',
        validUntil: '2026-11-30',
        basis: 'per_foot',
        rate: 3,
        period: 'night',
      },
    ],
    multihullMultiplier: 1.5,
    beamSurcharge: { aboveM: 6, multiplier: 1.2 },
    extras: [
      { label: 'Required fee', amount: 5, per: 'night', required: true, taxable: true },
      { label: 'Power', amount: 20, per: 'night', required: false, taxable: true },
    ],
  };
  const estimate = estimateCost(place, f.vessel, f.search);
  assert.equal(estimate.total, 308);
  assert.equal(estimate.items[0]!.amount, 60);
  assert.equal(estimate.items[1]!.amount, 90);
  assert.ok(estimate.notes.some((note) => note.includes('Power')));
  place.tariff.minimumStayCharge = 300;
  assert.equal(estimateCost(place, f.vessel, f.search).total, 341);
});

test('overlapping seasonal tariff bands are not arbitrarily selected', () => {
  const f = fixture(),
    place = f.pack.places.find((p) => p.kind === 'marina')!;
  place.tariff!.bands.push({ ...place.tariff!.bands[0]!, id: 'conflict', rate: 10 });
  assert.equal(estimateCost(place, f.vessel, f.search).status, 'unknown');
});

test('documented site permission cannot be carried to a moved or forged selected pin', () => {
  const f = fixture(),
    candidate = anchor(f.pack);
  assert.throws(
    () => assessCandidate({ ...candidate, position: [-81.12, 24.71] }, f.vessel, f.search, f.pack),
    /must match/,
  );
  const copy = { ...candidate, place: { ...candidate.place!, overnightAllowed: false } };
  assert.equal(assessCandidate(copy, f.vessel, f.search, f.pack).status, 'passes');
  f.pack.holdingAreas = [];
  assert.ok(
    codes(assessCandidate({ ...copy, kind: 'generated' }, f.vessel, f.search, f.pack)).includes(
      'holding_unknown',
    ),
  );
});

test('calendar-day billing counts departure date, while midnight departure does not add a date', () => {
  const f = fixture(),
    place = f.pack.places.find((p) => p.kind === 'marina')!;
  place.tariff!.bands = [
    { ...place.tariff!.bands[0]!, basis: 'flat', rate: 10, minCharge: 0, period: 'day' },
  ];
  place.tariff!.taxRate = 0;
  place.tariff!.extras = [];
  f.search.arrival = '2026-10-30T18:00:00Z';
  f.search.departure = '2026-10-31T18:00:00Z';
  assert.equal(estimateCost(place, f.vessel, f.search).total, 20);
  f.search.departure = '2026-10-31T04:00:00Z';
  assert.equal(estimateCost(place, f.vessel, f.search).total, 10);
});

test('empty or invented matching datums cannot establish a known vertical reference', () => {
  for (const datum of ['', 'UNKNOWN', 'made-up-datum']) {
    const f = fixture();
    f.pack.depths.forEach((depth) => {
      depth.verticalDatum = datum;
    });
    f.pack.tides.forEach((tide) => {
      tide.verticalDatum = datum;
    });
    assert.ok(validateRegionPack(f.pack).length);
    assert.throws(() => result(f));
  }
});

test('dock vessel footprint includes beam, including wide multihull corners', () => {
  const f = fixture(),
    place = f.pack.places.find((p) => p.kind === 'marina')!;
  f.vessel.lengthM = 20;
  f.vessel.beamM = 19;
  f.search.safetyMarginM = 0;
  place.maxLengthM = 30;
  place.maxBeamM = 20;
  const p = destination(place.position, 45, 13);
  f.pack.hazards.push({
    id: 'corner-rock',
    name: 'Rock at vessel corner',
    kind: 'obstruction',
    geometry: rectangle(p[0], p[1], p[0] + 0.000005, p[1] + 0.000005),
    sourceIds: ['demo-fixture'],
  });
  const assessment = assessCandidate(
    { id: place.id, name: place.name, kind: place.kind, position: place.position },
    f.vessel,
    f.search,
    f.pack,
  );
  assert.ok(assessment.swingRadiusM! > 13);
  assert.ok(codes(assessment).includes('hazard_obstruction'));
});

test('string booleans and invalid vessel-type rules are rejected at the JSON boundary', () => {
  for (const field of ['vesselLimitsVerified', 'operationalRestrictionsVerified']) {
    const f = fixture(),
      place = f.pack.places.find((p) => p.kind === 'marina')!;
    (place as unknown as Record<string, unknown>)[field] = 'false';
    assert.ok(validateRegionPack(f.pack).some((error) => error.includes('boolean')));
  }
  const f = fixture();
  (f.pack.places[0] as unknown as Record<string, unknown>).allowedVesselTypes = 'sailboat';
  assert.ok(validateRegionPack(f.pack).some((error) => error.includes('vessel types')));
});

test('documented anchorage requires equipment-compatible holding evidence too', () => {
  const f = fixture();
  f.vessel.anchor.type = 'mushroom';
  assert.equal(result(f).status, 'insufficient_evidence');
  assert.ok(codes(result(f)).includes('holding_unknown'));
});

test('unrelated grid or tide station does not certify conditions at this candidate', () => {
  for (const kind of ['weather', 'tides'] as const) {
    const f = fixture();
    f.pack.coverage.push({
      ...f.pack.coverage.find((c) => c.layer === kind)!,
      id: 'other-location',
      geometry: rectangle(-81.08, 24.69, -81.077, 24.694),
    });
    if (kind === 'weather')
      f.pack.weather.forEach((frame) => {
        frame.coverageAreaIds = ['other-location', 'demo-currents'];
      });
    else
      f.pack.tides.forEach((frame) => {
        frame.coverageAreaIds = ['other-location'];
      });
    assert.equal(result(f).status, 'insufficient_evidence');
    assert.ok(codes(result(f)).includes(kind === 'weather' ? 'forecast_gap' : 'tide_gap'));
  }
});

test('spatial conditions must cover the complete swing circle, not only the anchor point', () => {
  const f = fixture(),
    p = anchor(f.pack).position;
  f.pack.coverage.push({
    ...f.pack.coverage.find((c) => c.layer === 'tides')!,
    id: 'tiny-tide-area',
    geometry: rectangle(p[0] - 0.0001, p[1] - 0.0001, p[0] + 0.0001, p[1] + 0.0001),
  });
  f.pack.tides.forEach((frame) => {
    frame.coverageAreaIds = ['tiny-tide-area'];
  });
  assert.equal(result(f).status, 'insufficient_evidence');
  assert.ok(codes(result(f)).includes('tide_spatial_coverage'));
});

test('published access windows must continuously cover the departure contingency', () => {
  const f = fixture(),
    place = f.pack.places.find((p) => p.kind === 'marina')!;
  const departure = Date.parse(f.search.departure);
  place.accessWindows = [
    { from: f.search.arrival, until: f.search.departure },
    {
      from: new Date(departure + 3 * 3_600_000).toISOString(),
      until: new Date(departure + 4 * 3_600_000).toISOString(),
    },
  ];
  const assessment = assessCandidate(
    { id: place.id, name: place.name, kind: place.kind, position: place.position },
    f.vessel,
    f.search,
    f.pack,
  );
  assert.ok(codes(assessment).includes('access_window'));
});

test('a verified flag cannot substitute for missing published berth or mooring capacity', () => {
  const f = fixture();
  for (const place of f.pack.places.filter((p) => p.kind === 'mooring' || p.kind === 'marina')) {
    delete place.maxLengthM;
    const assessment = assessCandidate(
      { id: place.id, name: place.name, kind: place.kind, position: place.position },
      f.vessel,
      f.search,
      f.pack,
    );
    assert.ok(codes(assessment).includes('site_capacity_unknown'));
  }
});

test('timestamps require explicit offsets to make replay independent of device timezone', () => {
  const f = fixture();
  assert.ok(validateSearch({ ...f.search, arrival: '2026-10-30T13:00:00' }).length);
  assert.ok(validateSearch({ ...f.search, arrival: '2026-02-31T13:00:00Z' }).length);
  assert.equal(validateSearch({ ...f.search, arrival: '2026-10-30T15:00:00+02:00' }).length, 0);
});

test('legacy and explicit historical replay retain deterministic results without claiming current freshness', () => {
  const f = fixture();
  const legacy = result(f);
  assert.equal(legacy.context, null);
  assert.equal(legacy.status, 'passes');
  assert.ok(codes(legacy).includes('historical_assessment'));
  const context = { assessedAt: '2026-11-10T12:00:00Z', purpose: 'historical' as const };
  const replay = assessCandidate(anchor(f.pack), f.vessel, f.search, f.pack, context);
  assert.equal(replay.status, 'passes');
  assert.deepEqual(replay.context, context);
  assert.ok(!codes(replay).includes('elapsed_stay'));
});

test('current assessment accepts an active stay but downgrades at departure contingency expiry', () => {
  const f = fixture();
  const active = assessCandidate(anchor(f.pack), f.vessel, f.search, f.pack, {
    assessedAt: '2026-10-31T00:00:00Z',
    purpose: 'current',
  });
  assert.equal(active.status, 'passes');
  assert.ok(!codes(active).includes('historical_assessment'));
  const elapsed = assessCandidate(anchor(f.pack), f.vessel, f.search, f.pack, {
    assessedAt: '2026-10-31T10:00:00Z',
    purpose: 'current',
  });
  assert.equal(elapsed.status, 'insufficient_evidence');
  assert.ok(codes(elapsed).includes('elapsed_stay'));
  assert.ok(!codes(elapsed).includes('currently_expired_pack'));
});

test('current assessment catches currently expired/future evidence while retaining hard exclusions', () => {
  const f = fixture(),
    current = { assessedAt: '2026-11-03T12:00:00Z', purpose: 'current' as const };
  const assessment = assessCandidate(anchor(f.pack), f.vessel, f.search, f.pack, current);
  assert.equal(assessment.status, 'insufficient_evidence');
  assert.ok(codes(assessment).includes('currently_expired_pack'));
  assert.ok(codes(assessment).includes('currently_invalid_source'));
  const place = f.pack.places.find((p) => p.id === 'demo-shallow')!;
  const excluded = assessCandidate(
    { id: place.id, name: place.name, kind: place.kind, position: place.position },
    f.vessel,
    f.search,
    f.pack,
    current,
  );
  assert.equal(excluded.status, 'excluded');
  assert.ok(codes(excluded).includes('elapsed_stay'));
  const future = assessCandidate(anchor(f.pack), f.vessel, f.search, f.pack, {
    assessedAt: '2026-10-30T11:59:00Z',
    purpose: 'current',
  });
  assert.ok(codes(future).includes('currently_future_pack'));
  assert.equal(future.status, 'insufficient_evidence');
});

test('region search propagates the explicit clock into every result and preserves deterministic replay', () => {
  const f = fixture(),
    context = { assessedAt: '2026-11-03T12:00:00Z', purpose: 'current' as const };
  const options = { maxGeneratedCandidates: 5 };
  const first = searchRegion(f.pack, f.vessel, f.search, options, context);
  assert.deepEqual(first.context, context);
  assert.ok(first.assessments.length > 0);
  assert.ok(
    first.assessments.every(
      (a) => a.status !== 'passes' && a.context?.assessedAt === context.assessedAt,
    ),
  );
  assert.equal(
    JSON.stringify(first),
    JSON.stringify(searchRegion(f.pack, f.vessel, f.search, options, structuredClone(context))),
  );
  assert.throws(
    () =>
      searchRegion(f.pack, f.vessel, f.search, options, {
        assessedAt: '2026-11-03T12:00:00',
        purpose: 'current',
      }),
    /Assessment context/,
  );
});

test('selected depth alternatives retain their explicit allowance during direct reassessment', () => {
  for (const [preferredDepth, allowance] of [
    [4, 20],
    [3.5, 30],
  ] as const) {
    const f = fixture();
    f.pack.places = [f.pack.places[0]!];
    f.search.preferredMaxDepthM = preferredDepth;
    const context = { assessedAt: NOW, purpose: 'current' as const };
    const results = searchRegion(
      f.pack,
      f.vessel,
      f.search,
      { maxGeneratedCandidates: 5 },
      context,
    );
    assert.equal(results.depthFallbackPercent, allowance);
    const selected = results.assessments.find((assessment) => assessment.status === 'passes')!;
    const replay = assessCandidate(
      selected.candidate,
      f.vessel,
      f.search,
      f.pack,
      context,
      selected.depthAllowancePercent,
    );
    assert.deepEqual(replay, selected);
    assert.equal(replay.depthAllowancePercent, allowance);
    assert.ok(codes(replay).includes('depth_alternative'));
    assert.ok(
      codes(assessCandidate(selected.candidate, f.vessel, f.search, f.pack, context)).includes(
        'preferred_depth',
      ),
    );
    f.vessel.anchor.usableLengthM = 20;
    const limited = assessCandidate(
      selected.candidate,
      f.vessel,
      f.search,
      f.pack,
      context,
      allowance,
    );
    assert.equal(limited.status, 'excluded');
    assert.ok(codes(limited).includes('insufficient_rode'));
  }
});

test('direct candidate assessment rejects unrecognised depth allowances', () => {
  const f = fixture();
  for (const value of [10, 21, 40, NaN, '20', null]) {
    assert.throws(
      () => assessCandidate(anchor(f.pack), f.vessel, f.search, f.pack, undefined, value as 0),
      /Depth allowance/,
    );
  }
});

test('seabed preference filters anchored results but leaves marina and mooring checks intact', () => {
  const f = fixture();
  assert.equal(f.search.preferredBedding, 'sand');
  f.pack.holdingAreas![0]!.holding = 'mud';
  f.pack.places[0]!.holding = 'mud';
  assert.equal(result(f).bedding, 'mud');
  assert.ok(codes(result(f)).includes('bedding_preference'));
  const search = searchRegion(f.pack, f.vessel, f.search, { maxGeneratedCandidates: 20 });
  assert.ok(
    search.assessments.every((a) => !['anchorage', 'generated'].includes(a.candidate.kind)),
  );
  const marina = f.pack.places.find((place) => place.kind === 'marina')!;
  const marinaCandidate = {
    id: marina.id,
    name: marina.name,
    kind: marina.kind,
    position: marina.position,
    place: marina,
  };
  assert.equal(assessCandidate(marinaCandidate, f.vessel, f.search, f.pack).status, 'passes');
  f.search.preferredBedding = 'any';
  assert.equal(result(f).status, 'passes');
  assert.equal(result(f).bedding, 'mud');
});

test('unknown seabed never satisfies a sand preference or establishes suitable holding', () => {
  const f = fixture();
  f.pack.holdingAreas = [];
  assert.equal(result(f).bedding, 'unknown');
  assert.equal(result(f).status, 'insufficient_evidence');
  assert.ok(codes(result(f)).includes('bedding_unknown'));
  assert.ok(
    !searchRegion(f.pack, f.vessel, f.search, { maxGeneratedCandidates: 10 }).assessments.some(
      (a) => a.candidate.kind === 'anchorage',
    ),
  );
  f.search.preferredBedding = 'unknown';
  assert.equal(result(f).status, 'insufficient_evidence');
  assert.ok(
    searchRegion(f.pack, f.vessel, f.search, { maxGeneratedCandidates: 10 }).assessments.some(
      (a) => a.candidate.kind === 'anchorage' && a.status === 'insufficient_evidence',
    ),
  );
});

test('matching rock preference cannot relax holding, habitat or equipment exclusions', () => {
  const f = fixture();
  f.search.preferredBedding = 'rock';
  f.pack.holdingAreas![0]!.holding = 'rock';
  f.pack.places[0]!.holding = 'rock';
  assert.equal(result(f).bedding, 'rock');
  assert.equal(result(f).status, 'insufficient_evidence');
  assert.ok(codes(result(f)).includes('holding_unknown'));
  f.vessel.anchor.usableLengthM = 10;
  assert.equal(result(f).status, 'excluded');
});

test('conflicting reviewed seabed areas remain unknown instead of selecting the preferred type', () => {
  const f = fixture();
  f.pack.holdingAreas!.push({ ...f.pack.holdingAreas![0]!, id: 'overlapping-mud', holding: 'mud' });
  assert.equal(result(f).bedding, 'unknown');
  assert.equal(result(f).status, 'insufficient_evidence');
});

test('seabed preferences and navigation mark provenance are validated', () => {
  const f = fixture();
  assert.deepEqual(validateRegionPack(f.pack), []);
  assert.ok(validateSearch({ ...f.search, preferredBedding: 'weed' }).length > 0);
  f.pack.marks![0]!.sourceIds = ['missing-source'];
  assert.ok(validateRegionPack(f.pack).includes('Invalid navigation mark or missing provenance.'));
  f.pack.marks![0]!.sourceIds = ['demo-fixture'];
  f.pack.marks!.push({ ...f.pack.marks![0]! });
  assert.ok(validateRegionPack(f.pack).includes('Duplicate marks identifiers.'));
});
