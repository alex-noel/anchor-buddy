/** Analytical contract fixtures only; these records never enter runtime data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  commitMigratedRecord,
  validateAnalyticalCoverage,
  validateEvidenceEnvelope,
  validateHazardPrimitive,
  validateSnapshotIdentity,
} from '../src/contracts.ts';
import { validGeometry } from '../src/validation.ts';

const now = '2026-11-11T00:00:00Z';
const until = '2026-11-15T00:00:00Z';
const hash = 'd'.repeat(64);
const right = () => ({
  status: 'permitted',
  policyUrl: 'https://example.test/policy',
  verifiedAt: now,
  entitlementId: null,
});
const envelope = () => ({
  schemaVersion: 2,
  role: 'analytical-coverage',
  sourceIds: ['test-source'],
  sourceTime: { kind: 'survey', at: now },
  retrievedAt: now,
  refreshEligibleAt: null,
  usableUntil: until,
  forecastInterval: null,
  original: { units: 'm', verticalDatum: 'MLLW' },
  rights: { analysis: right(), offlineStorage: right(), onlineDisplay: right() },
  review: { status: 'reviewed', attestationIds: ['test-review'] },
});
const snapshot = () => ({
  schemaVersion: 2,
  id: 'test-snapshot',
  version: '1',
  components: [
    {
      id: 'test-component',
      version: '1',
      kind: 'static-analysis',
      sha256: hash,
      bytes: 1,
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
      components: [{ id: 'test-component', version: '1', sha256: hash }],
    },
  ],
});
const coverage = () => ({
  schemaVersion: 2,
  role: 'analytical-coverage',
  layer: 'bathymetry',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1],
      ],
    ],
  },
  sourceIds: ['test-source'],
  componentId: 'test-component',
  reviewId: 'test-review',
  validFrom: now,
  validUntil: until,
  complete: true,
});
const observed = { 'test-component': hash };

test('evidence enum fields require JSON strings without coercion or coercion exceptions', () => {
  assert.deepEqual(validateEvidenceEnvelope(envelope()), []);
  const variants = [
    { ...envelope(), role: ['point-forecast'] },
    { ...envelope(), role: { toString: null } },
    { ...envelope(), sourceTime: { kind: ['survey'], at: now } },
    { ...envelope(), review: { status: ['reviewed'], attestationIds: ['test-review'] } },
    {
      ...envelope(),
      rights: { ...envelope().rights, analysis: { ...right(), status: ['permitted'] } },
    },
  ];
  for (const value of variants) assert.ok(validateEvidenceEnvelope(value).length > 0);
});

test('component, layer, hazard and migration kinds reject array-valued enums', async () => {
  const value = snapshot();
  assert.deepEqual(validateSnapshotIdentity(value, observed, now), []);
  assert.ok(
    validateSnapshotIdentity(
      { ...value, components: [{ ...value.components[0], kind: ['static-analysis'] }] },
      observed,
      now,
    ).length,
  );
  for (const layer of [['bathymetry'], { toString: null }])
    assert.ok(
      validateAnalyticalCoverage({ ...coverage(), layer }, value, observed, now, validGeometry)
        .length,
    );
  assert.ok(
    validateAnalyticalCoverage(
      { ...coverage(), reviewId: { toString: null } },
      value,
      observed,
      now,
      validGeometry,
    ).length,
  );
  assert.ok(
    validateHazardPrimitive(
      {
        id: 'test-hazard',
        name: 'Test hazard',
        objectClass: 'test',
        kind: ['obstruction'],
        geometry: { type: 'Point', coordinates: [0, 0] },
        sourceIds: ['test-source'],
        extentM: null,
        positionalUncertaintyM: null,
        extentSource: null,
        uncertaintySource: null,
      },
      validGeometry,
    ).length,
  );
  let writes = 0;
  const result = await commitMigratedRecord(
    {},
    {
      schemaVersion: 2,
      kind: ['settings'],
      id: 'test-record',
      revision: '1',
      savedAt: now,
      payload: {},
    } as never,
    () => [],
    async () => {
      writes++;
    },
  );
  assert.equal(result.status, 'invalid');
  assert.equal(writes, 0);
});

test('complete coverage fits within both boundaries of the review interval', () => {
  const value = snapshot();
  assert.deepEqual(validateAnalyticalCoverage(coverage(), value, observed, now, validGeometry), []);
  assert.match(
    validateAnalyticalCoverage(
      { ...coverage(), validFrom: '2026-11-10T23:59:59Z' },
      value,
      observed,
      now,
      validGeometry,
    ).join(' '),
    /review.*interval/,
  );
  value.reviews[0]!.validUntil = '2026-11-14T23:59:59Z';
  assert.match(
    validateAnalyticalCoverage(coverage(), value, observed, now, validGeometry).join(' '),
    /review.*interval/,
  );
});
