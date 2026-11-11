---
id: DATA-06
title: "Ingest dated restrictions, habitat and temporary notices"
priority: P0
estimate_hours: 8
dependencies: [FOUNDATION-01, FOUNDATION-02, DATA-01]
lane: data
expert_review: true
external_gate: "A qualified local maritime reviewer must resolve jurisdiction, rule applicability, habitat completeness and current notices; source collection alone cannot approve them."
---

# DATA-06 — Ingest dated restrictions, habitat and temporary notices

Implement a traceable rules/habitat/notices component for a bounded Florida Keys pilot, with explicit jurisdiction and effective dates. Prepare a review dossier that exposes uncertainty rather than interpreting absent polygons or incomplete legal summaries as permission to anchor.

**Estimate:** 8 worker-hours plus external review time. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-01. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. Do not contact third parties yourself unless separately authorized.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `workers/ingest/anchor_ingest/sources.py`, `__main__.py` (`official` command), `geometry.py`, `assessment.py`, and the `RestrictionArea`, `CoverageArea`, `HazardArea` and `Place` contracts in `packages/domain/src/types.ts`. An authoritative spatial import already exists and intentionally leaves rule applicability unresolved. `floridaKeysReefBuoy` and overnight exclusion behavior already exist; preserve them.

Own a proposed `workers/ingest/anchor_ingest/rules_components.py`, proposed rules tests, and proposed `docs/data/keys-rules-review.md`. Treat `sources.py`, `geometry.py`, `__main__.py`, domain engine/schema and public pack release metadata as read-only while DATA-02/03/SAFE-01 work there. Pass wiring/change requests to the integrator, not overlapping edits.

## Inputs and outputs

Inputs are official spatial layers and dated text/legal references supplied through a bounded recipe: source URL/identifier, jurisdiction, publication/retrieval/effective dates, geographic extent, version/hash, license/attribution and any actual review attestation. Output is a component with exact source geometry, unresolved/resolved applicability, explicit prohibitions or unknown permission, notice validity, coverage deficiencies and a human review checklist. Retain original scope distinctions: sanctuary-wide versus zone-specific rules, federal/state/local jurisdictions, habitat boundaries versus known absence, and temporary versus permanent restrictions.

Use stable identifiers and link interpretation to the underlying text/version. Do not infer legal precedence from source recency. A rule with no reliable end date requires an explicit review/refresh policy; it must not silently expire to allowed or become permanent without evidence. Source geometry missing because a download failed is different from a successfully retrieved empty layer. Do not convert every text notice into an invented polygon. An unresolved nonspatial notice affecting the pilot becomes an applicability blocker.

## Implementation instructions

1. Inventory official sanctuary GIS, applicable federal/state/local rules, habitat datasets and USCG notice entry points for the chosen pilot. Record URLs and retrieval outcomes, including denied/unavailable responses.
2. Import exact geometry with holes and source IDs. Keep interpretation fields unresolved unless a real reviewer supplied scoped approval. Request the necessary schema fields through FOUNDATION-02 before coding incompatible records.
3. Normalize effective intervals and jurisdiction identifiers. Detect contradictory overlapping rules and ambiguous amendments. Produce a conflict queue instead of selecting a permissive winner.
4. Encode the published Keys reef-buoy use category as daytime/short-term only, with official source evidence. Do not infer current vacancy, vessel limits or indefinite free use from a community buoy marker.
5. Preserve habitat completeness separately from habitat object presence. Missing polygons never prove clear seabed; a reviewed coverage polygon must document how its completeness was established.
6. Maintain notice identities, issue/update/cancel relationships and source freshness. If notice access fails, retain prior evidence with original dates and show a coverage gap; do not substitute a guessed incident list.
7. Produce the DATA-03 component and review dossier with each unresolved question, affected geography, source version, expected reviewer discipline and blocked recommendation consequence. A human can review it without reading source code.

## Acceptance criteria

- **DATA-06-AC01:** Every imported rule/habitat/notice record links an authoritative source/version, jurisdiction, geometry or explicit missing geometry, and dated applicability.
- **DATA-06-AC02:** No unresolved rule or unavailable layer is represented as permission; source failure differs from a successful empty response.
- **DATA-06-AC03:** Exact geometry holes, overlapping jurisdictions and effective-date changes survive import and produce explicit conflicts where unresolved.
- **DATA-06-AC04:** Florida Keys reef moorings are not eligible for overnight recommendations, with the official guidance retained as evidence.
- **DATA-06-AC05:** Habitat/hazard completeness cannot be inferred from an empty object list; full-footprint coverage remains independently required.
- **DATA-06-AC06:** Temporary notice updates/cancellations retain identity/history and do not reset source dates or silently remove unresolved impact.
- **DATA-06-AC07:** The pilot review dossier lists every blocked interpretation and contains no invented human approval or unverifiable legal conclusion.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-06-T01 | Import a polygon with a hole and two overlapping jurisdiction records. | Coordinates/holes survive; unresolved conflict is explicit. | 01,03 |
| DATA-06-T02 | Compare a successful empty habitat response with HTTP failure. | Distinct source statuses; neither establishes complete safe seabed by itself. | 02,05 |
| DATA-06-T03 | Stay crosses the effective time of an anchoring prohibition. | New rule applies to the overlapping stay interval; no whole-stay permission. | 03 |
| DATA-06-T04 | Official Keys reef buoy is free but search is overnight. | Overnight exclusion remains despite price; daytime classification does not imply availability. | 04 |
| DATA-06-T05 | Notice is replaced/canceled; a second notice lacks geometry or expiry certainty. | Update lineage retained; unresolved second notice still blocks completeness. | 01,06 |
| DATA-06-T06 | Reviewer inspects the dossier against raw sources. | Every interpretation has a source/version and pending review question or actual signed evidence. | 07 |

Run `npm run test:ingest` and, after integration, `npm run test --workspace=@anchor-buddy/domain`. New rule-component test filenames must be included by the current unittest discovery command. Handoff includes source inventory, conflict table, unreviewed component, tests and questions requiring a local reviewer. Official starting references: [sanctuary regulations](https://floridakeys.noaa.gov/regs/), [Keys mooring guidance](https://floridakeys.noaa.gov/mbuoy/allmbuoys.html), [USCG notice entry point](https://www.navcen.uscg.gov/local-notices-to-mariners). The last URL returned HTTP 403 during planning; treat access as unresolved, not as absence of notices.
