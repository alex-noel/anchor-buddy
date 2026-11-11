---
id: FOUNDATION-02
title: "Freeze versioned evidence, persistence and integration contracts"
priority: P0
estimate_hours: 8
dependencies: [FOUNDATION-01]
lane: foundation
expert_review: true
external_gate: null
---

# FOUNDATION-02 — Freeze versioned evidence, persistence and integration contracts

Define and implement the smallest compatible contract changes needed by the data, assessment, mobile and operations workers. Publish explicit schemas and migration rules before those workers edit shared types. Keep behavior conservative and prevent incompatible independent interpretations.

## Baseline and ownership

Read `packages/domain/src/types.ts`, `validation.ts`, `apps/api/src/providers/contracts.ts`, `live-types.ts`, `apps/api/src/packs.ts`, `workers/ingest/anchor_ingest/assessment.py`, `apps/mobile/src/lib/workspace.ts`, `storage.ts`, `storage.web.ts`, and the other task briefs. `RegionPack` currently lacks an explicit schema-version field; hazards accept only polygon areas; `ScopeGuidance` is embedded in the boat; `TariffBand` is season-oriented; source validity and forecast validity share existing timestamp fields.

Own shared domain/public API types, their validation contracts and proposed `docs/contracts/v2.md` plus small contract tests. Do not edit the assessment algorithm, provider fetchers, native watch protocol or App screens. You are the only shared-schema editor in this wave. Later workers propose schema amendments to the integrator instead of editing these files concurrently.

## Requirements and instructions

1. Produce a field-by-field compatibility table covering existing versus proposed fields, required/optional/null meanings, migration ownership and rejection behavior. Freeze longitude/latitude order, WGS84, metres, knots, true bearings, UTC instants, IANA business timezones, and half-open calculation intervals. Preserve original provider datums and units alongside normalized values. Freeze the UI conversion policy: untouched drafts retain their exact canonical number; edited numbers convert from the declared unit without intermediate display rounding. Compare calculated edited values against the exact specified conversion using epsilon `max(1e-9, abs(expected) * 1e-12)` in canonical units. This is a UI arithmetic test tolerance, never permission to alter a safety threshold or geometry outcome. Document display rounding separately.
2. Specify a versioned evidence envelope. Distinguish source observation/survey/model issue time, retrieval time, refresh eligibility, usable freshness, forecast interval, rights/entitlement and review status. Add only fields required by a named consuming task. A refresh or cache read must not advance original issue/retrieval dates.
3. Define point/line/polygon hazard primitives and positional-uncertainty provenance for SAFE-01/DATA-02. Unknown object dimensions or uncertainty cannot become a zero-size assured-clear object. Marks remain display objects and do not imply complete hazard coverage.
4. Define independently versioned static evidence and dynamic forecast/tide components, composed snapshot identity, required source references, integrity hashes and review bindings. Changing a reviewed component invalidates that approval unless the documented review scope explicitly permits the change.
5. Define equipment-guidance references/compatibility fingerprints for SAFE-02. For SAFE-03/DATA-07, define tariff product/vessel/dimension selectors, source decimal rate precision, currency minor units, rounding stage, billing timezone/increments, tax inclusion, unknown mandatory charges, deposits and field-level source references. Registry entries without evidence remain unavailable. Do not select a nautical ratio or a tariff policy on an operator's behalf.
6. Specify versioned local profile/search/plan records and migration hooks. Legacy single seabed preferences are supported through the existing migration; legacy unproven snapshots remain hidden. Failed migration retains the original record for recovery and does not auto-arm any watch.
7. Implement validators/migration envelope helpers required to make contracts executable. Unknown major schema versions return an actionable unsupported-version result before activation. Keep current compatible packs readable; do not weaken `validateLiveRegionPack` to accept synthetic input.
8. Freeze tide semantics explicitly: `minWaterLevelM`/`maxWaterLevelM` are nominal interval bounds in the declared datum; `uncertaintyM` is a separate nonnegative conservative bound. Datum offsets change nominal levels; documented source/conversion/residual uncertainty is combined conservatively and applied exactly once by the assessment engine (subtract for clearance, add for rode). Never pre-expand bounds and then expand them again. Preserve unsupported relationships as unknown.
9. Record a fingerprint of the existing watch protocol in `modules/anchor-watch/src/types.ts` and `validation.ts`; preserve its behavior. The integrator owns any separately reviewed amendment. This task does not redesign or extend native watch behavior.
10. Publish examples that are explicitly test-only, a change log and each downstream task's permitted extension points. Record the integrator's approval of the interface, not a claim of maritime review.

## Acceptance criteria

- **FOUNDATION-02-AC01:** Every new field has type, units, null semantics, version and consuming owner documented.
- **FOUNDATION-02-AC02:** Existing permitted legacy records migrate without changing coordinates, money, dimensions or source dates.
- **FOUNDATION-02-AC03:** Unsupported major versions and missing required provenance are rejected before active state changes.
- **FOUNDATION-02-AC04:** Point forecast, chart display, seabed context and verified analytical coverage cannot be confused by the contract.
- **FOUNDATION-02-AC05:** Review identity is bound to component hashes and scope; automatic recomposition cannot self-approve changes.
- **FOUNDATION-02-AC06:** Synthetic runtime rejection and three assessment outcomes remain intact.
- **FOUNDATION-02-AC07:** Equipment/tariff extensions and persistence migration responsibilities have one named owner each; downstream dependency cycles are absent.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| F02-T01 | Parse an existing non-synthetic unreviewed ENC assembly and current discovery response. | Compatible input accepted with unchanged values and unreviewed state; AC02,06. |
| F02-T02 | Change schema major version to an unsupported value, then attempt activation. | Explicit unsupported result; prior complete pack remains active; AC03. |
| F02-T03 | Supply point forecast with no spatial review; supply a scientific DTM sample as depth evidence. | Neither satisfies analytical coverage schema; AC04. |
| F02-T04 | Change one reviewed static component's bytes but keep old review record. | Hash/review binding fails; no approved composition; AC05. |
| F02-T05 | Migrate a legacy saved search, then force the storage commit to fail. | Original recoverable record remains; no fabricated old result values; AC02–03. |
| F02-T06 | Pass explicitly synthetic and missing-synthetic-classification source records. | Existing live boundary rejects both; AC06. |
| F02-T07 | Normalize nominal tide bounds 0.6–1.2 m with separate uncertainty 0.1 m, then calculate clearance and rode. | Effective levels are 0.5–1.3 m, never 0.4–1.4 m; units/null semantics documented; AC01,04. |
| F02-T08 | Independently review the owner/consumer table and topologically sort all task prerequisites; exercise untouched and edited unit conversions. | Each extension has one owner, no cycle exists, unchanged canonical values are exact and edited conversions meet the frozen tolerance; AC01,07. |

Run existing `npm run typecheck`, `npm run test --workspace=@anchor-buddy/domain`, `npm run test --workspace=@anchor-buddy/api` and `npm run check:runtime`. New contract-specific commands must be added and documented before being reported as run. Deliver schema examples, test output and a consumer migration table. Estimated effort: **8 worker-hours**; expert review is required for semantics, not merely TypeScript compilation. Stop on conflicting source meaning rather than inventing a datum, validity window or approval.
