---
id: WATCH-04
title: "Run controlled physical-device watch trials"
priority: P0
estimate_hours: 10
dependencies: [WATCH-01, WATCH-02, WATCH-03, APP-08]
lane: watch
expert_review: true
external_gate: "Physical iOS and Android devices plus human observers; two 8-hour trials per platform. On-water work additionally requires QA-03 clearance."
---

# WATCH-04 — Run controlled physical-device watch trials

## User instruction

Prepare and execute a reproducible physical-device acceptance campaign for the native anchor watch. Record what each device actually did while locked, backgrounded, disconnected, restricted or restarted. This is evidence gathering for an internal alpha; it is not authorization to rely on the app for vessel safety or to publish it publicly.

**Estimate:** 8–12 active worker-hours plus at least two 8-hour overnight runs per platform; calendar time is a hard dependency. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies for final integrated-device acceptance:** WATCH-01 and WATCH-02 actual installable builds, WATCH-03 state-machine acceptance, APP-08's integrated readiness/handoff UI, and approved operator/device access. Protocol preparation, device inventory and scheduling may start before those implementation dependencies complete. Freeze and record the candidate containing both native code and APP-08 UI before acceptance runs; trials of an earlier build do not validate the final handoff controls. APP-08 may reuse this protocol without depending on completion of these overnight trials. On-water execution additionally requires QA maritime-review clearance and an independent competent lookout/skipper. If any prerequisite is missing, prepare the protocol and mark execution blocked rather than inventing results.

## Baseline, ownership and inputs

Read `modules/anchor-watch/README.md`, `src/types.ts`, current native implementations, `apps/mobile/src/screens/WatchScreen.tsx`, `docs/release-checklist.md`, and WATCH-01–03 evidence. Current implementation deliberately cannot alert after process death and never restarts an armed session automatically. It checks native process/service state when the app returns; JavaScript status is not a promise that the OS will keep running.

Own proposed `docs/validation/watch-device-protocol.md`, anonymized result templates and `scripts/native/collect-watch-evidence.*` if needed. Do not modify watch algorithms or UI while testing a frozen candidate; file reproducible defects against a specific SHA. Logs containing precise location, device identifiers or personal data remain in private local artifacts. Public reports use anonymous device labels and bounded time-relative summaries.

## Execution instructions

1. Build a matrix covering one physical iPhone and one physical Android device at minimum, recording OS version, device model class, build SHA, battery health context, permissions and power settings. If resources allow, add the oldest supported OS and a second Android OEM; absent combinations remain explicitly untested.
2. Define safe land-based boundary trials first. Use a fixed reference coordinate in a controlled test area, a manually confirmed radius, measured reference points and an observer. The test must not require drifting a real vessel toward shore, shallow water or hazards. Controlled on-water validation is a separately authorized session with safe abort criteria.
3. For each run, record actual anchor/radius confirmation, permission state, native test submission and human confirmation of heard/seen alarm. Record observable status transitions, location accuracy, fix age, heartbeats and alerts. Collect battery change and temperature/charging conditions without asserting an arbitrary battery-life guarantee.
4. Execute screen lock/background, loss of network/JavaScript, poor reception, boundary crossing, accuracy-overlap, permission changes, GPS disabled, low-power/battery-saving mode, notification denial, muted channels, silent/Focus/Do Not Disturb and low volume. Never promise that silent-mode or OS restrictions can be bypassed.
5. Distinguish activity dismissal, OS process kill, force-stop, reboot and shutdown. Confirm interruption on reopening and explicit rearming requirements. An absent notification after death is an expected limitation, not a reason to implement auto-arming or remote alerts in this task.
6. Run two stationary overnight sessions per platform, each at least eight hours with an independent observer/check process. Include a locked/background run and a constrained-power/reception run. Record every gap and whether the process was still scheduled; mark missing evidence inconclusive, not passed.
7. Produce a defect list with reproduction, severity, source SHA, expected/actual states, environment and sanitized artifacts. Re-run only affected cases after a fix plus one ordinary arming/stop smoke; changing the candidate SHA invalidates relevant prior evidence.

## Acceptance criteria

- **WATCH-04-AC01:** Protocol and result template enumerate device/build/environment, action sequence, expected state, actual observation and evidence for every case.
- **WATCH-04-AC02:** Required physical iOS and Android runs are actually executed; simulator, replay and unobserved overnight time are never marked physical-device passes.
- **WATCH-04-AC03:** Explicit arming, fixed anchor, audible-test confirmation, boundary/uncertainty latching and stop behavior are observed on both platforms.
- **WATCH-04-AC04:** Network or JavaScript loss does not substitute simulated monitoring; actual native continuation or interruption is recorded.
- **WATCH-04-AC05:** Process death/reboot is honestly represented on relaunch, with no auto-arm/recentre and no claim of alarms while dead.
- **WATCH-04-AC06:** Muted/denied alerts, permission and power restrictions have documented observed results and visible product limitations.
- **WATCH-04-AC07:** Two eight-hour overnight runs per platform have complete evidence or an explicit incomplete/blocked result; unresolved monitoring-critical defects block watch alpha approval.
- **WATCH-04-AC08:** Tracked reports contain no private coordinates, credentials or device identifiers and distinguish land trials from any authorized on-water trial.

## Test cases

| ID | Setup/action | Expected observation / AC |
| --- | --- | --- |
| WATCH-04-T01 | Physical device, approved permissions, manually confirm fixed anchor/radius, hear test, arm then stop. | Real arming/fix/monitoring and complete resource cleanup; AC02–03. |
| WATCH-04-T02 | While genuinely monitoring, lock screen and disable internet/Metro; cross a safe land-test boundary with an observer. | Native local processing/alert observed, or concrete defect; anchor unchanged; AC03–04. |
| WATCH-04-T03 | Obstruct reception or supply actual poor-GPS conditions without changing anchor. | Health/freshness issue appears while process runs; no fabricated good fix; AC03, AC06. |
| WATCH-04-T04 | Change notification/sound, Focus/DND, GPS and location permissions one at a time. | Record actual alert suppression/readiness/interruption and matching visible limitations; AC06. |
| WATCH-04-T05 | Force-stop/kill, reboot, then relaunch after each event. | No resumed monitoring from stored armed flag; new explicit test/arm required; AC05. |
| WATCH-04-T06 | Two eight-hour locked runs per platform under recorded normal/constrained settings. | Timestamped evidence, battery summary, gaps and alarms; any missing critical record is inconclusive; AC07. |
| WATCH-04-T07 | Review public report against raw private evidence. | Traceability without precise coordinates/identifiers; only actually performed trials claimed; AC01, AC08. |

Use build/install commands proven in WATCH-01/02. A log collector, if introduced, is a new command and must default to local redacted output with explicit export. Do not send reports to third parties or schedule paid on-water work automatically. Return a clear pass/fail/blocked matrix to the integrator and QA release owner.
