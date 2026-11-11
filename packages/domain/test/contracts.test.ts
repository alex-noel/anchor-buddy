/** TEST ONLY: analytical examples and invented review identities, never runtime exports. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  checkSchemaVersion,
  commitMigratedRecord,
  readLocalRecord,
  validateEvidenceEnvelope,
  validateHazardPrimitive,
  validateSnapshotIdentity,
  validateAnalyticalCoverage,
  CANONICAL_CONVERSIONS,
  unitConversionTolerance,
  type EvidenceEnvelope,
  type SnapshotIdentity,
  type LocalRecord,
} from '../src/contracts.ts';
import {
  validGeometry,
  validateLiveRegionPack,
  validateRegionPack,
  validateSearch,
} from '../src/validation.ts';
import { createDemoPack, createDefaultSearch, DEFAULT_VESSEL } from '../src/testing.ts';
import { assessCandidate } from '../src/engine.ts';
import { getPreferredBeddings } from '../src/seabed.ts';
import { readSavedSearches } from '../../../apps/mobile/src/lib/workspace.ts';
import { parseUnitDraft } from '../../../apps/mobile/src/lib/formDrafts.ts';
const now = '2026-11-11T00:00:00Z';
const until = '2026-11-15T00:00:00Z';
const unknownRight = () => ({
  status: 'unknown' as const,
  policyUrl: null,
  verifiedAt: null,
  entitlementId: null,
});
const envelope = (): EvidenceEnvelope => ({
  schemaVersion: 2,
  role: 'analytical-coverage',
  sourceIds: ['test-source'],
  sourceTime: { kind: 'survey', at: '2026-01-01T00:00:00Z' },
  retrievedAt: now,
  refreshEligibleAt: null,
  usableUntil: until,
  forecastInterval: null,
  original: { units: 'm', verticalDatum: 'MLLW' },
  rights: {
    onlineDisplay: unknownRight(),
    offlineStorage: unknownRight(),
    analysis: {
      status: 'permitted',
      policyUrl: 'https://example.test/policy',
      verifiedAt: now,
      entitlementId: null,
    },
  },
  review: { status: 'reviewed', attestationIds: ['test-review'] },
});
const digest = (v: string) => createHash('sha256').update(v).digest('hex');
const snapshot = (): SnapshotIdentity => ({
  schemaVersion: 2,
  id: 'test-snapshot',
  version: '1',
  components: [
    {
      id: 'test-static',
      version: '1',
      kind: 'static-analysis',
      sha256: digest('original bytes'),
      bytes: 14,
      sourceIds: ['test-source'],
      evidence: envelope(),
    },
  ],
  reviews: [
    {
      id: 'test-review',
      reviewerId: 'test-only-reviewer',
      reviewedAt: now,
      validUntil: until,
      scope: ['coverage'],
      changePolicy: 'exact-components',
      components: [{ id: 'test-static', version: '1', sha256: digest('original bytes') }],
    },
  ],
});
const hashes = { 'test-static': digest('original bytes') };

test('F02-T02: future schemas and v2 packs cannot replace an active legacy pack', () => {
  const active = createDemoPack(now);
  let selected = active;
  const incoming = { ...active, schemaVersion: 99 };
  const result = checkSchemaVersion(incoming, true);
  assert.equal(result.status, 'unsupported-version');
  assert.match(validateRegionPack(incoming).join(' '), /Unsupported schema/);
  if (!validateRegionPack(incoming).length) selected = incoming as typeof active;
  assert.equal(selected, active);
  assert.match(
    validateRegionPack({ ...active, schemaVersion: 2 }).join(' '),
    /UNSUPPORTED_V2_ACTIVATION/,
  );
  assert.deepEqual(checkSchemaVersion(active, true), { status: 'supported', value: 1 });
});

test('F02-T03: point forecasts and scientific samples cannot establish analytical coverage', () => {
  const s = snapshot();
  const geometry = createDemoPack(now).coverage[0]!.geometry;
  const coverage = {
    schemaVersion: 2,
    role: 'analytical-coverage',
    layer: 'bathymetry',
    geometry,
    sourceIds: ['test-source'],
    componentId: 'test-static',
    reviewId: 'test-review',
    validFrom: now,
    validUntil: until,
    complete: true,
  };
  assert.deepEqual(validateAnalyticalCoverage(coverage, s, hashes, now, validGeometry), []);
  for (const role of ['point-forecast', 'scientific-context', 'chart-display'] as const) {
    const point = structuredClone(s);
    point.components[0]!.evidence.role = role;
    assert.ok(validateAnalyticalCoverage(coverage, point, hashes, now, validGeometry).length);
    assert.ok(
      validateAnalyticalCoverage(
        { ...coverage, geometry: { type: 'Point', coordinates: [0, 0] } },
        s,
        hashes,
        now,
        validGeometry,
      ).length,
    );
  }
  assert.ok(validateEvidenceEnvelope({ ...envelope(), sourceIds: [] }).length);
  const e = envelope();
  e.rights.analysis.policyUrl = null;
  assert.ok(validateEvidenceEnvelope(e).length);
});

test('F02-T04: exact hash and scope binding never self-approves recomposition', () => {
  const s = snapshot();
  assert.deepEqual(validateSnapshotIdentity(s, hashes, now), []);
  assert.match(
    validateSnapshotIdentity(s, { 'test-static': digest('changed bytes') }, now).join(' '),
    /integrity mismatch/,
  );
  s.components[0]!.sha256 = digest('changed bytes');
  assert.match(
    validateSnapshotIdentity(s, { 'test-static': digest('changed bytes') }, now).join(' '),
    /bind/,
  );
  const expired = snapshot();
  expired.reviews[0]!.validUntil = now;
  assert.ok(validateSnapshotIdentity(expired, hashes, now).length);
  const future = snapshot();
  future.reviews[0]!.reviewedAt = '2026-11-12T00:00:00Z';
  assert.ok(validateSnapshotIdentity(future, hashes, now).length);
});

test('F02-T05: monorepo saved-search migration failure retains source and hides unproven results', async () => {
  const search = createDefaultSearch(now);
  delete search.preferredBeddings;
  const original = [
    {
      id: 'test-search',
      name: 'Test',
      savedAt: now,
      packId: 'test-pack',
      packVersion: '1',
      vesselName: 'Test vessel',
      search,
      filters: {
        kind: 'all',
        fee: 'all',
        assessment: 'all',
        compatibleOnly: false,
        sort: 'distance',
      },
      results: [
        {
          id: 'old-result',
          name: 'Old',
          status: 'passes',
          depthM: 5,
          total: 1.005,
          currency: 'EUR',
        },
      ],
      selectedPosition: search.origin,
    },
  ];
  const before = JSON.stringify(original);
  const migrated = readSavedSearches(original)[0]!;
  migrated.search = {
    ...migrated.search,
    preferredBeddings: getPreferredBeddings(migrated.search),
  };
  const next: LocalRecord<typeof migrated> = {
    schemaVersion: 2,
    kind: 'saved-search',
    id: migrated.id,
    revision: '1',
    savedAt: now,
    payload: migrated,
  };
  let active = original;
  const result = await commitMigratedRecord(
    original,
    next,
    (v) => validateSearch((v as typeof migrated).search),
    async () => {
      throw new Error('test quota failure');
    },
  );
  assert.equal(result.status, 'commit-failed');
  assert.equal(result.original, active);
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(migrated.results, []);
  assert.equal(migrated.requiresReassessment, true);
  assert.deepEqual(migrated.search.preferredBeddings, ['sand']);
  assert.deepEqual(migrated.selectedPosition, original[0]!.selectedPosition);
  assert.equal(migrated.savedAt, original[0]!.savedAt);
  assert.equal(original[0]!.results[0]!.total, 1.005);
  assert.equal(
    readLocalRecord({ ...next, schemaVersion: 99 }, 'saved-search', () => []).status,
    'unsupported-version',
  );
  let writes = 0;
  const invalid = await commitMigratedRecord(
    original,
    next,
    () => ['missing provenance'],
    async () => {
      writes++;
    },
  );
  assert.equal(invalid.status, 'invalid');
  assert.equal(writes, 0);
});

test('F02-T06: live boundary still rejects synthetic and unclassified sources', () => {
  const pack = createDemoPack(now);
  assert.match(validateLiveRegionPack(pack).join(' '), /Synthetic|synthetic/);
  delete pack.sources[0]!.synthetic;
  assert.match(validateLiveRegionPack(pack).join(' '), /explicitly declare synthetic: false/);
});

test('F02-T07: engine expands nominal tide bounds exactly once for clearance and rode', () => {
  const pack = createDemoPack(now);
  pack.depths.forEach((d) => {
    d.minDepthM = 5;
    d.maxDepthM = 7;
  });
  pack.tides.forEach((t) => {
    t.minWaterLevelM = 0.6;
    t.maxWaterLevelM = 1.2;
    t.uncertaintyM = 0.1;
  });
  const vessel = structuredClone(DEFAULT_VESSEL);
  vessel.loadedDraftM = 1.5;
  vessel.anchor.bowRollerHeightM = 1;
  vessel.anchor.usableLengthM = 70;
  const search = createDefaultSearch(now);
  const result = assessCandidate(
    { id: 'test-tide', name: 'Test', position: search.origin, kind: 'generated' },
    vessel,
    search,
    pack,
  );
  assert.equal(result.minDepthM, 5.5);
  assert.equal(result.maxDepthM, 8.3);
  assert.equal(result.minDepthM! - vessel.loadedDraftM, 4);
  assert.equal(result.requiredRodeM, 66);
});

test('F02-T08: monorepo UI unit drafts preserve exact canonical values', () => {
  for (const reference of [0, 1.234567890123, 1000.00000000001]) {
    const ratio = 1 / CANONICAL_CONVERSIONS.metresPerFoot;
    const display = String(Number((reference * ratio).toFixed(2)));
    assert.equal(parseUnitDraft(display, reference, ratio), reference);
    const expected = 10.01 * 0.3048;
    assert.ok(
      Math.abs(parseUnitDraft('10.01', reference, ratio) - expected) <=
        unitConversionTolerance(expected),
    );
  }
});

test('primitive exchange preserves unknowns but legacy engine activation rejects even fully sourced primitives', () => {
  const primitive = {
    id: 'point',
    name: 'Test obstruction',
    kind: 'obstruction',
    objectClass: 'OBSTRN',
    geometry: { type: 'Point', coordinates: [0, 0] },
    sourceIds: ['test-source'],
    extentM: null,
    positionalUncertaintyM: null,
    extentSource: null,
    uncertaintySource: null,
  };
  assert.deepEqual(validateHazardPrimitive(primitive, validGeometry), []);
  assert.ok(validateHazardPrimitive({ ...primitive, extentM: 0 }, validGeometry).length);
  assert.ok(
    validateHazardPrimitive({ ...primitive, positionalUncertaintyM: -1 }, validGeometry).length,
  );
  assert.deepEqual(
    validateHazardPrimitive(
      {
        ...primitive,
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [0, 0],
          ],
        },
      },
      validGeometry,
    ),
    [],
  );
  const pack = createDemoPack(now);
  const input = { ...pack, hazardPrimitives: [primitive] };
  assert.match(validateRegionPack(input).join(' '), /UNSUPPORTED_HAZARD_PRIMITIVES/);
  assert.throws(
    () =>
      assessCandidate(
        { id: 'test', name: 'Test', kind: 'generated', position: [0, 0] },
        DEFAULT_VESSEL,
        createDefaultSearch(now),
        input as typeof pack,
      ),
    /UNSUPPORTED_HAZARD_PRIMITIVES/,
  );
});

test('public contract readers reject malformed nested input without throwing', async () => {
  for (const input of [
    null,
    [],
    4,
    {},
    { schemaVersion: 2 },
    { schemaVersion: 99 },
    { components: null, reviews: [] },
    { schemaVersion: 2, id: 'bad', version: '1', components: [null], reviews: [null] },
  ]) {
    assert.ok(validateSnapshotIdentity(input, {}, now).length);
    assert.ok(validateAnalyticalCoverage({}, input, {}, now, validGeometry).length);
    assert.ok(validateEvidenceEnvelope(input).length);
    assert.ok(validateHazardPrimitive(input, validGeometry).length);
    assert.notEqual(readLocalRecord(input, 'settings', () => []).status, 'supported');
  }
  const inherited = Object.create(hashes) as Record<string, string>;
  assert.match(validateSnapshotIdentity(snapshot(), inherited, now).join(' '), /integrity/);
  const geometry = createDemoPack(now).coverage[0]!.geometry;
  const coverage = {
    schemaVersion: 2,
    role: 'analytical-coverage',
    layer: 'bathymetry',
    geometry,
    sourceIds: ['test-source'],
    componentId: 'test-static',
    reviewId: 'test-review',
    validFrom: now,
    validUntil: until,
    complete: true,
  };
  for (const mutation of [
    (s: SnapshotIdentity) => {
      s.components[0]!.evidence.usableUntil = null;
    },
    (s: SnapshotIdentity) => {
      s.components[0]!.evidence.usableUntil = now;
    },
    (s: SnapshotIdentity) => {
      s.components[0]!.evidence.review = { status: 'unreviewed', attestationIds: [] };
    },
    (s: SnapshotIdentity) => {
      s.reviews[0]!.scope = ['geometry'];
    },
    (s: SnapshotIdentity) => {
      s.reviews[0]!.validUntil = '2026-11-12T00:00:00Z';
    },
    (s: SnapshotIdentity) => {
      s.components[0]!.kind = 'weather-current';
    },
    (s: SnapshotIdentity) => {
      s.components[0]!.evidence.forecastInterval = { from: now, until: '2026-11-12T00:00:00Z' };
    },
  ]) {
    const s = snapshot();
    mutation(s);
    assert.ok(validateAnalyticalCoverage(coverage, s, hashes, now, validGeometry).length);
  }
});

test('migration and geometry callback failures reject without losing original or committing', async () => {
  const original = { recovery: 'test-only-original' };
  let commits = 0;
  for (const next of [null, 3, 'bad', [], { schemaVersion: 2, kind: 'wrong' }]) {
    const result = await commitMigratedRecord(
      original,
      next as never,
      () => [],
      async () => {
        commits++;
      },
    );
    assert.notEqual(result.status, 'committed');
    assert.equal(result.original, original);
  }
  const next: LocalRecord<unknown> = {
    schemaVersion: 2,
    kind: 'settings',
    id: 'test',
    revision: '1',
    savedAt: now,
    payload: null,
  };
  const result = await commitMigratedRecord(
    original,
    next,
    () => {
      throw new Error('bad nested payload');
    },
    async () => {
      commits++;
    },
  );
  assert.equal(result.status, 'invalid');
  assert.equal(result.original, original);
  assert.equal(commits, 0);
  const s = snapshot();
  assert.ok(
    validateAnalyticalCoverage(
      { schemaVersion: 2, geometry: {}, role: 'analytical-coverage' },
      s,
      hashes,
      now,
      () => {
        throw new Error('geometry failure');
      },
    ).length,
  );
  assert.ok(
    validateHazardPrimitive({ geometry: { type: 'Polygon' } }, () => {
      throw new Error('geometry failure');
    }).length,
  );
  assert.ok(validateSnapshotIdentity(s, null as never, now).length);
});

test('legacy complete coverage cannot ignore new source role, review or freshness metadata', () => {
  for (const role of ['point-forecast', 'scientific-context', 'analytical-coverage'] as const) {
    const pack = createDemoPack(now);
    pack.sources[0]!.evidence = {
      ...envelope(),
      role,
      usableUntil: null,
      review: { status: 'unreviewed', attestationIds: [] },
    };
    assert.match(validateRegionPack(pack).join(' '), /UNSUPPORTED_V2_EVIDENCE_ACTIVATION/);
    assert.throws(
      () =>
        assessCandidate(
          {
            id: 'test-source',
            name: 'Test',
            kind: 'generated',
            position: createDefaultSearch(now).origin,
          },
          DEFAULT_VESSEL,
          createDefaultSearch(now),
          pack,
        ),
      /UNSUPPORTED_V2_EVIDENCE_ACTIVATION/,
    );
  }
});
