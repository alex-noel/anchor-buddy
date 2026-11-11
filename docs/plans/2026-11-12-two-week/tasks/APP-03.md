---
id: APP-03
title: "Make evidence gaps and full-stay forecasts understandable"
priority: P1
estimate_hours: 7
dependencies: [FOUNDATION-01, FOUNDATION-02, APP-01]
lane: app
expert_review: false
external_gate: null
---

# APP-03 — Make evidence gaps and full-stay forecasts understandable

Implement a clearer evidence inspector that helps a user understand why a result is excluded or needs more evidence, and what they can do next. Present the deterministic engine's decision faithfully; do not rewrite uncertain evidence as a recommendation.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Existing behavior

Read components/Details.tsx, RegionalDataSheet.tsx, ResultCard.tsx, lib/selectionAssessment.ts, lib/units.ts and the domain AssessmentReason/Assessment types in packages/domain/src/types.ts. Details already expose source dates and all forecast intervals through expansion. RegionalDataSheet already distinguishes centre-point scientific context from assessment data, shows 24/all intervals, and reports provider failures. These behaviors must remain.

The remaining problem is presentation: a long flat list of machine-generated reasons, mixed retrieval/validity dates and generic fallback messages is difficult to act on. Some source IDs appear directly in messages. The new view model should group evidence without hiding exclusions.

## Scope and ownership

Own Details.tsx, RegionalDataSheet.tsx and proposed lib/evidencePresentation.ts plus tests. ResultCard.tsx is owned by APP-04; provide an optional summary prop contract if needed. The domain engine, statuses, reason codes, source objects, tariffs and weather samples are read-only. App.tsx and navigation wiring belong to the integrator. APP-07 owns shared controls and date formatting; consume its public helpers without duplicate formatters.

Inputs are the current Assessment, RegionPack, optional RegionalData and selected display units. Outputs are presentation-only groups and explicit navigation intents such as reviewSearch, reviewBoat or viewSource. FOUNDATION-02 freezes any new fields before use.

## Technical instructions

1. Build a pure presentation mapper for exclusions, missing critical evidence, informational limitations and source provenance. Preserve every original reason code/message in an expandable technical/evidence detail, with source names resolved from sourceIds when available.
2. Put all hard exclusions before missing evidence. Show counts for collapsed categories. Never collapse the only visible statement that a position is excluded, that current evidence expired, or that the result is historical.
3. Give actionable groups only where a real control exists: edit invalid stay dates, edit vessel/equipment, refresh expired live data when online, view a required reviewed pack, or contact an operator through an actual published URL/phone. Otherwise state that the evidence is unavailable; do not invent an action.
4. Keep five time concepts distinct: source observation/publication date, retrieval time, valid interval, review effective interval and snapshot refresh deadline. Label absent dates “not supplied”; retrieval is not survey age.
5. Show the forecast's spatial applicability: search-centre point context versus verified local/full-footprint coverage. Include timezone, stay endpoints, departure contingency and visible gaps. Do not join unrelated intervals into an implied continuous series.
6. Display missing wind gusts, waves and current as unknown, never zero. Include source labels and interval boundaries; maintain all-interval access. If a source supplies values beyond the selected stay, label that context rather than silently extending the assessment.
7. Keep prices/availability/approach separate from suitability. No estimate implies a berth exists, and no map distance implies a navigable route.
8. Implement safe link handling for supported http/https/tel schemes and accessible labels. Do not open arbitrary unvalidated URL schemes from provider data.

## Acceptance criteria

- APP-03-AC01: Every engine reason is represented and the displayed outcome exactly matches the deterministic status.
- APP-03-AC02: Exclusions and expired/current-vs-historical state are visible before optional expansion.
- APP-03-AC03: Every rendered action reaches a usable control or valid source; unsupported actions are absent with a textual explanation.
- APP-03-AC04: Time labels cannot confuse retrieval, observation, validity, review and refresh dates.
- APP-03-AC05: Centre-point context never appears as local anchorage or whole-footprint evidence.
- APP-03-AC06: All forecast intervals and gaps remain accessible, including the departure contingency; unknown values remain unknown.
- APP-03-AC07: Price, availability, permission and approach state remain independently visible.
- APP-03-AC08: Provider source text cannot trigger an unsupported URL scheme or remove evidence through formatting.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-03-T01 / APP-03-AC01, APP-03-AC02 | Test-only assessment with one exclusion, 12 missing-evidence reasons and information. Open detail collapsed. | Excluded status and exclusion visible; group counts match; expanding reveals all reasons. |
| APP-03-T02 / APP-03-AC03 | Expired live data while offline; inspect available actions, then reconnect. | Offline refresh disabled/explained; reconnect makes actual refresh reachable. |
| APP-03-T03 / APP-03-AC04 | Old survey, recent retrieval, future validity end and absent review date. | Four distinct labels; no suggestion that survey became recent. |
| APP-03-T04 / APP-03-AC05, APP-03-AC06 | Real-shaped point forecast with 27 intervals and one gap; inspect local detail and expand source timeline. | Context-only label, all intervals including contingency, explicit gap and unknown gusts. |
| APP-03-T05 / APP-03-AC07 | Paid marina with tariff but unknown berth availability and unverified approach. | Cost visible independently; availability/approach remain unknown/unverified. |
| APP-03-T06 / APP-03-AC08 | Source URLs use javascript:, malformed https, valid https and tel. | Unsafe schemes blocked; supported links correctly labelled and only activated on user action. |
| APP-03-T07 / APP-03-AC01 | Source refresh removes selected place. | Existing recoverable selection state remains, with no stale “passes” detail. |

Run mobile typecheck/tests and web export. Pure mapper tests belong under src/lib/*.test.ts; execute the actual inspector journeys using QA-01's browser harness or record manual evidence before that runner lands.

## Delivery and boundaries

Deliver the mapper, grouped panels, tests and a small action-to-controller wiring table. Estimate 7 hours. No AI summarizer, new chart interpolation, inferred permissions, translated legal rules or replacement safety status. If domain output is contradictory, report it to SAFE-01 with the exact input/reason codes instead of repairing the decision in the UI.
