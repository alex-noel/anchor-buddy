# Core plan execution ledger

Started 11 November 2026 on `codex/core-plan-2026-11-11`. The user's execution instruction supersedes the proposed six-slot schedule: use **four logical workers plus an integrator**, obey task prerequisites and **exclude cloud deployment**. This runtime permits only three active sub-agents alongside the integrator, so four roles rotate through those slots. The original 34-task plan remains the backlog; its dates and six-slot capacity are not a promise under this staffing change.

## Roles and review

| Role | Model / reasoning | Initial scope |
| --- | --- | --- |
| A — contracts and safety | GPT-6 Astra / high | FOUNDATION-02, then bounded assessment tasks |
| B — application | GPT-6.1 Terra / high | APP-01 controller, then durable controls |
| C — data and source verification | GPT-6.1 Sol / high | Independent baseline review, then DATA-01 and ingestion |
| D — operations and native | GPT-6.1 Sol / medium initially | Dependency/toolchain audit and OPS-04; increase reasoning for native algorithm work |
| Integrator / reviewer | Parent session | FOUNDATION-01, file leases, independent review, integration and regression evidence |

The contract author is worker A; the integrator independently reviews that change. No worker self-approval substitutes for integration review, and engineering review is never a maritime attestation. Models/reasoning may change for subsequent bounded assignments; record the actual setting rather than assuming every task needs the most expensive model.

## Current task state

| Task | State | Evidence / gate |
| --- | --- | --- |
| FOUNDATION-01 | done | Baseline `fe29e076b937efab4a96b8db38cd5e7283b6c41d`; [237-test reproduction](baseline-2026-11-12.md). |
| FOUNDATION-02 | done | Independent review and integrated 250-test check passed; [approved contract](../contracts/v2.md), worker revision `28b15c8`. |
| OPS-04 | implemented_awaiting_external_evidence | Reviewed dependency/verification tranche merged from `0dd1cc6`; [evidence](ops-04.md). Native/E2E/hosted completion remains pending. |
| APP-01 | planned | Read-only preflight complete; implementation waits for FOUNDATION-02 merge. |
| DATA-01 | planned | Official-source preflight complete; implementation waits for FOUNDATION-02 merge. |
| WATCH-01/02 | planned | Native source/toolchain issues recorded; actual SDKs/signing/device evidence remain separate gates. |
| Remaining tasks | planned | Dispatch only after their engineering dependencies are reviewed and merged. |

## Active reservations

- Worker A: domain shared types/validators/exports, additive contract helpers/tests, `docs/contracts/v2.md` and its validation report. No assessment algorithm, screens or native protocol changes.
- Worker D: root lockfile/package manifests, verification scripts/CI configuration and OPS-04 report. No cloud action, remote CI trigger or native algorithm change in this tranche.
- Integrator: execution/baseline reports and branch integration. Application/data workers remain read-only until released with the merged schema SHA.
- Every implementation role uses its own branch/worktree. No shared `node_modules` symlink or evolving source-directory copy is used as a reproducibility shortcut.

## Scope and external gates

Cloud infrastructure creation, staging/production deployment, remote workflow dispatch and publication are excluded. Local containers/build scripts/recovery checks may be developed when their task dependencies permit. No push is part of this execution instruction.

The verified project mailbox does not authorize storing account passwords in this repository. Provider-account setup is set aside while core implementation proceeds. Missing paid access, licensing, qualified maritime review, physical devices or safe on-water observation remains blocked; no task may fabricate evidence to satisfy an AC.

Native preflight found only Apple Command Line Tools (no full Xcode/iOS SDK), and no configured Android SDK with the required JDK. Local, isolated toolchain installation can be assessed when WATCH tasks are released; no account purchase or global toolchain replacement is implied.

Known baseline findings to carry forward: Docker context must exclude ignored local secrets/test payloads; tide-response reviewer metadata needs public-output review; existing imperial input conversion constants need the frozen unit policy; API success does not establish complete anchoring coverage. None of these findings authorizes bypassing task ownership or safety gates.
