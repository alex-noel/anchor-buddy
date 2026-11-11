---
id: SAFE-03
title: "Make tariff calculations support source-specific bands and currency precision"
priority: P1
estimate_hours: 10
dependencies: [FOUNDATION-02]
lane: safety
expert_review: true
external_gate: null
---

# SAFE-03 — Calculate source-specific tariffs without guessing

Extend the tariff engine so the real operator rules collected by DATA-07 can be represented accurately. Preserve unknown fees, original currency and the separation between estimated cost and berth availability.

## Baseline and ownership

Read `packages/domain/src/cost.ts`, `types.ts` (`Tariff`, `TariffBand`, `CostEstimate`), `validation.ts`, `engine.ts` sorting, and `apps/mobile/src/lib/units.ts`. The current engine supports flat/per-metre/per-foot rates, seasonal periods, minimum charges, multihull/beam supplements, taxes and required extras. It rounds every amount to two decimals, matches bands by date only, and has no explicit source-specific length increment or billing/check-in rule. Do not rebuild supported arithmetic needlessly.

Own `cost.ts`, proposed `money.ts`, and dedicated tariff tests. Shared schema changes come from FOUNDATION-02. DATA-07 owns factual curation, APP-03 owns presentation. Any `engine.ts` price-ordering change is merged sequentially by the integrator. No exchange-rate service or billing/payment implementation belongs here.

## Technical instructions

1. Implement explicit band selection by effective local date, berth/mooring product, vessel type and published length/beam bands. Define inclusive/exclusive boundaries in the contract; overlapping equally applicable rules yield unknown rather than taking the first entry. Unsupported combinations remain unknown with a reason.
2. Represent published rounding increments (for example, each started metre/foot), minimum billable length, minimum stay charge, and whether seasonal boundaries use calendar nights/days or elapsed hours. Do not assume every marina bills at midnight or that a day stop is automatically cheaper.
3. Apply exact currency minor-unit rules and declared rounding stages. Use integer minor units or auditable decimal/rational arithmetic; never accumulate binary floating-point pennies silently. Source currency metadata is pinned/versioned for parity. Support zero-, two- and three-decimal currencies when explicitly known; unknown currency precision must not default to an invented charge.
4. Separate tax-inclusive from tax-exclusive rates, taxable from nontaxable extras, required from optional items and refundable deposits from estimated nonrefundable cost. A quote-only or metered unknown mandatory utility makes the relevant total/range explicitly incomplete; do not report a complete total that excludes required unknown costs.
5. Bill across seasons, local midnight, DST transitions and departure boundaries using the source's rules and tariff timezone. The user's display timezone must not change the charge. Preserve deterministic reasons and item labels without requiring locale-dependent business logic.
6. Return itemized amounts, quantities, applied rule IDs, source references, completeness and limitations. Confirmed-free evidence can return zero only while its supporting publication is applicable. Unknown is distinct from zero. Never infer a berth is available from a tariff.
7. Keep suitability-first sorting. Within an assessment group, unknown totals sort last. Different currencies have no meaningful global numeric cheapest ordering without conversion; group them by deterministic currency code with an explanatory label/contract, rather than comparing raw EUR, JPY and USD values as equivalent.

## Acceptance criteria

- **SAFE-03-AC01:** Exactly one source-supported price rule is selected; ambiguity/gaps return unknown with rule IDs/reasons.
- **SAFE-03-AC02:** Length increments, minimums, vessel supplements and billing periods reproduce approved examples exactly.
- **SAFE-03-AC03:** Currency rounding is correct for 0/2/3 minor digits and identical across supported runtimes.
- **SAFE-03-AC04:** Taxes, optional charges, deposits and unknown mandatory extras are distinguished and do not yield misleading totals.
- **SAFE-03-AC05:** DST, seasonal transitions and tariff timezones do not change the intended number of billed periods.
- **SAFE-03-AC06:** Free, paid, incomplete and unknown stay distinct; costs never assert availability.
- **SAFE-03-AC07:** Mixed-currency sorting is explicit and deterministic; no silent conversion or raw cross-currency comparison.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| S03-T01 | Test tariff EUR 4 per started metre/night; 10.01 m vessel, 2 nights, no other fees. | 11 × 4 × 2 = EUR 88.00, itemized; AC02. |
| S03-T02 | Two applicable length bands overlap at a boundary; then make a gap. | Both ambiguous/gap cases unknown; boundary policy documented; AC01. |
| S03-T03 | Explicit fixtures JPY 101, EUR 1.005 and KWD 1.2345 with documented half-up stage. | JPY 101, EUR 1.01, KWD 1.235; no extra cents or floating error; AC03. |
| S03-T04 | Rate already includes tax; add one required nontaxable extra, optional electricity and refundable deposit. | No double tax; optional/deposit separate; known items exact; AC04. |
| S03-T05 | Arrival/departure span spring/fall clock change and season boundary in tariff timezone; vary display timezone. | Charge unchanged by display zone and follows explicit period rule; AC05. |
| S03-T06 | Free record expires before stay; or mandatory metered utility lacks a bound. | Not a complete free/paid total; uncertainty visible; AC04,06. |
| S03-T07 | Equal-suitability EUR, JPY, USD and unknown-cost results sorted by price. | Deterministic currency groups, unknown last, no claimed cross-currency cheapest; AC07. |

Run domain tests and TypeScript; hand APP-03 sample outputs for all states and DATA-07 a supported-rule checklist. Estimated effort: **10 worker-hours**. Do not scrape or invent tariffs. Financial/source interpretation needs review when ambiguous. Reference: [ECMA-402 CurrencyDigits](https://tc39.es/ecma402/#sec-currencydigits); pin actual supported currency metadata rather than relying on differing runtime locale databases for business arithmetic.
