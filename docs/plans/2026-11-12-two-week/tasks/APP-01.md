---
id: APP-01
title: "Extract the workspace controller without changing behavior"
priority: P0
estimate_hours: 12
dependencies: [FOUNDATION-01, FOUNDATION-02]
lane: app
expert_review: true
external_gate: null
---

# APP-01 — Extract the workspace controller without changing behavior

Implement a small, tested workspace controller so subsequent workers can extend independent screens without repeatedly editing the same application shell. Preserve the current user journey and safety behavior. This is a structural task, not a redesign.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current baseline and outcome

Read apps/mobile/src/App.tsx, lib/workspace.ts, lib/selectionAssessment.ts, lib/useEvidenceRefresh.ts and docs/controls-audit-2026-11-11.md. App.tsx is approximately 1,942 lines and currently owns navigation, independent modal flags, draft state, selected pins, evidence loading, local writes and native-watch status. The November audit already fixed cancelled saved-search metadata, stale detail selection, manual pins, profile changes and watch suggestions. Preserve those fixes.

The outcome is an explicit transition model and small effect adapters. Do not add Redux or another state framework merely to move code. A pure reducer with typed actions plus focused hooks is sufficient.

## Ownership and dependency contract

You exclusively edit App.tsx during this task and create proposed lib/workspaceController.ts, lib/workspaceController.test.ts and lib/useWorkspaceController.ts. Existing storage, native bridge, assessment engine, provider response types and screen implementations are read-only. Obtain FOUNDATION-02's frozen payload versions before defining persisted or cross-package types.

After merge, the designated integrator is the sole editor of App.tsx. APP-02 through APP-08 supply components, controller actions and a wiring note; they must not independently merge conflicting shell edits. Record the exported controller actions/selectors in an adjacent contract document or typed interface.

## Technical instructions

1. Inventory current state and write a transition table covering empty Explore, active search, map preview, search draft, detail, plan, watch and blocking setup. Distinguish screen navigation from the independently running native watch.
2. Introduce a discriminated modal state so mutually exclusive edit sheets cannot accidentally coexist. Preserve intentional parent setup plus child profile/default editing through an explicit parent-return field, not two unrelated booleans.
3. Move pure navigation/draft/selection transitions into the reducer. Do not persist React component instances, callbacks, AbortControllers or assessment objects as application identity.
4. Keep effects in adapters: storage commits, latest-request-wins source fetches, assessment recomputation and native status subscriptions. Request generations must ignore late completion after cancellation, region change or unmount.
5. Recompute derived counts, details and filtered results from the same active inputs. Keep manual pins outside filtered-result counts. Preserve the original search while an edit draft is cancelled.
6. Capture an immutable search/boat/data-version input tuple for each assessment run. Never mix an old request's region metadata with a newer search.
7. Define public actions for commitProfile, begin/commit/cancelSearch, open/closeDetails, openPlan, showWatch, open/closePreview and saved-search reopening. Names are proposed; settle them once in the contract and use them consistently.
8. Keep native monitoring untouched by route changes, search closure, cache refresh or controller teardown. Reading/subscribing to status must not arm, stop or recenter.
9. Wire the existing screens back through the controller, then compare the current walkthrough before any other feature task changes those screens.

## Acceptance criteria

- APP-01-AC01: The transition table covers every currently reachable screen and modal; illegal action/state combinations are explicit no-ops or visible recoverable errors.
- APP-01-AC02: App.tsx delegates navigation and request lifecycle to the new controller; no second source of truth for active search, draft or selected pin remains.
- APP-01-AC03: Cancelling a draft leaves prior search, filters, pin, area label and timezone unchanged.
- APP-01-AC04: Late source responses cannot replace newer search data or update state after unmount.
- APP-01-AC05: Closing a search, changing tabs and editing the vessel never invoke native stop or arm.
- APP-01-AC06: Initial setup, tour, map/list, source inspection, planning, save/reopen and watch requirements preserve their current behavior.
- APP-01-AC07: Controller tests exercise real transition boundaries, not snapshots of implementation internals.
- APP-01-AC08: The integration contract lists action payloads, ownership and effect responsibilities so later workers need not infer them.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-01-T01 / APP-01-AC01, APP-01-AC03 | Start an active search with pin A; open a saved expired stay B, change draft fields, cancel. | Original search A, pin and filters remain byte-equivalent. |
| APP-01-T02 / APP-01-AC04 | Use controlled deferred test promises; request A, request B, resolve B then A. | Only B reaches active state; A cannot write its active-region pointer. |
| APP-01-T03 / APP-01-AC05 | Provide a bridge spy reporting monitoring; close search, switch tabs and replace profile. | Status remains monitoring; zero arm/stop/recenter commands. |
| APP-01-T04 / APP-01-AC01, APP-01-AC06 | Fresh local store; configure boat, edit defaults, cancel a child sheet, finish setup. | Returns to correct parent; Explore remains empty until a submitted search. |
| APP-01-T05 / APP-01-AC02, APP-01-AC06 | Filter marinas, add a manual pin, switch map/list and reopen detail. | Counts agree and exclude the manual pin; detail uses the same current assessment. |
| APP-01-T06 / APP-01-AC04 | Begin fetch, close search or unmount, then resolve the fetch. | No active-search resurrection, state update or unintended cache activation. |
| APP-01-T07 / APP-01-AC07, APP-01-AC08 | Have a second worker enumerate every exported action and legal transition using only the contract; compare against tests. | Each action has an input/output definition and a behavioral test; no undocumented shell-only transition is required. |

Run npm run typecheck --workspace=@anchor-buddy/mobile, npm run test --workspace=@anchor-buddy/mobile and npm run export:web --workspace=@anchor-buddy/mobile. New tests must be included by the existing lib/*.test.ts script. Use QA-01's browser runner when available; otherwise record the manual walkthrough separately.

## Handoff and stop conditions

Deliver the reducer/adapter, transition table, integration contract, passing command logs and before/after walkthrough notes. Budget 12 worker-hours after the foundation contract gate plus integrator review; do not widen the extraction into unrelated rendering changes. Stop and ask the integrator if the extraction requires a domain schema or native protocol change. Do not weaken a guard to preserve a formerly accidental UI behavior; document the discrepancy for review.
