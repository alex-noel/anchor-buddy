# App quality execution

Executed 17 November 2026 on `codex/app-quality-2026-11-17`, from `f7e00acdb9423fb212486931a0cb354e227e41ec`. The user authorized completion of the forty tasks and requested model size/reasoning matched to complexity. Three workers ran concurrently with the integrator, using exclusive file leases in one checkout. The integrator reviewed and committed changes.

**34 tasks are locally verified. Six retain explicit external acceptance blockers: Q34, Q35, Q36, Q37, Q38 and Q40.** Q34/Q35 code and isolated checks are implemented; Q38's browser matrix passed. Missing native/device evidence is not reported as success. The [acceptance report](../../validation/quality-acceptance-2026-11-17.md) and [manifest](manifest.json) contain authoritative status and evidence.

## Model routing used

| Model and thinking | Assigned work |
| --- | --- |
| GPT-6 Luna, medium | Visual tokens, field errors, conversions, result/detail hierarchy, download stages, Settings organization |
| GPT-6.1 Sol, medium | Shared interaction/forms, browser harness, calendar, responsive/keyboard/actual-zoom matrix |
| GPT-6.1 Sol, high | Map recovery/selection, forecast coverage presentation, independent App review |
| GPT-6.1 Terra, high | Durable settings/startup, saved plans, cache ownership, deletion/activation recovery, independent watch-boundary review |
| Integrator | Shared App integration, remaining UX flows, evidence/readiness/watch safeguards, failure tests, source reviews and acceptance reconciliation |

No current pricing claim is made. Routine tasks used the smaller worker; persistence/race-sensitive work used stronger reasoning and independent review. Workers did not create user chats, publish, deploy or send messages externally.

## Integrated checkpoints

| Commit | Outcome |
| --- | --- |
| `48eb8fb` | Shared semantics and isolated production-entry browser harness |
| `e1595a0` | Durable settings, exact conversions and bounded cancellable GPS capture |
| `09e783a` | Preference save/retry and honest currency formatting |
| `4b049a3` | Keyboard controls, focus and hit targets |
| `cd9ce4d` | Field errors, results and conservative watch readiness |
| `e40e985`, `ba9bba8`, `a771390`, `05810d3` | Sheets, vessel/search grouping and calendar/timezone behavior |
| `01507bd`, `7112bd6`, `d134015`, `970ae5f` | Details/download stages, lookup cancellation, offline readiness and stop confirmation |
| `3f792ac` | Map recovery, rank/selection consistency and interrupted-map deletion regression |
| `f15be87` | Coherent App integration: saved drafts, recovery/retention, forecasts, connectivity, responsive scrolling and final stop safeguards |
| `529d584` | Complete responsive/keyboard matrix including real 200% browser zoom |
| `754df15`, `0d4cd61` | Isolated Planner discovery, deterministic delayed GPS and first-save/offline-reopen regression |

Production code is unchanged after `f15be87`. Final candidate `0d4cd619770c7e90cb334930901c56ac82984990` includes the validation harness corrections. Full repository checks, 17 production browser journeys, eight exported recovery cases, three production Planner cases, 16 watch/forecast component cases, a separate Planner map case and web export passed. Exact commands/counts and local logs are in the acceptance report.

## Remaining work

The [native preflight](../../validation/quality-native-preflight.md) found no full Xcode/iPhoneOS SDK, no Android SDK and only Java 11. Q36/Q37 need supported toolchains and build/install evidence. These unlock actual audible alarms, stop transitions, hardware GPS, native typography/keyboards and VoiceOver/TalkBack checks. Native-engine parity, overnight trials and maritime/on-water approval remain external release gates. The stop API's lack of an expected-session argument is documented for separately reviewed native work.

The current dependency audit has four moderate findings, replacing the stale implementation-time advisory summary; supported remediation remains open. The existing broader release backlog is preserved. No local test result certifies a public nautical release.
