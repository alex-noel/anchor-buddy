import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  canonicalVesselCompatibility,
  vesselCompatibilityFingerprint,
} from '../src/compatibility.ts';
import { createVesselDraft } from '../src/defaults.ts';
const sha = async (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const vessel = {
  ...createVesselDraft(),
  id: 'v',
  name: 'Båt',
  lengthM: 10.123456789,
  beamM: 3,
  loadedDraftM: 1.5,
  displacementKg: 4000,
  anchor: {
    ...createVesselDraft().anchor,
    type: 'modern-scoop',
    usableLengthM: 60,
    bowRollerHeightM: 0,
  },
};
test('fingerprint projection has the frozen keys, nulls and canonical values', async () => {
  const json = canonicalVesselCompatibility(vessel);
  const parsed = JSON.parse(json);
  assert.deepEqual(Object.keys(parsed), [
    'airDraftM',
    'anchorManufacturer',
    'anchorModel',
    'anchorType',
    'beamM',
    'bowRollerHeightM',
    'displacementKg',
    'lengthM',
    'loadedDraftM',
    'rodeConfigurationId',
    'rodeType',
    'usableLengthM',
    'vesselType',
  ]);
  assert.equal(parsed.airDraftM, null);
  assert.equal(parsed.anchorManufacturer, null);
  assert.equal(parsed.anchorModel, null);
  assert.equal(parsed.rodeConfigurationId, null);
  assert.equal(parsed.lengthM, 10.123456789);
  assert.equal(parsed.bowRollerHeightM, 0);
  assert.equal(
    await vesselCompatibilityFingerprint(vessel, sha),
    '4699ba24cc7a7aa8dfc84997717d95c378bf3d55678dd7de9112c2667beb165c',
  );
  assert.equal(
    await vesselCompatibilityFingerprint(vessel, sha),
    await sha(new TextEncoder().encode(json)),
  );
  assert.equal(
    await vesselCompatibilityFingerprint({ ...vessel, name: 'Renamed', id: 'other' }, sha),
    await vesselCompatibilityFingerprint(vessel, sha),
  );
  assert.notEqual(
    await vesselCompatibilityFingerprint({ ...vessel, airDraftM: 0 }, sha),
    await vesselCompatibilityFingerprint(vessel, sha),
  );
});
test('every supported compatibility input affects the fingerprint', async () => {
  const original = await vesselCompatibilityFingerprint(vessel, sha);
  for (const candidate of [
    { ...vessel, type: 'powerboat' as const },
    { ...vessel, lengthM: 11 },
    { ...vessel, beamM: 4 },
    { ...vessel, loadedDraftM: 2 },
    { ...vessel, displacementKg: 5000 },
    { ...vessel, anchor: { ...vessel.anchor, type: 'other' } },
    { ...vessel, anchor: { ...vessel.anchor, rodeType: 'rope' as const } },
    { ...vessel, anchor: { ...vessel.anchor, usableLengthM: 61 } },
    { ...vessel, anchor: { ...vessel.anchor, bowRollerHeightM: 1 } },
  ])
    assert.notEqual(await vesselCompatibilityFingerprint(candidate, sha), original);
  await assert.rejects(
    vesselCompatibilityFingerprint({ ...vessel, lengthM: NaN }, sha),
    /invalid vessel/i,
  );
});
