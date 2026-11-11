---
id: WATCH-01
title: "Compile and integrate the actual iOS watch"
priority: P0
estimate_hours: 12
dependencies: [FOUNDATION-01, FOUNDATION-02]
lane: watch
expert_review: true
external_gate: "Full Xcode/iOS SDK and CocoaPods; physical installation additionally needs an existing signing identity and device."
---

# WATCH-01 — Compile and integrate the actual iOS watch

## User instruction

Build Anchor Buddy as an actual iOS development application and fix the native integration issues that prevent its existing anchor-watch module from compiling, loading, and returning truthful status. Produce a reproducible simulator build and a device-install procedure. Do not treat a JavaScript export, Swift syntax check, or Expo Go session as completion of this task.

**Estimate:** 10–14 worker-hours, excluding toolchain downloads and device/signing waiting. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-01 baseline and FOUNDATION-02's recorded fingerprint of the existing watch contract. Preserve `modules/anchor-watch/src/types.ts` and `modules/anchor-watch/src/validation.ts`; FOUNDATION-02 records their identity rather than redesigning the protocol. The integrator owns and approves any shared protocol change. WATCH-02 may run concurrently. WATCH-03 consumes the build result. Physical overnight acceptance belongs to WATCH-04. Final build acceptance uses the integrator-approved protocol revision and exact shared plugin/app configuration included in the compiled artifact.

## Current baseline and ownership

Read `modules/anchor-watch/README.md`, `modules/anchor-watch/src/types.ts`, `src/bridge.ts`, `src/validation.ts`, `modules/anchor-watch/ios/AnchorWatchModule.swift`, `AnchorWatch.podspec`, `modules/anchor-watch/app.plugin.js`, `apps/mobile/app.json`, and `apps/mobile/package.json`. The existing implementation uses CoreLocation, local notifications, persisted interruption state and the Expo module bridge. The podspec declares iOS 16 and Swift 5.9; determine the effective supported deployment target from the installed Expo dependency graph rather than assuming that declaration is sufficient. Previous verification produced Hermes bundles, not an Xcode binary.

You may edit `modules/anchor-watch/ios/**`, proposed `scripts/native/verify-ios.*`, and a proposed `docs/native/ios-build.md`. Generated `apps/mobile/ios/**` may be changed locally for diagnosis but must not become the durable source of configuration fixes. Do not edit Android, shared TypeScript watch contracts, `App.tsx`, dependency lockfiles, `app.json`, or the shared plugin without the integrator's ownership transfer. Supply the smallest required shared-file patch in your handoff; the integrator applies it once.

## Technical requirements and implementation steps

1. Record baseline commit, host architecture, macOS, Node/npm, full Xcode, selected SDK, CocoaPods and Ruby versions. Check that `xcode-select -p` identifies full Xcode. If the toolchain is missing, document the exact missing component; do not label the task complete.
2. From the assigned isolated checkout, install the locked dependencies with `npm ci`. Generate the iOS project through the supported Expo flow. Never run destructive prebuild cleanup against uncommitted native work; use a disposable generated directory/checkpoint.
3. Compile the complete application for an available simulator. Fix Swift/Expo API, imports, availability checks, pod resolution, linker or generated-capability errors in source/plugin configuration. Do not remove watch code or replace it with a stub to obtain a green build.
4. Inspect the generated application: local module is autolinked once; location usage descriptions and background-location mode exist once; notification delegate forwarding does not break other Expo consumers. Keep the current explicit Always/Precise permission requirement; any proposed shared protocol change requires the integrator's explicit review and approval. Do not migrate to a new location API solely because newer documentation shows it.
5. Launch the compiled application. Verify `getStatus()` returns `nativeAvailable: true` and an idle/interrupted state supported by actual process state. Reading/subscribing must never arm, move, stop, or acknowledge a watch. Verify one listener receives one event, unsubscribe works, and remounting does not create duplicate location managers.
6. Exercise denied, temporary and adequate permissions with available simulator controls. Keep alert-test success distinct from a human confirming audibility. Preserve native validation for finite coordinates, radius, freshness and confirmations; keep `interrupted` on restart instead of silently resuming a persisted armed flag.
7. Document physical-device installation using an already available signing identity. Do not create an Apple account, purchase membership, commit a signing profile/certificate, or accept new account agreements. Store build logs and device identifiers privately; commit only redacted results and reproducible commands.

## Acceptance criteria

- **WATCH-01-AC01:** A clean, locked install produces a successful full iOS simulator application build; the report identifies its commit and exact toolchain.
- **WATCH-01-AC02:** The compiled app loads the real local watch module and reports `nativeAvailable: true`; no simulator implementation is imported into runtime.
- **WATCH-01-AC03:** Generated background/location configuration and module registration are present once and survive regeneration.
- **WATCH-01-AC04:** Insufficient permission and invalid arming input fail with actionable errors, without starting native monitoring.
- **WATCH-01-AC05:** Reading status, subscribing and UI remounting do not mutate the fixed anchor/session or duplicate processing.
- **WATCH-01-AC06:** Relaunching after process termination cannot report a persisted session as monitoring without verified native activity.
- **WATCH-01-AC07:** Durable fixes live in maintained source/configuration, and no credentials or generated signing artifacts are tracked.

## Test cases

| ID | Setup and action | Expected result / AC |
| --- | --- | --- |
| WATCH-01-T01 | Fresh assigned checkout, locked install, generate and compile for a recorded simulator. | Actual `.app` produced with successful compiler/linker exit; AC01–03. |
| WATCH-01-T02 | Launch the compiled app and read status twice before arming. | Native available, idle/interrupted, unchanged anchor/session; AC02, AC05. |
| WATCH-01-T03 | Deny location or notifications, then attempt native arming with otherwise valid input. | Rejection and no running watch; permission explanation visible; AC04. |
| WATCH-01-T04 | Subscribe/unsubscribe repeatedly, navigate away/back and read status. | No duplicate events/managers and no watch-control side effects; AC05. |
| WATCH-01-T05 | Persist a genuinely armed development session, terminate and relaunch. | Interrupted/unverified status until explicit new confirmation and arming; no auto-recentre; AC06. |
| WATCH-01-T06 | Regenerate native project from maintained configuration in a second disposable build directory. | Same capabilities and module availability; no manual generated-project fix required; AC03, AC07. |

Existing commands: `npm run typecheck --workspace=@anchor-buddy/anchor-watch`, `npm test --workspace=@anchor-buddy/anchor-watch`, and `npm run ios --workspace=@anchor-buddy/mobile`. Capture the generated workspace/scheme and exact successful `xcodebuild` invocation in the report; do not invent a scheme name in advance. Any `scripts/native/verify-ios.*` command is a **new deliverable**, not an existing command.

## Handoff and stop conditions

Deliver source fixes, redacted compiler logs, generated-capability inspection, a launch screenshot, AC/test matrix and device-install steps. Mark device installation separately as not run if signing or hardware is unavailable. Escalate shared-contract changes and OS restrictions rather than weakening them. App Store distribution, critical-alert entitlement, overnight reliability claims and on-water approval are non-goals.

References checked 2026-11-11: [Expo local compilation](https://docs.expo.dev/guides/local-app-development/) distinguishes native compilation from Metro; [Apple background location](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background) documents background capability and lifecycle considerations. Recheck SDK-specific details when executing.
