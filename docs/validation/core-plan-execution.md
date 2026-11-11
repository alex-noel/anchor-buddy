# Core plan execution ledger

Started 11 November 2026 on `codex/core-plan-2026-11-11`. The user's execution instruction supersedes the proposed six-slot schedule: use **four logical workers plus an integrator**, obey task prerequisites and **exclude cloud deployment**. This runtime permits only three active sub-agents alongside the integrator, so four roles rotate through those slots. The original 34-task plan remains the backlog; its dates and six-slot capacity are not a promise under this staffing change.

## Roles and review

| Role                             | Model / reasoning                                                                | Initial scope                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A — contracts and safety         | GPT-6 Astra / high                                                               | FOUNDATION-02, then bounded assessment tasks                                        |
| B — application                  | GPT-6.1 Terra / high                                                             | APP-01 controller, then durable controls                                            |
| C — data and source verification | GPT-6.1 Sol / high                                                               | Independent baseline review, then DATA-01 and ingestion                             |
| D — operations and native        | GPT-6.1 Sol / medium for OPS; GPT-6 Astra / high for independent geometry review | Dependency/toolchain audit and OPS-04; independent SAFE-01 numerical review         |
| Integrator / reviewer            | Parent session                                                                   | FOUNDATION-01, file leases, independent review, integration and regression evidence |

The contract author is worker A; the integrator independently reviews that change. No worker self-approval substitutes for integration review, and engineering review is never a maritime attestation. Models/reasoning may change for subsequent bounded assignments; record the actual setting rather than assuming every task needs the most expensive model.

## Current task state

| Task            | State                                  | Evidence / gate                                                                                                                                                    |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FOUNDATION-01   | done                                   | Baseline `fe29e076b937efab4a96b8db38cd5e7283b6c41d`; [237-test reproduction](baseline-2026-11-12.md).                                                              |
| FOUNDATION-02   | done                                   | Independent review and integrated 250-test check passed; [approved contract](../contracts/v2.md), worker revision `28b15c8`.                                       |
| OPS-04          | implemented_awaiting_external_evidence | Reviewed dependency/verification tranche merged from `0dd1cc6`; [evidence](ops-04.md). Native/E2E/hosted completion remains pending.                               |
| APP-01          | done                                   | Controller candidate `b02054e` independently approved and merged; [AC and browser evidence](app-01.md).                                                            |
| DATA-01         | done                                   | Registry and HTTP route integrated; custom-endpoint review correction `2839f94` approved. [Evidence](data-01.md).                                                  |
| SAFE-01         | implemented_awaiting_external_evidence | Candidate `4930be54` integrated as `e19b991`; geometry review and 210 PROJ references pass. Genuine model/maritime approval remains gated. [Evidence](safe-01.md). |
| WATCH-01/02     | planned                                | Native source/toolchain issues recorded; actual SDKs/signing/device evidence remain separate gates.                                                                |
| Remaining tasks | planned                                | Dispatch only after their engineering dependencies are reviewed and merged.                                                                                        |

## Integration checkpoint and next reservations

Clean combined runtime candidate **`1e518051a0f6d14748500a22fea1cf751e447354`** passed **284 tests**, all typechecks, web export and iOS/Android Hermes exports. All four local verification records identify that SHA with `dirty: false`. See [wave validation](core-wave-01-2026-11-11.md) for the actual browser journey, delayed-response tests and limits. This checkpoint completes the first dependency wave, not the two-week backlog.

Worker implementation leases for this wave are closed. The integrator owns App.tsx, server wiring and validation reports. No background worker is still executing the next wave. Each subsequent assignment must begin from the integrated candidate and receive an explicit file lease.

| Next bounded assignment                                | Role / suggested model and reasoning                       | Dependency status                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| APP-02 durable local saves                             | B / GPT-6.1 Terra high                                     | FOUNDATION-01/02 and APP-01 approved. Keep shell wiring integrator-owned.                           |
| DATA-02 real ENC extraction                            | C / GPT-6.1 Sol high                                       | FOUNDATION-01/02 and DATA-01 approved; SAFE-01 primitive contract available with model-review gate. |
| SAFE-02 equipment guidance references                  | A / GPT-6 Astra high                                       | FOUNDATION-02 approved; no invented ratings or approval.                                            |
| WATCH-01/02 native integration, one platform at a time | D / GPT-6.1 Sol high, numerical review escalated as needed | FOUNDATION-01/02 approved. Compiler/signing/device availability must be recorded truthfully.        |
| QA-01 repeatable browser suite                         | Rotate D after bounded native/toolchain work               | FOUNDATION-01 and APP-01 approved; observed browser journey is documented.                          |

These are ready assignments, not started or completed tasks. The runtime still limits concurrency to three active workers plus the integrator; rotate the fourth logical role. Models above are suggestions for the next assignment, not a claim that they have run.

## Scope and external gates

Cloud infrastructure creation, staging/production deployment, remote workflow dispatch and publication are excluded. Local containers/build scripts/recovery checks may be developed when their task dependencies permit. No push is part of this execution instruction.

The verified project mailbox does not authorize storing account passwords in this repository. Provider-account setup is set aside while core implementation proceeds. Missing paid access, licensing, qualified maritime review, physical devices or safe on-water observation remains blocked; no task may fabricate evidence to satisfy an AC.

Native preflight found only Apple Command Line Tools (no full Xcode/iOS SDK), and no configured Android SDK with the required JDK. Local, isolated toolchain installation can be assessed when WATCH tasks are released; no account purchase or global toolchain replacement is implied.

Known baseline findings to carry forward: Docker context must exclude ignored local secrets/test payloads; tide-response reviewer metadata needs public-output review; existing imperial input conversion constants need the frozen unit policy; API success does not establish complete anchoring coverage. None of these findings authorizes bypassing task ownership or safety gates.
