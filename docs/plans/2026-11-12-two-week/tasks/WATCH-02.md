---
id: WATCH-02
title: "Compile Android and verify foreground-service integration"
priority: P0
estimate_hours: 12
dependencies: [FOUNDATION-01, FOUNDATION-02]
lane: watch
expert_review: true
external_gate: "Supported JDK, Android SDK/emulator and an available physical device for later acceptance."
---

# WATCH-02 — Compile Android and verify foreground-service integration

## User instruction

Build and launch the actual Android application, fix compilation/integration failures in the existing Kotlin anchor watch, and verify that the location foreground service starts only through an explicit visible-app action. Preserve honest interruption, permission and notification behavior. A web preview or Hermes export does not satisfy this task.

**Estimate:** 10–14 worker-hours, excluding Android SDK downloads. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-01 and FOUNDATION-02. Can run alongside WATCH-01 because platform source ownership is separate. WATCH-03 and WATCH-04 consume your results.

## Baseline and permitted files

Read `modules/anchor-watch/android/build.gradle`, `android/src/main/AndroidManifest.xml`, `android/src/main/java/expo/modules/anchorwatch/{AnchorWatchModule,AnchorWatchService,WatchRuntime,WatchNotifications}.kt`, the shared `src/types.ts`/`validation.ts`, `app.plugin.js`, `apps/mobile/app.json`, and the native-watch README. The current service is deliberately `START_NOT_STICKY`, non-exported and not boot-restored. It uses GPS location callbacks and native heartbeat processing; notification channel checks gate arming. The prior environment lacked a configured Android SDK and had Java 11, which is not the documented project toolchain.

Own Android module files, proposed `scripts/native/verify-android.*`, and `docs/native/android-build.md`. Generated `apps/mobile/android/**` is disposable diagnostic output. Shared plugin, app configuration, package manifests/lockfile, TypeScript bridge and application screens stay read-only unless the integrator transfers ownership. Report required shared patches instead of conflicting with the iOS worker.

## Implementation requirements

1. Record host, JDK, SDK platform/build tools, emulator/API image, Gradle wrapper and Android Gradle Plugin versions actually used by the locked Expo project. Use the project-supported JDK/toolchain, initially JDK 17 as recorded in the README; verify instead of blindly upgrading the dependency stack.
2. Install locked dependencies and generate/compile a debug Android app. Fix Kotlin/Expo incompatibilities, manifest merging and service registration in maintained source/plugin configuration. Keep MapLibre and SQLite linked; removing native modules is not a valid fix.
3. Inspect the merged manifest. Require one non-exported location service, foreground-service/location permissions and required runtime location/notification declarations. Do not add broad background-location access, exact alarms, accessibility services, boot startup or battery-optimization exemptions as a shortcut.
4. Start a watch only from the app's explicit foreground arming action after permission and real native test-alarm checks. Check service-start exceptions and activity state at the boundary. If the activity backgrounds during permission/arming, return an actionable failure rather than claiming monitoring. Current Android background-start restrictions must be respected; document tested API levels.
5. Verify persistent service and alarm channels independently. A service notification is not proof of audible alarms. Approximate-only location, GPS disabled, notification denial or unusable alarm-channel settings must not produce a healthy watch indicator. Preserve the fixed anchor and native freshness/accuracy checks.
6. Exercise service detachment, activity recreation, JavaScript disconnect, process termination and relaunch. Monitoring can continue when only the activity/JavaScript disappears if the OS service remains alive; a killed service cannot be recovered from a stored boolean. Explicit stop must remove location listeners, heartbeat callbacks and ongoing notification.
7. Document debug APK installation and capture redacted logcat/build output. Never commit keystores, passwords, device serials, precise live tracks or generated native folders. Supply an unsigned/reproducible internal build; distribution signing is separate.

## Acceptance criteria

- **WATCH-02-AC01:** A clean supported toolchain compiles and installs an actual debug APK, with recorded commit and API levels.
- **WATCH-02-AC02:** The installed app reports native availability through the real module; no JavaScript simulator replaces it.
- **WATCH-02-AC03:** Merged manifest and service startup obey declared location-service requirements, with no exported or boot-started watch service.
- **WATCH-02-AC04:** Missing precise location, disabled GPS, denied notifications or disallowed foreground startup prevent arming and do not claim monitoring.
- **WATCH-02-AC05:** Native state continues independently of JavaScript while the actual service remains running; fixed anchor/radius do not change implicitly.
- **WATCH-02-AC06:** Service/process death is reported as interrupted on reopening; explicit stop releases callbacks/listeners and notification resources.
- **WATCH-02-AC07:** Regeneration reproduces integration fixes, with no signing secrets or private device data in tracked artifacts.

## Test cases

| ID | Setup and action | Expected result / AC |
| --- | --- | --- |
| WATCH-02-T01 | Clean checkout/toolchain; build and install on a recorded emulator. | Successful APK, module loads, idle status; AC01–03. |
| WATCH-02-T02 | Grant coarse location only, or disable GPS, then arm. | Clear failure; no service represented as healthy; AC04. |
| WATCH-02-T03 | Deny notification permission or disable alarm-channel sound; request test/arm. | Relevant readiness check fails; no fabricated audible-test completion; AC04. |
| WATCH-02-T04 | Start from visible app, then background activity and disconnect Metro. | Native service status/timestamps continue when the OS allows execution; no anchor change; AC05. |
| WATCH-02-T05 | Background the activity while an arming request is pending. | Disallowed start fails cleanly; no uncaught service-start exception or false monitoring; AC03–04. |
| WATCH-02-T06 | Force-stop and relaunch; separately arm then use Stop. | First case interrupted, second idle with resources released; neither auto-arms; AC06. |
| WATCH-02-T07 | Regenerate native project and rebuild from maintained configuration. | Same permissions/service registration and no undocumented manual patch; AC07. |

Existing commands: `npm run android --workspace=@anchor-buddy/mobile`, `npm run typecheck --workspace=@anchor-buddy/anchor-watch`, `npm test --workspace=@anchor-buddy/anchor-watch`. After generation, record the actual wrapper task (for example the generated project's `assembleDebug` task if present) and emulator-install command. A new verification script must document its assumptions and fail on missing toolchain components.

## Deliverable and blockers

Return the build artifact location, redacted logs, merged-manifest evidence, API-level matrix and AC/test results. If hardware is unavailable, simulator checks remain simulator checks. Do not weaken platform policies or label an untested OEM battery mode supported. Play Store submission, release keystores and overnight watch approval are not in scope.

References checked 2026-11-11: [Android location foreground-service requirements](https://developer.android.com/develop/background-work/services/fgs/service-types#location), [background startup restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start), and [Expo local builds](https://docs.expo.dev/guides/local-app-development/). The implementation must start its location service from a visible activity and validate the installed target SDK's rules.
