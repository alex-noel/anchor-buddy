# APP-01 validation handoff

- Baseline/prerequisites: `ed48e6508538b8ccbb24fd24c0e2e5b4e74063b7` (FOUNDATION-01/02 merged). Final change SHA: see containing commit.
- Status: `in_review`, not done. Integrator owns App.tsx after merge. No contract or schema amendment.
- Changed: `apps/mobile/src/App.tsx`, `apps/mobile/src/lib/{workspaceController.ts,useWorkspaceController.ts,workspaceController.test.ts,workspaceController.md}`, this report. Reserved files only.
- Outcome: reducer holds active search, draft including saved restore payload, selection, navigation and exclusive sheet identity; selections retain candidate/allowance instead of Assessment. Request generation guards completion; live discovery never changes the durable active-region pointer; only explicit save/install/remove actions do. Existing source and native effects remain in shell; controller cleanup only aborts fetches.

| AC | Status | Evidence / remaining action |
| --- | --- | --- |
| APP-01-AC01 | NOT_RUN | Transition table written; complete reachable-state and illegal-transition audit still required. Generic field setter remains available. |
| APP-01-AC02 | NOT_RUN | Core state and generation moved; shell still contains source effect and several field updates. Integrator must review whether delegation meets criterion. |
| APP-01-AC03 | PASS | Reducer test `cancel saved search draft...` checks active search, pin, filters, area name and timezone plus discarded restore payload. |
| APP-01-AC04 | NOT_RUN | Controlled helper tests cover delayed cache completion after a newer generation and cancellation/unmount; mounted discovery and restart still require integration exercise. Live discovery has no pointer write to race. |
| APP-01-AC05 | NOT_RUN | Reducer issues no bridge commands; actual shell/bridge spy sequence has not been exercised. |
| APP-01-AC06 | NOT_RUN | Browser/native walkthrough not performed; integrator to run QA journey. |
| APP-01-AC07 | PASS | Seven controller tests exercise draft cancellation/reopen, setup child return, profile invalidation, details/plan, and request/cache races. |
| APP-01-AC08 | NOT_RUN | Contract drafted; independent action/transition audit and full action test mapping pending. |

| Test | Status and evidence | Remaining action |
| --- | --- | --- |
| T01 | PASS: controller test uses active A and draft B; active fields deep-equal after cancel. | Full UI walkthrough desirable. |
| T02 | NOT_RUN: helper test completes A cache after B, checks B remains current and simulated restart reads the explicit saved pointer; discovery-level deferred responses have not been exercised. | Run mounted adapter/integration deferred-fetch test. |
| T03 | NOT_RUN: pure profile transition checks invalidation; no bridge spy around mounted shell. | Exercise shell with monitoring bridge spy. |
| T04 | NOT_RUN: pure modal test checks setup/profile child return; fresh-store onboarding journey not run. | Run browser/native journey. |
| T05 | NOT_RUN: existing assessment and workspace tests pass; requested map/list/filter/manual-pin journey not run. | Run journey and compare counts/detail. |
| T06 | NOT_RUN: cache helper cancellation/dispose checks pass; mounted source fetch/close/unmount not exercised. | Run integration test. |
| T07 | NOT_RUN: action contract provided. | Independent integrator audit and tests for every action. |

Checks on this change: `npm ci` (Node 24.22.3) passed; `npm run typecheck --workspace=@anchor-buddy/mobile` passed; `npm run test --workspace=@anchor-buddy/mobile` passed (87 tests); `npm run export:web --workspace=@anchor-buddy/mobile` passed. Command output kept in local `/tmp/anchor-app01-*.log`; source tests are the reproducible artifact. Export is a web bundle, not a native build. No live source, browser journey, physical device or watch bridge tests were run. No credentials, personal data, source evidence or native protocol changes were added. Rollback: revert the scoped commit; no migration was introduced.

Integrator-approved behavior change: live discovery caches regional evidence and updates the current in-memory workspace, but no longer automatically writes the durable active-region pointer. The last explicitly saved/installed pointer remains after restart. An already-started cache write may finish after cancellation; its completion cannot activate the workspace. Existing settings writes are unchanged and APP-02 owns their durability.
