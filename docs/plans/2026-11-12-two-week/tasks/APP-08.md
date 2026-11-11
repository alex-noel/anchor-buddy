---
id: APP-08
title: "Complete native watch readiness and user handoff states"
priority: P0
estimate_hours: 8
dependencies: [FOUNDATION-01, FOUNDATION-02, APP-01, WATCH-01, WATCH-02]
lane: app
expert_review: true
external_gate: "Installed iOS/Android builds and a person able to verify audible alerts; simulated sound is not acceptance evidence."
---

# APP-08 — Complete native watch readiness and user handoff states

Implement the UI handoff from a reviewed plan or manual watch setup to native monitoring, with truthful permission, positioning, audible-test and service-health states. Keep watch operation entirely on the native side.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current baseline

Read screens/WatchScreen.tsx, PlannerScreen.tsx, components/Onboarding.tsx, modules/anchor-watch/src/types.ts, bridge.ts, validation.ts and modules/anchor-watch/README.md. The watch already has native-only availability, explicit anchor/radius confirmation, test-alarm requirement, latched alerts and verified-status polling. Browser builds already refuse monitoring. Planner GPS recently gained stale-response cancellation and stronger timestamp/coordinate checks.

Do not reproduce the native service or weaken those gates. The UI still needs physical-build permission/readiness verification and a consistent cancellation-safe capture path; WatchScreen's capture currently differs from the planner's fuller validation.

## Ownership and input contract

Own WatchScreen.tsx and proposed components/WatchReadinessPanel.tsx, lib/watchReadiness.ts and tests. PlannerScreen/Onboarding/App shell are read-only; provide agreed props and wiring notes to APP-06, APP-02 and the integrator. Swift/Kotlin, bridge protocol and native alert delivery belong to WATCH-01 through WATCH-04.

Use the frozen WatchStatus/permission result protocol. Do not infer a running service from local last-watch storage or a previously armed UI flag. Planning inputs are suggestions only; a planned swing radius must not arrive already confirmed as an alarm boundary.

## Technical steps

1. Define explicit view states: checking native capability, unavailable, permissions needed, position needed, radius needed, audible test needed, ready to arm, arming, monitoring, position uncertain, alarm, interrupted and status unverified. Resolve precedence from native status; a stale successful response must not overwrite a newer alarm.
2. Present a readiness checklist tied to actual bridge results. Explain which permission is missing and offer only the platform's supported Settings handoff. A denied permission returns to an editable setup; do not loop prompts automatically.
3. Share or consistently reuse capture validation with explicit caller bounds: the native manual watch permits ±90° latitude/±180° longitude under its existing bridge contract; map-planned positions remain limited to ±85° latitude. Require finite coordinates, finite nonnegative accuracy within 15 m, timestamp age no greater than 15 s and no more than 5 s in the future, matching the current planner tolerance. Add cancel/in-flight generation guards so manual edits, map input or unmount defeat late fixes. Do not narrow native latitude support merely because the map has a smaller extent.
4. Invalidate confirmations when the relevant anchor, radius, permissions, session or test freshness changes. A test command succeeding is not proof the person heard it; require separate audible confirmation. Consume the native testAlarmAt freshness contract (currently ten minutes), 10–10,000 m radius validation and bridge timing limits; do not introduce divergent UI-only safety thresholds.
5. Label supplied plan coordinates/rode/radius as proposed. Require recording/confirming the actual anchor position after arrival. Never automatically recenter from current GPS. Changing the alarm radius keeps the anchor fixed and requires confirmation.
6. Make active/unverified watch accessible from every primary tab. Search closure, profile changes and Saved navigation must not stop it. Stop is a separate explicit action with current native outcome shown.
7. Show last native contact, last positioning update, accuracy and alarm cause using human-readable units/time. If contact expires, replace Monitoring with status unverified even if the last native snapshot said monitoring.
8. Browser/unsupported builds show requirements only, without fake position, test sound or enabled Arm controls. No AI, internet request or JavaScript timer participates in boundary detection.
9. Keep readiness diagnostics local. Handoff/test evidence uses redacted session state and build/OS metadata; precise coordinates require explicit operator agreement before inclusion in shared artifacts. Do not add telemetry or a new location-export feature in this task.

## Acceptance criteria

- APP-08-AC01: Each bridge capability/permission/service state maps to a single truthful UI state; native uncertainty/alarm takes precedence.
- APP-08-AC02: Arm remains unavailable until actual position, radius, readiness and separate audible confirmation are valid and current.
- APP-08-AC03: Capture rejects stale/invalid fixes and late responses cannot overwrite newer user input.
- APP-08-AC04: Plan suggestions and historical logs never count as confirmed position, radius, test or active monitoring.
- APP-08-AC05: Editing/navigation cannot stop or recenter native watch; radius adjustment preserves anchor and uses explicit confirmation.
- APP-08-AC06: Stale native contact displays unverified status; resumed/restarted interrupted sessions require new readiness steps.
- APP-08-AC07: Unsupported browser builds expose no enabled fake monitoring/alarm workflow.
- APP-08-AC08: Physical-device readiness and audible behavior have recorded human observations, with muted/denied limitations explicit.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-08-T01 / APP-08-AC01, APP-08-AC02 | Deny notification/location permission, return from Settings, then grant supported permissions. | Correct explanation each time; Arm only after remaining explicit readiness steps. |
| APP-08-T02 / APP-08-AC02, APP-08-AC04 | Open from a plan with proposed point/radius; run test command but do not confirm hearing it. | Inputs remain unconfirmed and Arm disabled. |
| APP-08-T03 / APP-08-AC03 | Pending GPS request, manually edit longitude, then resolve old request; separately return NaN/future/stale fixes and latitudes 89°/91°. | New manual value retained; bad fixes rejected; a valid 89° native manual-watch fix is accepted while 91° is rejected. |
| APP-08-T04 / APP-08-AC01, APP-08-AC06 | Deliver newer alarm event while an older getStatus request is pending, then resolve old monitoring reply. | Alarm remains latched; old response ignored. |
| APP-08-T05 / APP-08-AC05 | Native session active: close search, edit boat, move across tabs, change radius after confirmation. | Same native anchor/session retained; only explicit radius command sent. |
| APP-08-T06 / APP-08-AC06 | Stop native heartbeat/process, then reopen app; repeat after device reboot. | UI unverified/interrupted, never falsely Monitoring; new test/confirmations required. |
| APP-08-T07 / APP-08-AC07, APP-08-AC08 | Open browser, then installed devices with sound muted/Focus or DND. | Browser cannot arm; native UI never promises audibility that the human did not verify. |

Run mobile typecheck/tests and the anchor-watch workspace tests. Use WATCH-01/02 builds and WATCH-04's physical trial matrix for device evidence. Tests may inject bridge responses only through test entry points; no production simulator or runtime synthetic fixes.

## Delivery and stop conditions

Deliver the readiness mapper, UI, race/failure tests, integration notes and device screenshots/results. Estimate 8 hours after native binaries are available. Do not implement critical-alert entitlements, background-location bypasses, automatic reboot start or new alarm algorithms. If native status contradicts the interface, retain the conservative unverified state and report the exact sequence to the WATCH owner; never “fix” it by trusting a persisted UI flag.
