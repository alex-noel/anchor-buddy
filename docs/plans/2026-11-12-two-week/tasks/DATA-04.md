---
id: DATA-04
title: "Normalize reviewed tide and current station relationships"
priority: P0
estimate_hours: 10
dependencies: [FOUNDATION-01, FOUNDATION-02, DATA-01]
lane: data
expert_review: true
external_gate: "A qualified reviewer must supply or approve station-area validity, datum conversion and bounded water-level uncertainty before analytical coverage is enabled."
---

# DATA-04 — Normalize reviewed tide and current station relationships

Implement validated tide/current component assembly using explicit station-to-area relationships. Make it possible to ingest a reviewed Florida Keys pilot relationship without treating a nearby station, tide prediction or rectangular station bound as proof of local water levels or currents.

**Estimate:** 10 worker-hours. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-01. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. Deliver adapter/normalizer tests and a review-ready mapping dossier even if no maritime approval is available; analytical activation remains externally gated.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

`apps/api/src/providers/coops.ts` already validates `StationMapping` identity, review dates, bounding box, chart datum, offset and uncertainty, and retrieves raw CO-OPS predictions. It does not assemble `TideInterval` or complete coverage for live discovery. `packages/domain/src/types.ts` expects dated water-level bounds, coverage IDs, uncertainty and `stationRelationshipReviewed`; weather/current intervals share a separate contract.

Own focused CO-OPS validation/normalization changes, a proposed `apps/api/src/providers/water-level-components.ts`, corresponding API tests, and proposed operator mapping examples/docs. Coordinate changes to the existing `StationMapping` interface with FOUNDATION-02. Treat domain types, composition, `live-factory.ts`, `server.ts`, fixtures used by other lanes and UI files as read-only; submit integration requirements to their owner.

## Required contract

Mapping input must identify source station/product/bin where applicable, original and target datums, units, time basis, supported area geometry with holes if present, review identity/date/expiry, transformation provenance, allowed time range and the uncertainty model. The existing coarse bounding box may be retained as a fast rejection check; it cannot replace reviewed geometry. Persist no individual user's location history. Mapping reviewer names/contacts follow the agreed operator-record privacy policy; do not invent a human signature.

Output is a dated tide/current component for DATA-03, referencing original response/source IDs and mapping/version hashes. Freeze the FOUNDATION-02 contract as nominal `minWaterLevelM`/`maxWaterLevelM` in the target datum, plus separate nonnegative `uncertaintyM` (or null when unknown). Apply the signed datum offset to nominal levels; do not pre-expand them. The combined bounded uncertainty includes separately evidenced weather-driven residual and transformation contributions under the reviewed combination rule. The engine applies it exactly once: lower = nominal minimum − uncertainty; upper = nominal maximum + uncertainty. Astronomical predictions alone cannot establish total water-level certainty. Any unknown required contribution leaves uncertainty null and coverage incomplete. Tide height never supplies currents; product/bin equivalence requires review.

## Implementation instructions

1. Validate the current CO-OPS product parameter requirements against official documentation. Preserve UTC query/response times and source units; never parse station-local strings as device-local time.
2. Replace permissive raw-object handling at the component boundary with explicit response validation. Missing fields, error envelopes, bad numeric values, impossible timestamps and unsupported products need typed failures.
3. Implement interval segmentation from actual sample coverage and reviewed interpolation/envelope rules. A hole, endpoint gap, absent residual bound or unsupported product remains unknown; do not bridge it with a convenient constant.
4. Apply datum conversion exactly once with documented sign and units. Keep raw/nominal converted levels, offset, separate uncertainty contributions, combination rule and versions in the report. Reject negative uncertainty; never encode already-expanded levels as nominal bounds. Exercise the actual engine with assembled intervals to prove clearance and maximum-depth rode calculations apply uncertainty once. Shared engine edits belong to SAFE-01/the integrator; this task must not change clearance equations.
5. Require the complete candidate footprint to remain inside mapping coverage through the shared evidence contract. A successful station request at the search centre must not bless the whole search radius.
6. Prepare a small Keys mapping dossier using public station metadata, explicitly separating observed facts from review questions. Leave unapproved fields pending; do not set `reviewedBy` to an agent or developer and call it maritime approval.
7. Integrate via component output and typed unavailable reasons. Outages reuse only original dated cached evidence under OPS cache policy, never revised retrieval/expiry times.

## Acceptance criteria

- **DATA-04-AC01:** Invalid, expired, future-reviewed or wrong-datum mappings are rejected before requesting/assembling analytical evidence.
- **DATA-04-AC02:** Unsupported products/bins, malformed errors, NaN values and temporal gaps cannot create usable interval bounds.
- **DATA-04-AC03:** Conversion retains source units/datum, applies the signed offset once to nominal bounds, and emits separate nonnegative uncertainty. An assembly-to-engine test proves uncertainty expands water levels exactly once for clearance and required rode.
- **DATA-04-AC04:** Missing weather-driven residual uncertainty leaves water-level certainty incomplete; tide predictions alone do not set complete coverage.
- **DATA-04-AC05:** Coverage respects reviewed geometry/holes and the full footprint; a point inside a bounding box is insufficient.
- **DATA-04-AC06:** Current magnitude/direction comes only from its stated product and bin; tide heights never become currents.
- **DATA-04-AC07:** The real pilot dossier identifies source dates, product availability and unresolved reviewer decisions without fabricated approval.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-04-T01 | Test-only reviewed mapping has +0.4 m offset, source levels 0.2–0.8 m, residual uncertainty 0.06 m and transformation uncertainty 0.04 m with a test-only reviewed additive bound. | Component nominal bounds are 0.6–1.2 m and uncertainty is 0.1 m; effective bounds are 0.5–1.3 m only when the engine expands them. A negative uncertainty input is rejected. | 02,03 |
| DATA-04-T02 | Omit the weather-residual bound from the same input. | Incomplete evidence; no complete tide coverage or safe clearance assertion. | 04 |
| DATA-04-T03 | Expire mapping by one millisecond or request the wrong chart datum. | Typed rejection before HTTP request; zero transport calls. | 01 |
| DATA-04-T04 | Footprint crosses a reviewed polygon edge or a hole while its centre remains inside. | Evidence cannot cover the full footprint. | 05 |
| DATA-04-T05 | Remove a sample interval; return an API error or invalid current bin. | Gap/product failure remains unknown with an actionable reason; no interpolation by default. | 02,06 |
| DATA-04-T06 | Inspect a bounded live station metadata/prediction request and the dossier. | Source response, product and timestamps recorded; analytical activation still requires actual mapping approval. | 07 |
| DATA-04-T07 | Feed T01's assembled interval into the real domain engine with test-only complete evidence, same-datum chart bounds 5–7 m, draft 1.5 m, bow height 1 m and test-only reviewed ratio 7; provide 70 m usable rode and sufficient coverage. | Minimum/maximum depth are 5.5/8.3 m, minimum clearance is 4.0 m, and required rode is `ceil((8.3 + 1) × 7) = 66 m` under the existing conservative whole-metre rule. No second uncertainty expansion occurs. | 03,04 |

Run existing `npm run test --workspace=@anchor-buddy/api`, `npm run test --workspace=@anchor-buddy/domain` and `npm run typecheck --workspace=@anchor-buddy/api`; add assembly/engine contract tests to the API test glob. Hand off a component example, mapping schema migration notes, datum-sign/uncertainty tests, live-request evidence and outstanding maritime decisions. Reference: [official CO-OPS API documentation](https://api.tidesandcurrents.noaa.gov/api/prod/). Do not bypass provider access limits or create accounts to unblock this ticket.
