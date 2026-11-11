---
id: DATA-05
title: "Compose spatially bounded forecasts and official warnings"
priority: P0
estimate_hours: 10
dependencies: [FOUNDATION-01, FOUNDATION-02, DATA-01]
lane: data
expert_review: true
external_gate: "Model/grid applicability and warning coverage need qualified review before centre-point forecasts become full-footprint assessment evidence."
---

# DATA-05 — Compose spatially bounded forecasts and official warnings

Implement forecast components that retain each product's actual spatial and temporal support, and combine them conservatively for the stay plus departure contingency. Continue showing real point forecasts even when they cannot establish complete anchorage weather/current coverage.

**Estimate:** 10 worker-hours. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-01. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. DATA-04 current components are accepted through the frozen contract when available; do not wait for its implementation to write/test this composer.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `apps/api/src/providers/nws.ts`, `nws-live.ts`, `met-norway.ts`, `met-ocean.ts`, `open-meteo.ts`, `discovery.ts`, `live-types.ts` and domain `WeatherInterval`/`CoverageArea`. NWS raw grid intervals and active alerts are fetched. MET ocean reports its actual snapped model coordinate. Live discovery deliberately does not claim full spatial safety coverage. Current `coverageAreaIds: ['live-weather-request']` cannot alone prove complete weather or current evidence.

Own `nws.ts`, `nws-live.ts`, a proposed `apps/api/src/providers/forecast-components.ts` and targeted tests. Coordinate any other provider adapter edit with the integrator; `discovery.ts`, `live-factory.ts`, `http.ts`, shared types and UI stay read-only. OPS-02 owns request budgets/cache behavior; this ticket supplies component semantics rather than a parallel transport stack.

## Inputs, outputs and constraints

Input comprises actual provider payloads, immutable source records, explicit spatial-support metadata, request start/end and separately reviewed current components. Output comprises nonoverlapping dated intervals, source/coverage references, missing-parameter flags and a component report. Preserve product ID, model/grid geometry or point, native resolution/coordinate, issue/retrieval/expiry times, units and any reviewer-approved applicability rules. Use the existing shared schema or the approved FOUNDATION-02 extension; never independently redefine it.

An economic request extent or arbitrary buffer around a model coordinate is not model coverage. If a provider exposes only a point sample, keep it as context with incomplete spatial evidence. Preserve wind direction conventions and distinguish significant wave height, separate swell and individual-wave maxima; do not invent one from another. `null` is unknown, not calm. A warning query returning zero active messages does not guarantee the absence of future warnings for an entire multi-day stay. Retain warning spatial geometry or authoritative zone identity, onset/effective/end/expiry, cancellation/update identity and uncertain applicability.

## Implementation instructions

1. Validate documented NWS grid metadata and raw interval units without discarding available source geometry. Check official current product documentation; do not assume `/points` works at every offshore location.
2. Build an interval compositor using the union of actual boundary times and the exact search-plus-contingency window. Retain half-open interval semantics agreed in FOUNDATION-02, gaps, duplicate issues and source expiry. Never nearest-time fill a missing parameter.
3. Establish one explicit provider-selection/conflict policy per parameter. When spatial/time support differs, retain distinct source provenance and mark incomplete intersections; do not choose whichever value makes a candidate pass.
4. Map warnings using spatial intersection/zone evidence and effective intervals. Handle canceled/replaced bulletins without keeping stale duplicates. Unresolved zone geometry remains a deficiency.
5. Preserve model point versus selected location in reports. NWS geometry can support a grid footprint only after its meaning and quality are checked; MET global and ocean point products must not silently cover the search circle.
6. Give DATA-03 the component output, DATA-08 a bounded live-smoke interface and APP coverage work human-readable missing-field reasons. Keep official warning outages independent from ordinary wind availability.
7. Document permitted refresh cadence and transport requirements via DATA-01/OPS-02; do not add retries or alternate provider mirrors that bypass their policies.

## Acceptance criteria

- **DATA-05-AC01:** Every assembled value retains its source/product, units, original timestamps and actual spatial-support identity.
- **DATA-05-AC02:** The full requested stay plus contingency is represented as explicit supported or missing intervals; no gaps or endpoint extensions are fabricated.
- **DATA-05-AC03:** Missing gusts, swell, waves or currents remain null/incomplete; a point or snapped coordinate never creates a search-circle coverage claim.
- **DATA-05-AC04:** Warning applicability respects source geometry/zones and effective time; replacements/cancellations are handled and unresolved coverage remains visible.
- **DATA-05-AC05:** Conflicting or differently supported providers follow a documented conservative policy with deterministic output and source attribution.
- **DATA-05-AC06:** Outside-region or denied optional providers leave core point forecasts usable and do not trigger unauthorized retries.
- **DATA-05-AC07:** Real bounded US, European and Asian requests produce reports whose actual availability is recorded without inventing required fields or fixed counts.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-05-T01 | Wind covers 12–18 UTC, waves 13–17, current 12–16; request 12–19 including contingency. | Segmented output exposes 12–13/16–19 deficiencies; no complete seven-hour coverage. | 01,02,03 |
| DATA-05-T02 | Forecast reverses 350°→170° with distinct intervals and a high gust. | Direction/peak values and units survive exactly; no averaging hides reversal or gust. | 01,05 |
| DATA-05-T03 | MET ocean snaps away from requested position; only point geometry exists. | Actual model point is retained and spatial coverage remains incomplete. | 03 |
| DATA-05-T04 | Warning begins during stay, intersects only part of footprint, then is canceled by a later issue. | Applicable intervals/identity follow the documented update policy; uncertainty is never blanked by an empty list. | 04 |
| DATA-05-T05 | Optional wave service is disabled and official warnings time out. | Wind context remains available; missing wave/warning evidence is visible and transport budget is respected. | 03,06 |
| DATA-05-T06 | Request one Keys point, one Bergen point and one Asian preset through the real configured adapters. | Save status/provenance reports; differences in product coverage are truthful, not constant expected counts. | 07 |

Run `npm run typecheck --workspace=@anchor-buddy/api`, `npm run test --workspace=@anchor-buddy/api`, and the existing bounded live-smoke command documented in `apps/api/LIVE_DATA.md`. A new multi-area runner must be explicitly opt-in. Handoff includes interval diagrams or tables, conflict policy, source fields retained, test commands and unresolved coverage-review items. References: [NWS API](https://www.weather.gov/documentation/services-web-api), [MET product documentation](https://api.met.no/), [MET terms](https://api.met.no/doc/TermsOfService).
