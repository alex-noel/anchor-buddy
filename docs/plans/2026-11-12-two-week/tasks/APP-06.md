---
id: APP-06
title: "Persist anchor-plan drafts with explicit reassessment"
priority: P1
estimate_hours: 8
dependencies: [FOUNDATION-01, FOUNDATION-02, APP-01, APP-02]
lane: app
expert_review: false
external_gate: null
---

# APP-06 — Persist anchor-plan drafts with explicit reassessment

Implement explicit Save plan and Resume plan behavior for locally planned anchor positions. Treat a saved plan as user intent and dated evidence references, never as permission to arm a watch or as a previously verified safe location.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current state

Read screens/PlannerScreen.tsx, SavedScreen.tsx, lib/workspace.ts and the controller contract from APP-01. Saved searches already preserve a manual selectedPosition, filters, a dated result snapshot and pack identity. Reopening reassesses with the current vessel. Expired stays now require explicit new-date review. Planner currently owns edited coordinates, optional deployed rode and arrival checkboxes in component state; leaving/restarting the app can lose that draft.

Do not duplicate saved-search behavior or restore arrival confirmations from an old stay.

## Ownership and proposed contract

Own PlannerScreen.tsx, SavedScreen.tsx, proposed lib/savedPlans.ts/tests and a focused proposed PlanDraftRepository using APP-02's persistence interface. App.tsx/controller integration is performed by the integrator. APP-05 owns cache-management UI and services; add its agreed panel slot without changing its logic. Domain/native modules and watch logs are read-only.

FOUNDATION-02 must approve a versioned SavedPlan record. Minimum fields: stable id, user name, created/updated timestamps, selected position, planned rode in canonical metres or absent, search preferences/stay, depth-alternative allowance, vessel identity/revision fingerprint and source pack id/version references. Do not embed a trusted live Assessment, raw provider credentials, “monitoring=true”, confirmed-anchor state or arrival acknowledgments.

## Technical instructions

1. Add an explicit Save plan action beside the planner's editing controls. State clearly that planned coordinates/rode are drafts; the user must confirm actual deployment separately at arrival.
2. Validate coordinates, rode, date bounds and maximum supported record count before saving. Limit plans to 30 records initially, matching the scale of existing saved searches; when full, offer named replacement/deletion instead of silent eviction.
3. Save only after persistence succeeds. Keep unsaved edits after failure. When leaving an edited plan, offer Save, Discard or Keep editing without blocking access to an active watch. The watch remains accessible and independently running.
4. Resume by loading the draft and recomputing against current boat and data. Show a material-change notice when the vessel fingerprint, pack version, stay dates or equipment guidance differs. Never automatically apply older boat dimensions.
5. If dates elapsed, propose the preserved duration at a new future window and require explicit confirmation. A new stay clears prior deployed/actual assertions; the planned rode may be retained only as a clearly labelled proposal that requires user review.
6. Reset all arrival checkboxes and anchor/radius/test confirmations on every resume, vessel change, material position/rode change or new stay. No saved plan may issue a native watch command.
7. Separate Saved sections for search snapshots, plan drafts, display maps and source evidence. A plan's source references may be missing/expired; show that and allow review without fabricating the data.
8. Keep deletion scoped: deleting a plan removes that draft only. Retain maps, searches and watch logs. Do not store a generated derived radius as a confirmed alarm radius.

## Acceptance criteria

- APP-06-AC01: Save plan persists a validated versioned draft with canonical inputs and source/vessel references.
- APP-06-AC02: Save failure keeps the user's edits and old saved revision; duplicate clicks do not duplicate records.
- APP-06-AC03: Unsaved navigation offers explicit choices while the watch remains reachable.
- APP-06-AC04: Resume always reassesses with current vessel/data and identifies material changes.
- APP-06-AC05: Elapsed stays require reviewed new dates; no past arrival or confirmation silently carries into a new stay.
- APP-06-AC06: Every resumed plan has empty arrival/watch confirmations and cannot arm/recenter/stop native monitoring.
- APP-06-AC07: Missing or expired source packs remain visible as missing/expired, not a restored “passes” result.
- APP-06-AC08: The 30-plan limit and named deletion are deterministic and do not remove unrelated local assets.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-06-T01 / APP-06-AC01, APP-06-AC04 | Plan coordinates and 40 m rode, save, terminate/reopen app, resume. | Same planned values restored; fresh assessment produced with current input versions. |
| APP-06-T02 / APP-06-AC02 | Fail persistence while saving edited coordinates; retry twice rapidly after recovery. | Draft retained; one successful revision; no duplicate plan. |
| APP-06-T03 / APP-06-AC03, APP-06-AC06 | Dirty planner while native bridge reports monitoring; navigate to watch then back. | Watch reachable without stopping; draft still recoverable; no automatic native command. |
| APP-06-T04 / APP-06-AC04, APP-06-AC07 | Save with vessel A/pack 1; change draft/rode on vessel and delete pack 1; resume offline. | Material-change notice and insufficient evidence; old assessment not treated as current. |
| APP-06-T05 / APP-06-AC05, APP-06-AC06 | Resume an elapsed stay whose old checkboxes were complete. | Date review required; all arrival/watch confirmations false; planned rode explicitly requires review. |
| APP-06-T06 / APP-06-AC08 | Store 30 drafts; save a 31st, cancel replacement, then delete one named draft. | No silent loss; only confirmed named plan removed; maps/searches remain. |
| APP-06-T07 / APP-06-AC01 | Feed future-schema, corrupt, NaN or out-of-range records through reader. | Safe recoverable rejection; invalid draft never reaches assessment or native arm. |

Run mobile typecheck/tests, web export, QA-01 saved-plan browser flow and one real SQLite restart flow on a native build. Repository tests must cover interrupted activation, not just JSON serialization.

## Deliverables and exclusions

Deliver record schema/migration note, repository, planner/saved UI, tests and exact controller wiring instructions. Estimate 8 hours after APP-02. No automatic background draft upload, shared plans, booking, calendar integrations, “safe” location certification or resumed watch sessions. If FOUNDATION-02 cannot approve the record contract, implement the reader/test design and report the blocked write contract instead of inventing a parallel schema.
