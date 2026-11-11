---
id: APP-02
title: "Make profile and default saves durable and recoverable"
priority: P0
estimate_hours: 8
dependencies: [FOUNDATION-01, FOUNDATION-02, APP-01]
lane: app
expert_review: false
external_gate: null
---

# APP-02 — Make profile and default saves durable and recoverable

Implement durable saves for vessel profiles, search defaults and display preferences. A user must be able to tell whether a change was committed, is still pending, or failed. A failed local write must not silently become a confirmed configuration on the next screen.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current baseline and intended change

Read App.tsx's persist, saveVessel, saveDefaults and finishSetup paths; lib/storage.ts, lib/storage.web.ts, lib/formDrafts.ts; components/Forms.tsx and components/Onboarding.tsx. Native storage uses SQLite rows; the web implementation uses localStorage. Single-key writes are atomic, but the current shell updates several in-memory fields before awaiting persistence and initial setup writes multiple keys sequentially. A quota error or process termination can leave partial configuration.

Do not redo the existing blank vessel form, zero bow-height handling, multi-seabed choices, duration control or input precision fixes. Build commit/recovery semantics around them.

## Ownership and interfaces

Own proposed lib/settingsRepository.ts and its tests, storage.ts/storage.web.ts transaction helpers, Forms.tsx and Onboarding.tsx save-state integration. Coordinate with APP-05 before modifying storage interfaces; APP-05 consumes them read-only. App.tsx and the APP-01 controller are wired only by the integrator. SettingsScreen.tsx is also an integration touch point: provide a prop/action wiring note rather than editing it concurrently.

Use FOUNDATION-02's approved version envelope and migration policy. SAFE-02 owns the equipment-guidance registry and selector; do not implement a competing selector or a freely entered “safe scope” field. You own only persistence and form integration of the approved selection.

## Technical requirements and instructions

1. Define a validated settings record containing schema version, vessel, search defaults, units, offline preference, layer defaults, supported language and configuration-confirmed flags. Preserve the existing database/storage prefix so installed data is found.
2. Implement one logical commit on both platforms. SQLite may use a transaction; web must use one versioned JSON record or a staged-record plus verified active-pointer design. Do not claim several localStorage writes form a transaction.
3. Read legacy vessel/preferences/default keys through a one-time, idempotent migration. Validate each input with domain validators and current read helpers. Missing/corrupt required profile data returns to incomplete setup; it must not receive plausible dimensions.
4. Write the new complete record before changing confirmed in-memory state or closing the form. Retain the user's draft after failure, show a concise error next to Save, and offer retry. Disable duplicate submissions while pending.
5. On successful profile changes, preserve the existing equipment-guidance invalidation rules and invalidate stale plan/watch suggestions through the controller. Do not stop the native service.
6. Keep cancellation side-effect free. Preference changes may be explicitly immediate only if the UI reports pending/error state and reverts after a failed commit; document the selected behavior.
7. Distinguish unsupported future schema from corrupt JSON. Preserve unreadable raw data for recovery, do not silently overwrite it, and show a safe reset/recovery action that identifies what would be removed.
8. Record storage errors without embedding raw vessel profiles, precise coordinates, tokens or arbitrary exception dumps in remote logs.

## Acceptance criteria

- APP-02-AC01: A successful Save produces one validated durable settings revision before the UI claims completion.
- APP-02-AC02: Storage failure leaves the old committed state intact and the edited draft available for retry.
- APP-02-AC03: Repeated Save clicks cannot create concurrent commits or duplicate completion actions.
- APP-02-AC04: Legacy migration is idempotent and preserves valid settings without inventing missing vessel data.
- APP-02-AC05: Interrupted setup cannot yield confirmed flags with absent or invalid vessel/default records.
- APP-02-AC06: Unsupported schema is recoverable and is not overwritten automatically.
- APP-02-AC07: Equipment/profile edits continue to invalidate dependent guidance and plan suggestions while native monitoring remains unchanged.
- APP-02-AC08: The Settings, onboarding and profile/default sheet controls use the same commit contract and expose accessible pending/error feedback.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-02-T01 / APP-02-AC01, APP-02-AC08 | Save a valid profile/default record in fresh native and web repositories; reopen. | Exact canonical values, confirmed flags and units return. |
| APP-02-T02 / APP-02-AC02 | Inject quota/disk failure before activation; save changed loaded draft. | Old loaded draft remains committed; form retains new value and Retry succeeds after fault removal. |
| APP-02-T03 / APP-02-AC03 | Hold commit unresolved and trigger Save twice. | One repository commit and one controller completion action. |
| APP-02-T04 / APP-02-AC04 | Load existing legacy keys including zero bow height and comma-decimal-derived canonical values; restart migration twice. | Values preserved; same new revision; no duplicate record or invented scope guidance. |
| APP-02-T05 / APP-02-AC05 | Interrupt after staging but before activation; restart. | Previous complete record or incomplete setup, never a partially confirmed profile. |
| APP-02-T06 / APP-02-AC06 | Store malformed JSON and a future-version envelope separately. | Clear recoverable states; neither silently becomes defaults nor overwrites original bytes. |
| APP-02-T07 / APP-02-AC07 | While bridge reports monitoring, change anchor design or usable rode length. | Guidance/plan suggestions invalidated; no native stop, arm or anchor movement. |

Run npm run typecheck --workspace=@anchor-buddy/mobile and npm run test --workspace=@anchor-buddy/mobile; export web after integration. Test repository adapters with injected failures and conduct one actual SQLite persistence round trip in the installed native build when available.

## Handoff and limits

Deliver migration design, repository contract, failure tests, wiring instructions and recorded storage-restart results. Estimate 8 worker-hours after APP-01. Exclude cloud sync, accounts, multi-vessel fleet management and wholesale storage replacement. If a migration could discard real user data, stop with a concrete recovery proposal; do not auto-delete to make a test pass.
