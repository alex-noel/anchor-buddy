# Anchor Buddy quality acceptance — 17 November 2026

The forty-task application-quality tranche has implemented the locally executable app work. **34 tasks are locally verified; six remain blocked on native/device or external acceptance: Q34, Q35, Q36, Q37, Q38 and Q40.** Q34/Q35 implementation and browser-substitute verification are complete; Q38's complete browser matrix is verified. These statuses deliberately do not turn missing physical evidence into a pass.

The branch is `codex/app-quality-2026-11-17`. Production implementation is integrated through `f15be87`; the complete responsive matrix is committed in `529d584`. Final candidate `0d4cd619770c7e90cb334930901c56ac82984990` adds Planner harness isolation, deterministic GPS synchronization and the passing first-save journey. Its production source is identical to `f15be87`. The [manifest](../plans/2026-11-17-app-quality/manifest.json) records per-task implementation commits, evidence and blockers. The [execution record](../plans/2026-11-17-app-quality/EXECUTION.md) records worker routing.

## Delivered behavior

- Shared controls have semantic visual states, usable hit areas, visible focus, keyboard selection and linked field errors. Forms preserve drafts during failed saves and confirm discard. Calendar navigation preserves exact stay instants across DST and exposes the device versus selected-area timezone.
- Setup and preferences commit durable complete settings records. Partial startup failure leaves readable categories usable and preserves unsupported/corrupt originals. Named plan drafts retain canonical proposed inputs and source/vessel references, then reassess on return; confirmations and watch state are never restored.
- Explore distinguishes retrieval failures, filtered-empty results and missing evidence. Map retry preserves area/pin/selection; selected ranks beyond the visible marker limit remain identifiable. Narrow Explore scrolls as one page so long result cards and map controls stay reachable.
- Details and forecasts expose the requested stay, contingency, missing values, temporal gaps, expiry and source dates without inventing spatial coverage. Settings separates ordinary preferences from technical connection/catalogue/download feedback.
- Saved libraries have explicit limits and replacement, durable deletion/cleanup recovery and retained-versus-automatic cache ownership. Downloads separate usable map progress from regional evidence. Offline app readiness is verified separately from map and evidence readiness.
- Watch setup uses conservative monotonic alarm-test readiness, explicit actual-hearing confirmation and cancellable position capture. Stop confirmation checks current session and authoritative state, rejects unavailable/stale responses and remains separate from acknowledgment.

## Integrated checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run check` | Pass: 7 runtime/guard tests; 113 runtime modules checked; 340 workspace tests (56 API, 173 mobile, 93 domain, 18 watch); 24 Python ingestion tests; workspace typechecks | `.artifacts/quality-final/check.log` |
| `npm run test:e2e` | 17/17 production browser journeys | `.artifacts/quality-final/journeys.log` |
| Exported offline/download/recovery harness | 8/8 | `.artifacts/quality-final/recovery.log`, [Q39](quality-q39.md) |
| Watch/forecast component harness | 16/16, native substitute explicitly isolated from production | `.artifacts/quality-final/watch.log`, [Q21](quality-q21.md), [Q35](quality-q35.md) |
| Production Planner and separate map component harness | 3/3 save/reload/failure/first-save journeys and 1/1 separate proposed-position/handoff check | `.artifacts/quality-final/planner.log`, `planner-component.log`, [Q23](quality-q23.md), [Q24](quality-q24.md) |
| Web export | Pass; verified shell has 6 resources, about 2.7 MB, manifest version `4655c112f165a580356d` | `.artifacts/quality-final/export.log` |
| Responsive/keyboard | 320×844, 390×844, 768×900 and 1280×900; actual 200% Chromium zoom in a measured 1280×900 outer window gives 640×450 CSS pixels at DPR 2 | [Q38](quality-q38.md); 100 captured states with bounds and accessibility trees |
| Dependency audit, 17 November | Four moderate findings; zero high/critical in this response. Supported remediation remains open. | `.artifacts/quality-final/npm-audit.json`; [release checklist](../release-checklist.md) |

The walkthrough covers fresh setup, search, result details, plan editing, save, reload, retained/offline evidence and the unavailable browser-watch handoff. Controlled test source records remain explicitly unreviewed except isolated installer integrity fixtures; they never become production nautical coverage. Separate component fixtures are not evidence of native hardware or services.

## Remaining gates and handoff

| Task | Completed locally | Missing evidence / next prerequisite |
| --- | --- | --- |
| Q34 | Monotonic readiness, expiry/resume boundaries and native-substitute lifecycle tests | Actual audible alarm test and hearing confirmation on supported native devices |
| Q35 | Named stop confirmation, one-command latch, pre/post status checks and race regressions | Real native stop transition. `Watch.stop()` has no expected-session argument; atomic compare-and-stop would require a separately reviewed native protocol change. |
| Q36 | Fresh iOS build preflight | Full Xcode and iPhoneOS SDK, signing/build/install and device results |
| Q37 | Fresh Android build preflight | Android SDK/NDK and supported JDK, build/install and device results |
| Q38 | Complete browser matrix, real zoom, keyboard/focus/error semantics | Native Dynamic Type/font scaling, software keyboards and VoiceOver/TalkBack; spoken assistive-technology checks |
| Q40 | Local integration, manifest reconciliation and current acceptance/dependency notes | The native gates above and independent parity/overnight/on-water/maritime acceptance; this is a partial acceptance report |

The [native preflight](quality-native-preflight.md) found only Apple Command Line Tools, no iPhoneOS SDK/full Xcode, no default Android SDK and only Java 11. No native build or physical-device success is claimed. No deployment, account setup, provider/equipment approval or maritime release occurred. Existing [public release gates](../release-checklist.md) remain open until independently evidenced.
