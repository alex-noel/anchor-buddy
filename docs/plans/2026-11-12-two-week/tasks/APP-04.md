---
id: APP-04
title: "Keep map markers, list ranks and selections consistent"
priority: P1
estimate_hours: 8
dependencies: [FOUNDATION-01, FOUNDATION-02, APP-01]
lane: app
expert_review: false
external_gate: null
---

# APP-04 — Keep map markers, list ranks and selections consistent

Implement one shared display projection for map markers and result cards. A selected result must remain identifiable when sorting, filtering, paging or switching views, without turning dense map content into a navigation claim.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Baseline and remaining gap

Read components/Chart.web.tsx, Chart.tsx, mapStyle.ts, ResultCard.tsx and the controller's assessment selectors. Both map renderers currently display the first 50 assessments. App.tsx now labels that cap and separates a manual pin from result counts, but prepending that pin changes the renderer's array indexes while list ranks remain unchanged. A list-selected result outside the first 50 can also lack a visible map marker. Marks and evidence labels are separate overlays and must stay independent from result filters.

Depth/seabed/marks toggles, world presets, map-based search selection and unit-aware web scales already exist. Do not rebuild them.

## Ownership and contracts

Own Chart.web.tsx, Chart.tsx, mapStyle.ts, ResultCard.tsx, MapLayersSheet.tsx and proposed lib/mapResultProjection.ts with tests. Preserve ChartProps compatibility through optional additions approved by FOUNDATION-02; publish the exact new prop contract to the integrator. App.tsx is read-only. APP-05 owns useChartStyle and map cache services. APP-07 owns shared UI primitives.

Accept ordered filtered assessments, selected identity and an optional unranked manual pin. Return stable marker IDs, optional display ranks, page metadata and a separately selected marker. Do not mutate Assessment or use rendered geometry for any domain computation.

## Instructions

1. Define stable identity using candidate/assessment IDs and dataset version where needed. Do not select by array index, display name or nearest map coordinate.
2. Assign list rank before injecting manual pins. A manual chosen pin uses a distinctive labelled symbol and no result rank. Normal generated suggestions retain their filtered-list identity.
3. Keep a bounded first page of 50 ordinary results. Add accessible previous/next page controls or an equivalent explicit “show next results on map” action. Counts must distinguish total filtered results, visible ranked markers and a separate manual pin.
4. Always render the selected result even if outside the current 50-result page, without duplicating it. Cap this exception at one additional result marker. A manual pin may add one further marker; document the maximum of 52 result/pin markers.
5. Selection from list or marker opens the same current detail. Switching views preserves identity. If filters hide the selected result, explain the hidden state or clear it deterministically; never select a different result with the same old rank.
6. Keep user camera gestures when only selection/style/units change. Explicit search-area change or “Show selected position” may move the camera. Respect reduced motion when available.
7. Make marker labels keyboard/screen-reader usable. Include place name, rank where applicable and assessment status. Do not rely on colour alone. Preserve source attribution and unit labels.
8. Explain layer types in the legend: reviewed analysis geometry, scientific display context and community marks. Toggles affect visibility only; hazard/exclusion checks continue unchanged. Do not add a route line.
9. Profile an actual dense result response and a permitted test-only 300-result dataset. Avoid remounting the entire map or rebuilding unchanged markers for every native-watch heartbeat.

## Acceptance criteria

- APP-04-AC01: Every normal marker rank equals its corresponding filtered-list rank; manual pins never shift these numbers.
- APP-04-AC02: Map paging exposes every filtered result and reports visible/total counts accurately.
- APP-04-AC03: A result selected from outside the current page remains visible once on the map with the correct identity.
- APP-04-AC04: Sorting/filtering cannot silently move selection to a different place; removed data follows the existing recoverable-selection behavior.
- APP-04-AC05: Web and native renderers consume the same projection and obey the 52-marker upper bound.
- APP-04-AC06: Layer changes never change assessment status, exclusions or result calculations.
- APP-04-AC07: Keyboard/accessibility users can select a marker or use its equivalent list action without colour-only cues.
- APP-04-AC08: Passive status updates do not reset the map camera, remount the map or produce unbounded marker growth.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-04-T01 / APP-04-AC01 | Three ranked marinas plus manual pin, sort by distance then price. | Same card/marker ranks in each ordering; manual pin unranked. |
| APP-04-T02 / APP-04-AC02, APP-04-AC05 | 123 test-only results; visit every page. | Pages cover 1–50, 51–100, 101–123 without missing/duplicated result IDs. |
| APP-04-T03 / APP-04-AC03, APP-04-AC05 | Select list result 83 while map page 1 is active. | Result 83 appears once in addition to the page; counts distinguish it. |
| APP-04-T04 / APP-04-AC04 | Select a marina, enable anchor-only filter, then refresh data removing that marina. | Explicit hidden/removed selection state; no substitution by index. |
| APP-04-T05 / APP-04-AC06 | Toggle all layers off and on with fixed engine inputs. | Assessment result hashes unchanged; only rendered layers differ. |
| APP-04-T06 / APP-04-AC07 | Keyboard-only web and VoiceOver/TalkBack native marker/list traversal. | Names/statuses announced and activation opens the intended result. |
| APP-04-T07 / APP-04-AC08 | Pan/zoom, then deliver 20 watch heartbeat updates and switch units. | Camera preserved, stable map instance and bounded marker count. |

Run mobile typecheck/tests, web export and native rendering checks on WATCH-01/02 builds when available. Record device/build and dense-response timings; do not invent a frame-rate claim from unit tests.

## Handoff and limits

Deliver projection helpers/tests, both renderers, an integration-props note and screenshots of a manual-pin/ranked-result pair. Estimate 8 hours. Do not add global point clustering, chart-derived navigation, custom vector tile generation or a new map provider. If MapLibre behavior differs by platform, keep the list fully usable and report the exact unsupported native behavior rather than simulating success.
