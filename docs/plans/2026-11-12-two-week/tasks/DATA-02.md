---
id: DATA-02
title: "Harden real ENC extraction and source mapping"
priority: P0
estimate_hours: 8
dependencies: [FOUNDATION-01, FOUNDATION-02, DATA-01]
lane: data
expert_review: true
external_gate: "Maritime validation of datum, survey quality and omitted hazard semantics is required before coverage approval."
---

# DATA-02 — Harden real ENC extraction and source mapping

Harden the existing NOAA ENC ingestion path so repeated real-chart imports remain reproducible, preserve source semantics and fail closed on unsupported geometry, datum, units or update chains.

**Estimate:** 8 worker-hours. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-01 product policy fields. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. Deliver import correctness and an explicit omission inventory, not a declaration that all chart hazards are supported.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `workers/ingest/REAL_ENC_SMOKE.md`, `README.md`, `anchor_ingest/sources.py`, `geometry.py`, `assessment.py`, `packs.py` and `tests/test_assessment.py`. The actual Key West cell US5FL4DR already yielded 4,299 source objects, 288 depth areas, 40 polygon hazards and 77 marks. Do not rebuild this feature as if it were missing. Source sounding datum, height datum and depth-unit codes are distinct. Isolated soundings and non-area hazards remain in SQLite/omission reports; coverage and survey quality are not inferred.

Own focused changes in `sources.py`, `geometry.py`, `assessment.py`, associated Python tests, and the ingestion verification documentation. Reserve these files during this task; DATA-03 starts after this merge. Shared `packs.py`, `__main__.py`, API/domain files and Docker images are read-only unless the integrator approves a serialized patch. Do not change infrastructure dependency versions casually.

## Inputs and outputs

Inputs are an explicitly selected NOAA exchange set, contiguous updates, provenance, and operator datum/unit mappings accepted by FOUNDATION-02. Outputs remain verified `analysis.sqlite`, unreviewed `assessment.json`, and an omission report. Preserve stable source identity plus split-point identity, update/edition metadata, exact geometry with holes, unknown bounds, original unit/datum codes and the transformation audit. Source artifacts remain outside source control in ignored storage; tests may use small attributed response samples only where redistribution is allowed. Synthetic geometry stays test-only.

The current `HazardArea` domain contract accepts areas only. After FOUNDATION-02 freezes the replacement primitive contract, serialize supported source point/line hazards into `assessment.json` with their original geometry, object class and source IDs. Preserve unknown extent/positional uncertainty explicitly as unknown; never replace either with zero or an invented buffer. Engineering serialization does not require maritime approval or completed SAFE-01 implementation. Keep hazard coverage incomplete while required uncertainty or object semantics remain unresolved. Unsupported classes retain raw geometry and omission reasons. Local M_SDAT/M_UNIT overrides still require an approved spatial resolver; withholding those depths is preferable to a cell-wide assumption.

## Implementation instructions

1. Add a repeatable small-source regression harness for split soundings, duplicate FIDs, missing updates, deleted features, mixed units and local datum/unit metadata. Capture actual GDAL version and command arguments in evidence.
2. Prove deterministic feature identity across two extractions of the same input; IDs must distinguish source objects/point ordinals without depending on filesystem traversal order. Detect genuine collisions instead of silently dropping records.
3. Validate every per-source mapping against raw sounding datum and unit codes. Preserve null lower/upper bounds. Normalize units only through explicit mappings, recording the conversion and source value.
4. Test and document update-chain enforcement and failed-run cleanup. A partial/new extraction must never overwrite a prior complete source pack or its current pointer.
5. Emit supported point/line primitives through the frozen schema and test unknown extent/uncertainty fields explicitly. Make remaining omission reports machine-readable by reason code, object class and source ID; summarize unresolved safety-critical classes, not only their total number. Retain raw geometry for subsequent review. If the shared contract is unavailable or contradictory, report this implementation blocked instead of claiming that retaining all primitives as omissions completes it.
6. Re-run US5FL4DR or its documented current replacement and one independently selected small adjacent cell. Record actual editions, update sequences and changed counts; do not assert that historical counts are fixed expectations.
7. Run TypeScript `validateLiveRegionPack` on the assembled result through an explicit small verification script or existing import path. Its acceptance must not change the unreviewed status.

## Non-goals and blockers

No rendered-tile clearance calculations, sounding interpolation, automatic survey-quality approval, universal datum conversions, bulk world download or manual edits that turn omission counts into complete coverage. If an official source is unavailable, preserve the last complete artifacts and attach an unavailable-source result; do not substitute fixtures as a successful live run. Report GDAL/toolchain blockers with the exact failing command.

## Acceptance criteria

- **DATA-02-AC01:** Same source/version inputs produce identical normalized feature IDs and canonical geometry/depth outputs.
- **DATA-02-AC02:** Split soundings remain individually addressable; collisions or missing update steps fail explicitly.
- **DATA-02-AC03:** Units/datums require explicit matching source codes; local overrides never silently inherit an unsafe cell-wide mapping.
- **DATA-02-AC04:** Supported source point/line hazards are serialized with original geometry/source IDs and explicit unknown extent/uncertainty when absent; null depth bounds, polygon holes and small hazards survive without invented interpolation/buffers. Unresolved hazard evidence keeps coverage incomplete.
- **DATA-02-AC05:** Every excluded mapping has a stable omission reason and retained raw source reference; unresolved critical classes block coverage approval.
- **DATA-02-AC06:** Interrupted/invalid runs leave the previous complete pack and pointer byte-for-byte unchanged.
- **DATA-02-AC07:** Two real selected-cell runs have provenance/hash evidence, and generated assessments validate structurally while remaining unreviewed.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-02-T01 | Extract the same saved exchange set twice into separate directories. | Stable IDs, geometry, bounds and omissions match after excluding creation timestamps. | 01,02 |
| DATA-02-T02 | Test-only chain omits `.002` but includes `.003`; run extraction. | Explicit update-gap failure, no published output. | 02,06 |
| DATA-02-T03 | Same numeric bounds with metre, foot and fathom mappings; include null upper bound. | Explicit converted metres match 1, 0.3048 and 1.8288 factors; null stays null. | 03,04 |
| DATA-02-T04 | Include a local datum override, isolated sounding, supported point obstruction and line cable with missing extent/uncertainty. | Point/line primitives serialize with original geometry/IDs and explicit unknown fields; no zero/buffer substitution or complete hazard coverage. Unsupported local datum and sounding interpolation remain documented omissions. | 03,04,05 |
| DATA-02-T05 | Inject duplicate IDs and fail after partial output writing. | Collision/failure is visible; previous pack/pointer hashes are unchanged. | 02,06 |
| DATA-02-T06 | Run two real bounded NOAA cells and validate assemblies in TypeScript. | All raw sources traceable; structural validation passes; no review/coverage is fabricated. | 05,07 |

Run existing `npm run test:ingest`, the exact `catalog/download/extract/build/verify/assemble` commands documented in `workers/ingest/README.md`, and `npm run check:runtime`. Any new harness command must be documented as newly introduced. Hand off actual commands, source hashes, object-class/omission tables, regression results and unresolved mappings. References: [NOAA ENC downloads](https://charts.noaa.gov/ENCs/ENCs.shtml), [GDAL S-57 driver](https://gdal.org/en/stable/drivers/vector/s57.html).
