---
id: DATA-07
title: "Curate official places, vessel limits and tariff rules"
priority: P1
estimate_hours: 8
dependencies: [FOUNDATION-01, FOUNDATION-02, DATA-01]
lane: data
expert_review: true
external_gate: "Only attributable operator or municipal facts with permitted reuse can become verified records; ambiguous tariffs and maritime operating limits require review."
---

# DATA-07 — Curate official places, vessel limits and tariff rules

Implement a small operator-source register and ingestion workflow for real marina, dock and mooring facts. Capture published tariff rules without inventing rates, occupancy, overnight permission or vessel limits, and provide a reviewed input set for the deterministic tariff engine.

**Estimate:** 8 worker-hours. **Priority:** P1. **Prerequisites:** FOUNDATION-01/02 and DATA-01. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. SAFE-03 owns tariff calculation semantics; agree the tariff examples/contract in FOUNDATION-02, then develop ingestion independently. Do not create a circular dependency on SAFE-03 implementation.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `packages/domain/src/types.ts` (`Place`, `Tariff`, `TariffBand`), `cost.ts`, `apps/api/src/providers/overpass.ts`, `contracts.ts`, and `workers/ingest/README.md`. The deterministic cost engine exists, but runtime OSM discovery intentionally leaves prices, limits and permissions unverified. `official-places` describes a review-required capability, not an existing complete commercial catalogue.

Own a proposed `workers/ingest/anchor_ingest/places_components.py`, associated tests, proposed `workers/ingest/data/official-places/` factual records/schema examples, and `docs/data/place-curation.md`. Keep raw bulk PDFs/HTML and unlicensed excerpts out of git. Treat `cost.ts`, domain types/validation, discovery transport, API routes and UI as read-only. Request schema extensions through FOUNDATION-02; request merge/wiring via the integrator.

## Inputs and outputs

Input records identify a stable internal place ID, official business/operator name, kind, sourced position and its meaning (entrance/berth/feature centre), source URL/date/hash/reference, currency, local IANA time zone, effective tariff dates, basis/rate/period, minimums, seasonal boundaries, taxes, mandatory/optional extras and any dimension/type surcharges. Missing fields are explicit unknowns, not zero. Preserve original published units and the normalized values with a conversion record.

Additional facts include overnight/daytime status, published maximum LOA/beam/draft/displacement/air-draft limits, vessel categories, entrance/berth depth and datum, access windows, closures, facilities and public business contact links. `availability` remains unknown unless a current authorized source genuinely establishes it. A tariff is not a booking feed. A limit from an old blog or community tag is not operator verification. Approval of cost facts does not approve approach clearance, safe holding or legal permission.

## Implementation instructions

1. Define validated curation records using the frozen contract and implement a deterministic importer. Keep exact source facts distinct from reviewer interpretation and generated internal IDs.
2. Curate a bounded pilot inventory: target six real places across the Keys, one European pilot and one Asian pilot, covering marina/dock/mooring categories. Require at least three independently verifiable tariff schedules before claiming a price pilot complete. This is a dataset gate: if the target cannot be met, report the missing items and keep those prices unknown instead of inventing them.
3. Use official operator/municipal pages or published tariffs. Record the page/document section, verification date, effective date and permitted factual reuse. Do not create accounts, accept paid subscriptions, email operators or submit booking requests without separate user authorization.
4. Reject ambiguous overlapping seasonal bands, missing currency/time zone, incomplete tax basis, contradictory rates and unsupported pricing clauses. Preserve the original note and mark the estimate unsupported until SAFE-03 can represent it correctly.
5. Normalize lengths carefully: source feet versus metres, minimum billable length, multihull/beam charges and rate periods must not be collapsed into one guessed nightly rate. Send SAFE-03 source-derived examples with independently calculated expected line items, including rounding policy assumptions for review.
6. Define identity/merge rules with community POIs. Official data may supplement a matched place, but matching by name/proximity alone cannot silently transfer a tariff to another marina. Conflicts require an explicit reviewed link.
7. Emit a DATA-03 places/tariffs component and a coverage table distinguishing confirmed free, paid, unknown, expired, closed and unsupported pricing. Tariff expiration must not extend when caches refresh.

## Acceptance criteria

- **DATA-07-AC01:** Every factual field marked verified has an official source/reference and effective/verification dates; unverified fields remain unknown.
- **DATA-07-AC02:** Tariff normalization retains original currency, units, local time zone, seasonal periods, mandatory charges, tax basis and published minimums.
- **DATA-07-AC03:** Ambiguous or unsupported pricing fails closed to unknown/unsupported estimate with a reason, never a guessed price or confirmed-free label.
- **DATA-07-AC04:** Place matching requires explicit reviewed identity links; proximity/name collisions cannot attach a tariff automatically.
- **DATA-07-AC05:** Published fee facts do not imply available berths, verified approach, overnight permission or complete vessel compatibility.
- **DATA-07-AC06:** Import is deterministic, expired source/tariff records retain their dates, and future/contradictory effective dates are rejected or explicitly pending.
- **DATA-07-AC07:** Deliver the target six-place/three-tariff pilot or mark the dataset acceptance blocked with the exact missing official sources; engineering completion must not be reported as dataset completion.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-07-T01 | Import a sourced per-foot tariff with a minimum billable length and tax-exclusive required extra. | Original rule and units survive; normalized contract preserves each independent charge. | 01,02 |
| DATA-07-T02 | Place has `fee=no` only in OSM or a missing rate/currency. | It is not confirmed free or a zero-price quote. | 01,03 |
| DATA-07-T03 | Two nearby marinas share a similar name but only one reviewed official ID. | Tariff attaches only to the linked place; second remains unknown. | 04 |
| DATA-07-T04 | Official tariff is current but berth availability and entrance depth are absent. | Paid estimate data can exist; availability/approach/compatibility stay unverified. | 05 |
| DATA-07-T05 | Stay crosses a seasonal boundary; source omits whether a surcharge is per night or stay. | Effective bands preserved; ambiguous surcharge blocks total until reviewed. | 02,03,06 |
| DATA-07-T06 | Reimport unchanged records and then expired records; review inventory counts. | Stable IDs/content, no renewed dates, and explicit dataset-complete or dataset-blocked evidence. | 06,07 |

Run `npm run test:ingest`; after integration run `npm run test --workspace=@anchor-buddy/domain` and `npm run test --workspace=@anchor-buddy/api`. Add importer tests to current Python discovery. Hand off the small factual register, a source/rights table, unsupported clauses, identity links, expected calculation cases for SAFE-03 and command results. Do not copy private contact data, credentials or full copyrighted source documents into the repository.
