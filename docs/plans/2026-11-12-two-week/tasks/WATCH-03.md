---
id: WATCH-03
title: "Execute identical watch scenarios against native engines"
priority: P0
estimate_hours: 16
dependencies: [FOUNDATION-02, WATCH-01, WATCH-02]
lane: watch
expert_review: true
external_gate: null
---

# WATCH-03 — Execute identical watch scenarios against native engines

## User instruction

Add executable Swift and Kotlin tests for the watch's state transitions, persistence and alert latching, and compare their normalized results with the existing TypeScript reference kernel. Use controllable clocks and location inputs inside test targets only. Do not expose a production position injector, simulator toggle or remote watch-control endpoint.

**Estimate:** 14–18 worker-hours. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-02's recorded fingerprint of the existing watch contract and successful WATCH-01/WATCH-02 build paths. Preserve `modules/anchor-watch/src/types.ts` and `modules/anchor-watch/src/validation.ts`; FOUNDATION-02 records their identity rather than redesigning the protocol. Contract/test-vector design may begin before both builds finish. Final parity acceptance requires actual native runners built against the same integrator-approved protocol revision and completed WATCH-01/02 build evidence. Reserve both native module directories only after the platform build workers release them; do not edit their files concurrently.

## Baseline and file ownership

Current production engines live in `modules/anchor-watch/ios/AnchorWatchModule.swift` and `android/src/main/java/expo/modules/anchorwatch/WatchRuntime.kt`, with platform services/notifications alongside them. Tests in `modules/anchor-watch/src/{kernel,simulator,bridge}.test.ts` use the reference implementation under `src/testing/`; they do not execute CoreLocation or an Android service. `src/types.ts` defines six states and the observable status contract. Existing arming validation requires confirmations, recent test alarm, fixed coordinates and bounded radius/position accuracy.

Own proposed native test targets/source sets, `modules/anchor-watch/tests/vectors/**`, small dependency-injection seams in native engines, and proposed native test scripts. The integrator owns and approves shared TypeScript protocol changes; submit a proposed amendment with cross-platform compatibility evidence rather than editing that protocol independently. `src/testing/kernel.ts` changes require review and must not simply be altered to match a native defect. Keep UI, domain assessment and provider code read-only.

## Requirements and ordered work

1. Define a versioned, test-only scenario format: initial persisted state, wall/monotonic time, permissions, alarm-test event, explicit arm options, fixes, clock ticks, acknowledge/radius/stop events, and expected normalized state after each event. Include fixture intent and contract version. Each scenario must name the requirement it proves.
2. Separate deterministic boundary/state logic from platform adapters only as far as needed to execute it. Inject a clock, persistence fake and notification sink in test targets; production constructors always bind real implementations. Preserve platform location timestamp handling rather than pretending wall and monotonic time are interchangeable.
3. Implement three runners over the same scenario files: TypeScript reference, Swift XCTest and Kotlin JVM/instrumented tests as appropriate. Use actual native source code for decisions. Platform callback wiring remains covered by integration/device tests, not by a port of the reference kernel in a test file.
4. Normalize generated IDs and human-readable message text; compare states, active flags, anchor/radius, health, last usable fix, alert kinds/order/acknowledgment and interruption behavior. Compare finite distances with a documented tolerance, initially 0.5 m unless the frozen contract defines a stricter supported tolerance. Do not normalize away disagreement about boundary classification.
5. Cover fully inside, accuracy circle touching/overlapping boundary, fully outside, repeated boundary events, good-fix recovery before/after acknowledgment, stale/future/out-of-order fixes, wall-clock jumps, permission loss, provider loss, restart and corrupt stored state. Test radius edits and all invalid options directly through the native boundary.
6. Verify bounded logs (current target: last 100 alerts), idempotent cleanup and no implicit arming during status/subscription/reload. Include native notification-sink failure: failed test delivery must not create a valid fresh alarm-test timestamp.
7. Add a release-artifact inspection that proves test vectors/injection entry points and test-only simulation code cannot be called from the production bridge. Preserve the existing runtime-import guard and add a native equivalent where needed.

## Acceptance criteria

- **WATCH-03-AC01:** The same versioned scenario corpus executes against TypeScript, actual Swift decision code and actual Kotlin decision code.
- **WATCH-03-AC02:** All normalized safety-relevant states and alert transitions agree; tolerated numeric differences are declared and bounded.
- **WATCH-03-AC03:** A fixed confirmed anchor never changes except through a new explicit session; radius changes require confirmation and immediate reevaluation.
- **WATCH-03-AC04:** Stale/invalid fixes, permission loss and persistence corruption cannot produce healthy monitoring or auto-resume.
- **WATCH-03-AC05:** Alarm tests and latching/acknowledgment behave correctly when delivery fails or a problem is still present.
- **WATCH-03-AC06:** Production artifacts contain no callable injection/simulation API, and runtime guards continue to pass.
- **WATCH-03-AC07:** Native-test commands return nonzero on a deliberately introduced expectation mismatch and produce machine-readable results.

## Test cases

| ID | Setup/action | Expected result / AC |
| --- | --- | --- |
| WATCH-03-T01 | Confirm anchor/radius, fresh test; replay inside → overlap → fully outside. | Arming/monitoring → uncertainty → latched boundary alert consistently; AC01–02. |
| WATCH-03-T02 | Boundary alert, then acknowledge while still outside; later supply good fix. | No false healthy state while problem persists; recovery follows contract; AC02, AC05. |
| WATCH-03-T03 | Replay old/future fixes and backward/forward wall-clock jumps while monotonic time advances. | Freshness cannot be extended by wall-clock changes; invalid samples never clear alert; AC04. |
| WATCH-03-T04 | Arm, edit radius with confirmation false/true, read status repeatedly. | First rejected; second reevaluates current fix; anchor identical throughout; AC03. |
| WATCH-03-T05 | Persist active/corrupt session and recreate native runtime. | Interrupted or safely rejected state, never restored healthy monitoring; AC04. |
| WATCH-03-T06 | Notification sink throws on test; attempt arm; generate >100 alerts. | No valid test stamp from failed delivery; bounded deterministic log; AC05. |
| WATCH-03-T07 | Build release-capable app and inspect bridge symbols/import manifest; alter one vector expectation and rerun test. | No injection path in runtime; test process detects mismatch; AC06–07. |

Existing checks: `npm test --workspace=@anchor-buddy/anchor-watch`, `npm run check:runtime`. Native XCTest/Gradle runner commands and a combined parity command are **new deliverables**; derive their exact target names from WATCH-01/02 artifacts and document them. These tests do not establish actual alarm audibility or overnight scheduling.

## Handoff/non-goals

Deliver vector schema/corpus, three runners, machine-readable comparison report, production-artifact exclusion proof and regression fixes. Escalate contract disagreements to the integrator; do not average classifications or relax margins to make tests match. Do not add server/AI watch control, background-start workarounds, or claim device reliability from deterministic test results.
