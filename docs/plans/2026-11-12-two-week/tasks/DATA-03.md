---
id: DATA-03
title: "Compose immutable regional evidence and display packs"
priority: P0
estimate_hours: 10
dependencies: [FOUNDATION-01, FOUNDATION-02, DATA-02]
lane: data
expert_review: true
external_gate: "Qualified maritime, coverage, geometry, station and on-water approvals must exist before the existing live-assessment release gate can pass."
---

# DATA-03 — Compose immutable regional evidence and display packs

Implement composition of a small real Florida Keys pilot pack from separately versioned evidence components. Keep unsimplified analysis, rendered display assets and human review attestations separate, and preserve the existing release gate when a component or review is missing.

**Estimate:** 10 worker-hours. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-02. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. DATA-04/05/06/07 outputs are optional inputs to the composition mechanism, not prerequisites for its implementation. DATA-08 performs final integration after those tasks; do not create a dependency cycle.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `workers/ingest/anchor_ingest/assessment.py`, `packs.py`, `postgis.py`, `workers/ingest/README.md`, `apps/api/src/packs.ts`, `apps/mobile/src/lib/packInstall.ts`, and `packages/domain/src/types.ts`. Verified immutable source packs and unreviewed ENC assembly exist. API `FilePackStore.assessment()` requires reviewed release status plus maritime, coverage, geometry, station-mapping and on-water flags. Merely generating valid JSON must not satisfy them.

Own a proposed `workers/ingest/anchor_ingest/composition.py`, proposed composition tests, recipe documentation and serialized follow-up edits to `packs.py` after DATA-02. Treat `__main__.py`, domain schemas, API pack routes and mobile install code as integrator-owned; hand off explicit wiring changes. New modules/interfaces below are proposed, not claims of existing functionality.

## Contract and scope

Input is a composition recipe naming exact component IDs/versions/hashes, intended bounds, time zone, intended evidence validity and optional immutable review-attestation references. Components include chart analysis, rules/habitat, water levels, weather/current intervals, official places/tariffs, and display tile/style assets. Output is a new version directory with a manifest, checksummed assets, a `RegionPack` assessment, a composition report and references to original provenance. No network fetch belongs inside the pure composition function.

Require globally unambiguous IDs without silently changing semantic source IDs. Validate every referenced source and coverage ID. Retain component dates; composition time is not source retrieval time. Set aggregate validity conservatively while preserving each source's distinct interval. A source crop/search rectangle never establishes complete coverage. Use the FOUNDATION-02 review contract to bind attestations to component hashes and reviewed scope; changing a reviewed component must invalidate affected attestations. A chart-display asset can be present only with explicit storage rights; analysis must never be read back from simplified/rendered tiles.

## Implementation instructions

1. Define a pure validator/composer against the frozen contract. Identify required versus optional components per evidence layer; missing layers produce a machine-readable deficiency report and unreviewed output.
2. Merge exact source geometry and time intervals without cross-component interpolation. Detect conflicting IDs, incompatible datums, unknown unit conversions, incompatible bounds and overlapping contradictory records. Do not pick the more favorable value.
3. Integrate DATA-02 omission summaries into coverage eligibility. Any unresolved safety-critical primitive or chart seam must remain visible and prevent a complete claim for its affected area/layer.
4. Generate display assets only through the separately documented tile path with rights/attribution and source-version identity. Keep unsimplified SQLite/assessment geometry independently hashed.
5. Stage output in a temporary directory, validate asset size/hash/schema references, then atomically install an immutable version. Publishing the latest pointer is a separate action; failure leaves the previous complete version intact.
6. Enforce attestation identity: absent, expired, future-dated, mismatched-hash or insufficient-scope review cannot promote release status. Preserve existing on-water release requirements; internal technical review is not an equivalent.
7. Supply one real pilot recipe, composition report and API/mobile install handoff. If human-reviewed components are unavailable, deliver an honest unreviewed pilot and the exact missing-review manifest, not a falsely releasable pack.

## Acceptance criteria

- **DATA-03-AC01:** Composition consumes only immutable explicitly identified components and validates all hashes and reference IDs before activation.
- **DATA-03-AC02:** No component retrieval/expiry date is refreshed by composition, caching or publication.
- **DATA-03-AC03:** Missing/contradictory evidence and critical omissions remain explicit; no search rectangle or empty hazard collection becomes complete coverage.
- **DATA-03-AC04:** Display geometry/assets and unsimplified analysis remain separate and retain matching source-version references and attribution.
- **DATA-03-AC05:** Review attestations bind to exact content/scope; changing a bound component invalidates promotion. Existing API release gates remain effective.
- **DATA-03-AC06:** Failed or interrupted composition preserves the previous complete version and pointer; same version cannot be overwritten.
- **DATA-03-AC07:** A real pilot recipe produces a structurally valid pack plus a machine-readable deficiencies report without manufacturing approvals.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-03-T01 | Compose valid test-only components with distinct IDs and exact hashes. | Deterministic canonical content and references; source dates unchanged. | 01,02 |
| DATA-03-T02 | Remove habitat coverage and include unresolved line hazards. | Pack stays unreviewed with both missing items; no complete habitat/hazard claim. | 03 |
| DATA-03-T03 | Give a display polygon simplified enough to omit a small hazard. | Analysis still uses original geometry; display does not affect safety evidence. | 04 |
| DATA-03-T04 | Change one chart byte after producing its review attestation. | Hash mismatch blocks promotion/activation; prior version remains active. | 01,05,06 |
| DATA-03-T05 | Fail after writing half the staging assets; rerun into an existing version. | No partial current pointer; overwrite attempt rejected. | 06 |
| DATA-03-T06 | Compose the real pilot with missing human reviews, then request live assessment. | Unreviewed output is inspectable; existing API rejects live-assessment release. | 05,07 |

Run `npm run test:ingest`, `npm run test --workspace=@anchor-buddy/api`, and `npm run typecheck --workspaces --if-present` after integration. Document any new CLI as proposed until implemented. Handoff includes recipe, manifest and report locations, content hashes, dependency schema version, test commands, expected blocked release response and precise external review checklist. No credentials or large source datasets belong in the PR.
