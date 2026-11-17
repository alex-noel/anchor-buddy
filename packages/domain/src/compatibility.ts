import type { VesselProfile } from './types.ts';
import { validateVessel } from './validation.ts';

/** Frozen Q24/SAFE-02 projection; missing identifiers remain unknown, not inferred. */
export function canonicalVesselCompatibility(vessel: VesselProfile): string {
  const errors = validateVessel(vessel);
  if (errors.length) throw new Error('Cannot fingerprint invalid vessel: ' + errors[0]);
  return JSON.stringify({
    airDraftM: vessel.airDraftM ?? null,
    anchorManufacturer: null,
    anchorModel: null,
    anchorType: vessel.anchor.type,
    beamM: vessel.beamM,
    bowRollerHeightM: vessel.anchor.bowRollerHeightM,
    displacementKg: vessel.displacementKg,
    lengthM: vessel.lengthM,
    loadedDraftM: vessel.loadedDraftM,
    rodeConfigurationId: null,
    rodeType: vessel.anchor.rodeType,
    usableLengthM: vessel.anchor.usableLengthM,
    vesselType: vessel.type,
  });
}
export async function vesselCompatibilityFingerprint(
  vessel: VesselProfile,
  sha256: (bytes: Uint8Array) => Promise<string>,
): Promise<string> {
  const digest = await sha256(new TextEncoder().encode(canonicalVesselCompatibility(vessel)));
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid SHA-256 fingerprint result.');
  return digest;
}
