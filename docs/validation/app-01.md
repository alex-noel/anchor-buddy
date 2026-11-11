# APP-01 validation handoff

Prerequisites: `ed48e6508538b8ccbb24fd24c0e2e5b4e74063b7` (FOUNDATION-01/02 approved). Worker candidate `b02054edbcf0e2c26818eb70683dec541f76112a`; integrated runtime candidate `1e518051a0f6d14748500a22fea1cf751e447354`.

Status: **done** for this controller extraction. The integrator owns App.tsx after merge. This status does not certify native monitoring, complete QA-01, or implement APP-02 durable settings. No persisted schema or native protocol changed.

The reducer owns active search, isolated draft/restore metadata, selection, preview, navigation and exclusive sheets. Detail identity contains candidate/allowance rather than an assessment. Source loading, persistence and assessment remain explicit shell effects; the request generation and abort lifecycle are controller-owned. The production status observer can only read and subscribe. Its disposal cannot issue watch commands.

## Acceptance

| AC          | Status | Evidence                                                                                                                                                                                                                                                                 |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| APP-01-AC01 | PASS   | Transition contract covers all 17 public actions; independently enumerated against reducer, call sites and tests. Cancel/close mismatches are documented no-ops. Setup child return and preview transitions were exercised in the browser.                               |
| APP-01-AC02 | PASS   | Independent call-site review found one controller owner for active search, draft and pin. Shell effects receive the committed search/area tuple. Map/list share derived results; manual pin stays separate.                                                              |
| APP-01-AC03 | PASS   | Saved-draft reducer regression preserves search, filters, pin, area and timezone. Browser changed radius/seabeds and cancelled: original 1 nm, 12 marinas and manual pin remained.                                                                                       |
| APP-01-AC04 | PASS   | Deferred-generation/cache tests cover cancellation/disposal and older completion. Mounted exported UI held real HTTP200 responses: B then A left B unchanged; closing before releasing a response left Explore empty.                                                    |
| APP-01-AC05 | PASS   | Production observer with real createWatchBridge and a monitoring spy recorded only subscribe/getStatus/unsubscribe through controller lifecycle; independent shell call-graph review found no arm/stop/radius calls. Native implementation behavior remains WATCH-owned. |
| APP-01-AC06 | PASS   | Integrator browser journey covered fresh onboarding/child cancel, invalid input recovery, tour, real search, map/list/filter/sort, source detail, pin/plan, save/close/reopen, cached preview and truthful unsupported web watch.                                        |
| APP-01-AC07 | PASS   | Eleven new behavioral controller tests; mobile suite 91/91, plus independent review and mounted boundary exercises.                                                                                                                                                      |
| APP-01-AC08 | PASS   | Adjacent contract documents typed action payloads, legal origins, no-ops, ownership, effect boundaries and action-to-test mapping. Independent reviewer enumerated all public actions using it.                                                                          |

## Test cases and limits

| Test | Result | Scope                                                                                                                                                                                                                                 |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01  | PASS   | Controlled expired saved draft cancellation; mounted ordinary draft cancellation also verified.                                                                                                                                       |
| T02  | PASS   | Deferred tests plus mounted real-response A/B reversal. B used a 0.5 nm search; late A was the previous 1 nm search. B text remained byte-identical after A was released. Live discovery has no durable active-region write.          |
| T03  | PASS   | Monitoring bridge spy, production status observer and controller transitions, supplemented by independent mounted-shell call-site inspection. A full mounted native shell/bridge test and device trial were not run.                  |
| T04  | PASS   | Fresh isolated browser profile, required boat/default completion, cancelled child returns to setup, invalid depth corrected, tour and empty Explore.                                                                                  |
| T05  | PASS   | Real Split results: 12 marinas in both views; manual pin excluded from that count and retained after view changes; detail reopens and plan keeps unknown footprint unknown.                                                           |
| T06  | PASS   | Mounted search closed before actual HTTP200 release: no resurrection/loading/results. Disposal and late cache/status completion tested through production lifecycle adapters; full browser React-unmount instrumentation was not run. |
| T07  | PASS   | Integrator and independent worker reviewed all 17 public actions and corresponding behavioral cases.                                                                                                                                  |

Independent review by worker A approved `b02054e`, rerunning mobile 91/91 and typecheck. The integrator's clean combined candidate passed 284 tests, all workspace typechecks, web export and both Hermes exports. Exact commands, browser observations and remaining gates are in [wave validation](core-wave-01-2026-11-11.md).

The browser walkthrough first used the APP candidate, then repeated preview/reload and real saved-search reopening on the integrated export. The narrow smoke viewport was actually 500 × 844 CSS pixels (the browser enforced a 500 px minimum); no 390 px or full mobile-device claim is made. Source responses were real; response delay instrumentation existed only inside the isolated test browser and was removed by reloading. It never replaced evidence or calculated outcomes.

Integrator-approved behavior correction: live discovery caches regional evidence and updates memory, but no longer writes the durable active-region pointer automatically. Only explicit save/install/remove actions change that pointer. An already-started cache write may finish after cancellation but cannot activate the workspace. APP-02 still owns durable settings writes.

Rollback: revert the APP-01 integration and its follow-up formatting/contract clarification; no storage migration was introduced.
