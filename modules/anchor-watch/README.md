# Anchor watch native module

An Expo local module for a supplemental anchor watch. An iOS or Android development build is required. Expo Go and web never silently substitute JavaScript monitoring. `enableSimulation()` explicitly enables an in-memory, foreground-only replay harness; every simulated status carries `simulation: true` and `nativeAvailable: false`.

The device evaluates the full alarm circle from the fixed, user-confirmed anchor. It never recentres automatically. This radius is an alarm setting, not a calculation of available anchoring space. The app must independently review the rode/swing footprint and arrival checklist.

```ts
import * as Watch from '@anchor-buddy/anchor-watch';
const permissions = await Watch.requestPermissions();
if (!permissions.canArm) return; // Show the returned permission explanation and OS settings link.
await Watch.testAlarm();
// After the user confirms hearing the test, the physical anchor position and arrival checklist:
await Watch.arm({ anchor: { latitude: 24.55, longitude: -81.8 }, radiusM: 90,
  anchorConfirmed: true, checklistConfirmed: true, testAlarmConfirmed: true });
const remove = Watch.subscribe(status => updateUI(status));
// Re-read getStatus() on every foreground/resume. Do not infer liveness from stored UI state.
```

Include `../../modules/anchor-watch/app.plugin.js` in the app's Expo plugins. The workspace dependency provides Expo autolinking; the plugin adds iOS location background mode and usage descriptions, and the Android location foreground-service permissions. Android foreground location is sufficient for a service explicitly started while the app is visible; the module does not request unrestricted background location or start itself at boot. iOS requires precise Always authorization. The user may need to grant Always in Settings after the initial prompt.

Native state and its last 100 alert records are retained in app-private preferences. Precise anchor and location data stay on the device. A stopped or restarted native process cannot recover an active session from an armed flag: the previous session is reported as `interrupted`, requiring a new test and explicit arming. In-process health checks use monotonic elapsed time. Android uses location elapsed-realtime timestamps; iOS accounts for sample age at receipt. A fresh position whose accuracy circle reaches the boundary is uncertain; a position wholly beyond it raises a boundary alarm. Both alarms latch until acknowledged; acknowledgment cannot clear a still-present problem.

`serviceRunning` verifies this native process/service only. It is not evidence that the phone will remain awake or audible. Force quit, shutdown, reboot, permission changes, battery management, location loss, system suspension, Focus / Do Not Disturb, channel configuration, sound volume and silent mode may stop monitoring or alerts. The module cannot detect or notify while its process is stopped. The native heartbeat runs only while the OS schedules the native process. No critical-alert entitlement, silent-mode bypass or termination alert is promised.

The assistant has no watch-control tool. Stop, radius adjustment, arming and acknowledgment are explicit UI actions. A test alarm must have been submitted by the native module within ten minutes; users must independently confirm hearing it. Radius edits require confirmation and re-evaluate the current position without altering the anchor. Configurable maximum position error is 1 metre to half the radius; fix expiry is 15–120 seconds (30 default). These limits validate input; they are not maritime safety recommendations.

## Verification

`npm test --workspace=@anchor-buddy/anchor-watch` exercises the executable reference kernel; `npm run typecheck --workspace=@anchor-buddy/anchor-watch` checks the bridge and simulator. Native engines mirror the reference state transitions, but these tests do not execute CoreLocation, Android services or native notification delivery. Before release build and test on physical iOS and Android devices. There is no native-build or on-water validation claim in this repository.

For both platforms record OS/device, build SHA, permissions, battery settings, location accuracy, native status, timestamps and audible/visible alert outcome. Keep an independent watch throughout trials. Required trials:

- Test the actual alarm, deny notifications, disable sound, enable silent/Focus/Do Not Disturb and reduce volume; verify the UI does not promise audibility.
- Arm with a confirmed anchor, observe `arming` before a fix and `monitoring` only with usable positioning. Reject missing confirmations, expired test and approximate location authorization.
- Feed controlled fixes inside, overlapping and outside the boundary; confirm latching, acknowledgment and radius reevaluation without anchor movement. Repeat with timestamp regressions, stale samples and poor accuracy.
- Run overnight with the screen locked, app backgrounded, poor reception and battery saving; observe native expiry and alerts independently of JavaScript or internet connectivity.
- Remove permissions, kill the process, force stop, reboot and relaunch. The UI must show `interrupted` when the native watch ended, and must require a new test and arming. Do not expect a notification after process termination.
- Disconnect JavaScript during a native session, then reconnect and query status; native monitoring must remain independent and the UI must reflect the actual live state.
- Verify Android foreground-service startup in the visible app, persistent service notification, alarm channel settings, GPS provider loss and OS service restrictions. Verify iOS Always/Precise authorization, notification delegate forwarding and background location capability.

Official implementation references: [Expo Modules API](https://docs.expo.dev/modules/module-api/), [Android location foreground services](https://developer.android.com/develop/background-work/services/fgs/service-types#location), [Apple standard location service](https://developer.apple.com/documentation/CoreLocation/CLLocationManager/startUpdatingLocation()), and [Apple notification authorization](https://developer.apple.com/documentation/usernotifications/unusernotificationcenter/requestauthorization(options:completionhandler:)).
