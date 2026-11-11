---
id: SAFE-01
title: "Assess real point and line hazards without weakening full-footprint checks"
priority: P0
estimate_hours: 12
dependencies: [FOUNDATION-02]
lane: safety
expert_review: true
external_gate: "Qualified review of geometry uncertainty assumptions is required before real recommendations can pass."
---

# SAFE-01 — Assess real point and line hazards conservatively

Extend deterministic footprint assessment to preserve and check actual point and line chart hazards. Keep the existing conservative behavior for uncertain geometry, chart seams, unknown depth and missing coverage. Do not infer safe seabed from omitted objects or rendered map tiles.

## Baseline, prerequisites and scope

Read `packages/domain/src/geo.ts`, `engine.ts`, `validation.ts`, `types.ts`, `test/assessment.test.ts`, and `workers/ingest/REAL_ENC_SMOKE.md`. The successful real chart assembly contains polygon hazards but reports omitted point/line objects. `diskIntersectsArea` currently checks polygon edges and holes; `areaContainsDisk` deliberately requires one polygon to contain the full disk. These protections already exist: preserve them rather than rewriting the engine wholesale.

Depend on FOUNDATION-02's frozen primitive/uncertainty schema. Own `geo.ts`, a proposed `hazards.ts` helper and dedicated geometry tests. Make the narrowly required engine call-site edit under an integrator lock; SAFE-02 also needs `engine.ts`, so these edits are sequential. Shared types/validators stay read-only unless the schema owner approves an amendment. DATA-02 supplies ingestion mapping independently; do not wait for human-approved real data to test the mathematical implementation.

## Technical instructions

1. Support the contracted point, line and polygon primitives, preserving original geometry and source IDs. Compute point-to-disk and segment/polyline-to-disk intersection using the repository's local metric/geodesic approach or a justified, deterministic alternative compatible with Node, V8 and Hermes.
2. Include sourced object extent/positional uncertainty and the reviewed numerical guard in exclusion distance. If a real hazard's required extent/uncertainty is unresolved, produce insufficient evidence for the affected assessment and prevent a completeness assertion. Never silently substitute zero metres or invent a circular polygon as source geometry.
3. Keep full-circle vessel/rode footprint exclusions independent of wind prediction. Check tiny objects wholly inside the circle, crossing cables/channels, hole boundaries and degenerate-but-valid zero-length primitives. Invalid or self-inconsistent input must fail validation without hanging or throwing from UI render.
4. Preserve conservative minimum depth and maximum rode calculations across the entire stay plus contingency. Maintain exclusions when all other checks pass; ranking, preferred seabed and +20/+30% alternatives must not erase them.
5. Establish a reproducible numerical error envelope using analytical cases and offline PostGIS/geodesic reference calculations. Keep the guard at least as conservative as the existing 2 m until evidence supports a different value. Record unsupported geometry extents/latitudes explicitly. Domain input beyond ±85° latitude or crossing unsupported bounds must not be represented as valid coverage.
6. Do not implement polygon-union clearance in this ticket. Adjacent polygons with no single full-footprint proof may remain insufficient evidence. Document that limitation and add a negative seam test so a future union optimization cannot silently fill a gap.
7. Bound runtime work and report truncation/unsupported complexity. Use deterministic stable ordering and IDs. Do not simplify analysis geometry to meet a performance target; retain it and return an explicit unsupported/insufficient result if processing limits are reached.

## Acceptance criteria

- **SAFE-01-AC01:** A sourced point or line intersecting the conservative footprint produces an exclusion with its original source IDs.
- **SAFE-01-AC02:** Missing uncertainty/extent evidence cannot create an assured-clear result or complete hazard coverage.
- **SAFE-01-AC03:** Tiny internal hazards, holes and tangent/boundary cases are handled conservatively; no circumference-only sampling.
- **SAFE-01-AC04:** Wind reversal and preferred/deeper alternatives never reduce the exclusion footprint.
- **SAFE-01-AC05:** Existing polygon, datum, clearance and chart-seam protections keep their expected outcomes.
- **SAFE-01-AC06:** Results are deterministic, bounded, non-mutating and compatible with the shared runtime target.
- **SAFE-01-AC07:** A numerical validation report states supported domains, guard, reference method, tolerances and limitations.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| S01-T01 | Fixture point 10 m from a 50 m footprint centre; assess, then move to exactly the guarded boundary. | Both excluded, stable reason/source IDs; AC01,03. |
| S01-T02 | Cable line crosses a circle while both endpoints are outside; reverse line coordinate order. | Both results excluded and equivalent; AC01,06. |
| S01-T03 | Missing point extent/uncertainty, otherwise complete test evidence. | Insufficient evidence; never a pass due to zero buffer; AC02. |
| S01-T04 | 1 m hazard inside a large disk and a habitat hole boundary intersecting it. | Both detected independently of sampling density; AC03. |
| S01-T05 | Wind reverses 180°; deeper alternative requires more rode. | Existing hazard exclusion retained/enlarged footprint checked; AC04. |
| S01-T06 | Adjacent depth polygons contain the centre but not the complete disk; add a narrow gap. | Remains insufficient; gap never bridged implicitly; AC05. |
| S01-T07 | Fixed seeded geometry corpus at equator, Keys, northern Europe and ±85° limits; compare reference distances. | Error within documented bound, no nondeterministic statuses; AC06–07. |

Run `npm run test --workspace=@anchor-buddy/domain`, `npm run typecheck` and `npm run check:runtime`. Keep analytical fixtures under test-only paths. Deliver implementation, numeric reference results, benchmark inputs/runtime and review notes. Estimated effort: **12 worker-hours**. Stop before choosing unreviewed real-world clearance margins; this task does not authorize recommendations or navigation.
