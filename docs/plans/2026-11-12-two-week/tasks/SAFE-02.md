---
id: SAFE-02
title: "Add verifiable equipment guidance selection without invented scope ratios"
priority: P0
estimate_hours: 10
dependencies: [FOUNDATION-02]
lane: safety
expert_review: true
external_gate: "An applicable manufacturer/operating source and qualified review are required to enable a real guidance entry."
---

# SAFE-02 — Add verifiable equipment guidance selection

Implement a usable, evidence-backed way to select anchoring equipment guidance. A design-family dropdown alone must not imply that a universal scope ratio is safe. Keep a boat with unidentified or unsupported equipment usable for discovery while its anchoring assessments remain insufficient.

## Baseline and ownership

Read `packages/domain/src/types.ts` (`VesselProfile`, `ScopeGuidance`), `validation.ts`, `engine.ts`, `defaults.ts`, `apps/mobile/src/components/Forms.tsx`, and `lib/formDrafts.ts`. New profiles already start with `scopeGuidance: null`; editing relevant boat/equipment fields already invalidates attached guidance. Do not undo these fixes.

Own proposed domain `equipmentGuidance.ts`, its tests, a source-record registry format, and a new reusable mobile `EquipmentGuidanceSelect.tsx` component. APP-02 owns the existing profile form/persistence; deliver a typed prop integration contract instead of editing `Forms.tsx` concurrently. Engine validation/lookup edits require the integrator's shared-file lock after SAFE-01. FOUNDATION-02 owns shared types. An empty registry is a valid shipped state when no real entry has been reviewed.

## Instructions

1. Define records using the frozen schema: immutable ID/version, source URL/document revision, verified/reviewed dates, explicit applicability, equipment identifiers, rode configuration, any supported vessel dimensions/displacement/windage restrictions, supported wind/gust/wave/current envelope, scope/rode method and revocation status. Record unknown applicability explicitly.
2. Preserve the original published rule. If it is not expressible by the supported deterministic method, classify it unsupported and explain why. Do not translate prose into a ratio without review or use AI-generated ratings as evidence.
3. Implement a pure matcher from confirmed vessel/equipment + requested conditions + registry + explicit assessment time to eligible entries or structured rejection reasons. Check expiry, source identity, missing required fields and conflicting guidance. No silent 'closest' equipment match.
4. Reference the selected record by version and a canonical compatibility fingerprint. Revalidate on profile edits, time change, registry refresh and withdrawal. Migration of old inline guidance must retain its original evidence but cannot convert unverifiable legacy data into a reviewed registry record.
5. Build a selector showing only known entries and clear unavailable/no-match states. Show the source and applicability before confirmation. Keep manual identification fields separate from rating assertions. Do not expose a 'mark reviewed' toggle to ordinary app users.
6. Feed the selected reviewed method into existing maximum-depth-plus-bow-height rode calculation. Recalculate the entire footprint whenever applicability or deployed rode changes. Insufficient available equipment must exclude a candidate even in +20%/+30% depth alternatives.
7. Preserve discovery, saved searches and independent watch access without a selected guidance record. Explain the missing evidence at the relevant control, not through a fake default or mandatory account.

## Acceptance criteria

- **SAFE-02-AC01:** Selection is tied to a source/version and exact applicable equipment; family-only or nearest-match selection cannot enable a rating.
- **SAFE-02-AC02:** Missing, expired, withdrawn or conflicting guidance produces structured insufficient-evidence reasons.
- **SAFE-02-AC03:** Relevant profile changes invalidate the selection; unrelated display-unit changes do not.
- **SAFE-02-AC04:** A user can inspect source/applicability and confirm an eligible selection, but cannot self-approve a source.
- **SAFE-02-AC05:** Required rode uses upper water-depth bounds and bow height and rejects equipment-limit violations for every alternative.
- **SAFE-02-AC06:** Legacy profiles migrate without inventing reviewed guidance and remain editable/searchable.
- **SAFE-02-AC07:** Empty-registry behavior is fully usable and explained; there is no runtime test/demo entry.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| S02-T01 | Test-only reviewed record exactly matches equipment and conditions; select and assess. | Exact ID/version/fingerprint recorded; published calculation reproduced; AC01,04–05. |
| S02-T02 | Same family but different unverified model or rope/chain configuration. | No eligible match and no inferred ratio; AC01–02. |
| S02-T03 | Change loaded draft/anchor/usable rode after selection; separately switch nautical to metric display. | Relevant edits invalidate; unit-only edit preserves canonical selection; AC03. |
| S02-T04 | Withdraw record or advance explicit clock beyond validity while plan is open. | Reassessment fails guidance check and old safe-looking values do not persist; AC02. |
| S02-T05 | Max water depth 8 m, bow 1 m, test-only ratio 7: required 63 m; boat has 60 m. | Excluded; +20/+30% fallback cannot pass with the same equipment; AC05. |
| S02-T06 | Empty real registry and old inline/demo guidance in storage. | No rating offered; discovery/independent native watch route remains available; AC06–07. |

Run existing domain/mobile tests, TypeScript and `npm run check:runtime`. Add focused matching/migration tests and component state tests where the harness exists. Deliver the component contract, migration examples, real-source evidence ledger or an explicitly empty registry, and AC results. Estimated effort: **10 worker-hours**. Source acquisition/review delays must be reported as blocked content, never replaced with an invented production entry.
