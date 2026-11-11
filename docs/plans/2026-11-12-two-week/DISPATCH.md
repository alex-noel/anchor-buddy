# Dispatch, schedule and integration ownership

Use [WORKER_INSTRUCTIONS.md](WORKER_INSTRUCTIONS.md) and the full individual brief for each assignment. This schedule assumes the staffing and external-resource conditions in [README.md](README.md). Calendar dates are planning targets, not evidence that a dependency passed.

## Dependency semantics

`dependencies` in task frontmatter/manifest are engineering integration prerequisites. Read-only investigation, test design and external-resource preparation may begin earlier. Workers must not integrate against guessed contracts or claim acceptance before prerequisite code exists.

`final_integration_inputs` in the manifest identify later outputs needed for final task evidence. They allow an early implementation to be prepared against frozen interfaces without declaring it complete. For example, OPS-04 can begin dependency auditing after FOUNDATION-01 but cannot prove native CI before native build/test commands exist. APP-02 can establish durable commits before SAFE-02 supplies the final guidance selector, then must verify their integration.

An external approval gate is different again. Unreviewed real data may support correct ingestion tests while remaining ineligible for live recommendation activation. Code consumers may use a reviewed engineering implementation whose task status is `implemented_awaiting_external_evidence`; no consumer may assume the missing maritime, entitlement or device approval.

The integrator records the precise prerequisite SHAs, interfaces and remaining gates in each assignment. Do not use a green task title, planned date or merge alone as proof of safety coverage.

## Daily plan

Working hours below are active effort, not required wall-clock availability. Each implementation slot can be a succession of bounded workers; it does not require one model to retain the entire sprint context. Assign domain/native work to workers with the required tooling and have the designated expert review it.

| Day / date | Implementation dispatch | Integrator / evidence checkpoint |
| --- | --- | --- |
| D1 Thu 12 Nov | After baseline capture, start OPS-04 audit. Other slots perform read-only code familiarization, native SDK/signing/device inventory, official-source inventory and test-case preparation. No parallel shared-schema edits. | FOUNDATION-01 (6h), then begin FOUNDATION-02. Pin complete working state, establish file leases and open QA-04 ledger. Identify actual reviewer/device availability without contacting or purchasing anything automatically. |
| D2 Fri 13 Nov | Continue OPS-04. After FOUNDATION-02 approval, dispatch DATA-01, APP-01, WATCH-01, WATCH-02 and OPS-01 into five independent slots. | Finish FOUNDATION-02 (remaining 6h). Freeze schema/units/uncertainty/currency contracts and existing watch protocol fingerprint. Approve narrowly scoped task assignments. |
| D3 Mon 16 Nov | Continue controller/platform/API work. Finish DATA-01; begin OPS-02. OPS audit slot moves to SAFE-01 after its initial audit. | Review provider policy and first native preflight findings. Resolve missing toolchains early; record affected platform gates. Final native CI work in OPS-04 is deliberately reserved for later. |
| D4 Tue 17 Nov | Finish APP-01/WATCH build paths/OPS-01 where possible. Start DATA-02, APP-02, WATCH-03 and QA-01. Continue OPS-02/SAFE-01; begin DATA-04 as a slot frees. | Merge controller contract before screen wiring. Preserve separate native compilation versus JS export evidence. Confirm source/geometry omission handling and atomic-settings design. |
| D5 Wed 18 Nov | Start DATA-03 after extraction. Begin APP-05 after APP-02/OPS-02 integration readiness. Continue DATA-04; begin DATA-05 and SAFE-02. Finish initial QA-01 harness and continue WATCH-03. | Week-one review: inspect actual command outputs, controlled test behavior, external gates and scope risks. Do not enable incomplete analysis. Reserve OPS-04's remaining CI time in week two. |
| D6 Thu 19 Nov | Finish base component assembly and native watch scenario work. Start SAFE-03, APP-08, DATA-06/07 and OPS-03 preparation. Continue cache UX and equipment work. | Freeze the first integrated watch candidate only after relevant tests pass. Review actual alarm/readiness handoff; maintain final-trial eligibility checklist. |
| D7 Fri 20 Nov | Start QA-02 fault tests, APP-07 and remaining APP-03/04/06 work as inputs become ready. Prepare SAFE-04 runtime cases, QA-03 dossier and WATCH-04 land/overnight protocols. Continue OPS-03. | Triage critical failures before final trials. If native resources remain absent, mark physical/native ACs blocked and redirect workers to independent browser/data checks. No assumed weekend observation. |
| D8 Mon 23 Nov | Finish APP-03/04/06 and all native-candidate-affecting wiring before the evening freeze. Execute final QA-01 walkthrough; continue DATA-08, SAFE-04 and QA-03. Conduct eligible device land cases; begin first overnight run on both platforms only on the frozen integrated candidate. | Freeze the native candidate after required UI/build/watch checks. Keep later backend/data-only work and remaining CI evidence separate; bind the review dossier to candidate hashes. Recheck provider/privacy limits and backup/rollback evidence. |
| D9 Tue 24 Nov | Finish backend refresh/CI evidence and fix bounded defects. A native-candidate-affecting fix invalidates relevant trial evidence and may move acceptance outside this window. Review first overnight evidence; second overnight run on both platforms only if prerequisites remain satisfied. Finish runtime parity/offline regressions and source regional smoke evidence. | Review every AC status, not just test counts. Re-run final CI against the integrated candidate. Source or binary changes invalidate affected earlier evidence. |
| D10 Wed 25 Nov | Collect second overnight results, complete final fault/restore checks and redacted reports. No unreviewed feature expansion. | QA-04 issues capability-level internal-alpha go/no-go, unresolved defect list and exact external actions. Missing approvals remain blocked. No public release or push is implied by this plan. |

The overnight slots above are **23→24 and 24→25 November**, each at least eight hours. Both platforms may run in parallel with adequate independent observation. There is no retry night in this window. Freeze all relevant native, shared-domain, App.tsx/controller and bundled-screen changes before D8 evening. If a planned feature cannot be merged and verified by that freeze, the integrator must explicitly defer it from the native alpha or move the trial window; its task/AC remains incomplete for that candidate. Later relevant code changes invalidate/restart affected evidence. If the final candidate is not ready by the first slot, do not compress required trials or reuse evidence from an obsolete binary to meet the date.

## Capacity allocation

The following is one dependency-compatible distribution of the **317 non-lead base hours** across six slots. It is a packing aid, not a permanent specialization assignment. Items within a slot are ordered; the daily table and final evidence gates still apply. OPS-04's 12h must be split approximately 8h initial audit/preparation and 4h late command/CI integration rather than marked complete before native outputs exist. Reserve OPS-03 approximately 12h for initial deployment/restore work and 2h after DATA-08 for final job invocation/recovery. Reserve QA-01 approximately 10h for the harness/initial journey and 2h after final APP inputs for the integrated walkthrough. APP-02/03 similarly retain part of their stated budgets for late selector/evidence wiring. These are splits within the estimates, not extra hours. Slot order describes primary implementation; final acceptance handoffs may revisit an earlier task.

| Slot | Ordered task allocation | Base hours |
| --- | --- | ---: |
| W1 | OPS-04, SAFE-01, DATA-04, SAFE-03, QA-02 | 54 |
| W2 | DATA-01, OPS-02, APP-05, OPS-03, DATA-08 | 54 |
| W3 | APP-01, DATA-02, DATA-03, DATA-06, APP-04 | 46 |
| W4 | WATCH-01, APP-02, DATA-05, DATA-07, APP-06, WATCH-04 | 56 |
| W5 | WATCH-02, WATCH-03, APP-08, APP-03, SAFE-04 | 53 |
| W6 | OPS-01, QA-01, SAFE-02, APP-07, QA-03 | 54 |

The integrator owns FOUNDATION-01 (6h), FOUNDATION-02 (8h), QA-04 (10h), plus separate review/coordination capacity. Assign an independently qualified engineering reviewer, distinct from the FOUNDATION-02 author, before the contract gate. Reserve approximately 2–4 hours of the shared review allowance for this; a suitably qualified W3 reviewer can perform the review before taking APP-01. Apply the same independent-review rule to any safety/native change authored by the lead. Self-approval does not satisfy QA-04. Keep approximately 63.4 implementation hours and 4.8 lead-task hours as contingency. Toolchain waiting, reviewer time and physical observation are separate elapsed/human commitments. Redistribute independent tasks if a slot blocks; never bypass dependency gates just to keep a worker busy.

The longest chains include foundation → native builds → native watch parity → integrated handoff/device acceptance, and foundation → provider policy → extraction/pack assembly → refresh/deployment. The final physical runs and qualified review can dominate elapsed time even if coding finishes early. A six-worker schedule does not make those external processes six times faster.

## Exclusive ownership and integration leases

Record leases in the QA-04 ledger: file/directory, task owner, start revision, expected release, approved consumers and integration owner. A lease is a coordination record, not an extra application feature to build.

| Shared area | Owner / sequencing rule |
| --- | --- |
| Shared domain/public API schemas and validators | FOUNDATION-02 owns the first contract wave. Later changes require an integrator-approved amendment; consumers do not edit shared types independently. |
| `apps/mobile/src/App.tsx` and controller wiring | APP-01 exclusively during extraction; integrator thereafter. Screen workers return components/actions and exact wiring notes. |
| `packages/domain/src/engine.ts` | SAFE-01/SAFE-02 changes are serialized under the integrator's lease. Cost/geometry modules have separate owners, but shared engine call sites are never edited concurrently. |
| `packages/domain/src/cost.ts` and monetary helpers | SAFE-03; DATA-07 supplies curated facts, APP-03 displays outputs. Neither invents independent billing arithmetic. |
| Profile/default forms, onboarding and durable settings storage | APP-02. SAFE-02 supplies the guidance selector/registry contract; APP-05 supplies cache helpers/panel; shared persistence integration is coordinated through APP-02. |
| Shared UI primitives and formatting | APP-07. Caller changes go to each screen owner or the integrator; no mass concurrent refactoring of every screen. |
| Chart/result presentation | APP-04; APP-07 proposes accessible props/caller changes without competing edits. |
| Planner/saved UI | APP-06. APP-05 creates a separate cache-management component and integration note. |
| Watch UI | APP-08. Native protocol remains separately owned by the integrator; no UI worker silently changes Swift/Kotlin payloads. |
| Native iOS / Android directories | WATCH-01 / WATCH-02 respectively, then released to WATCH-03. WATCH-04 tests a frozen binary and files defects; it does not patch during a trial. |
| API `server.ts` / top-level route wiring | Integrator after initial OPS-01 request-boundary work. Data/provider workers create focused modules and request route wiring. |
| Provider policy / shared budgets | DATA-01 capability facts and contracts; OPS-02 shared coordination and budget implementation. No per-screen fallback scheduler. |
| Ingestion CLI, pack composer and publication pointer | DATA-02 extraction, DATA-03 composition, DATA-06/07 separate source adapters, DATA-08 regional refresh. Shared entry-point edits are serialized by the integrator. |
| PostgreSQL migrations | Integrator allocates migration numbers. OPS-02 owns provider-budget state; DATA-08 owns regional run/lease state; OPS-03 applies/deploys them. |
| Root `package.json`, lockfile and CI workflows | OPS-04 under integrator control. Other workers request exact dependency/script changes and supply tested commands. |
| E2E/parity/device evidence | QA-01/02 browser tests; SAFE-04 assessment runtime corpus; WATCH-03 native watch corpus; WATCH-04 physical reports. Keep production exports independent. |

## Final integration inputs beyond early prerequisites

Implementation inputs are encoded as `final_integration_inputs` in `manifest.json`; QA-04's reporting inputs are separately encoded as `final_status_inputs`. They are evidence handoffs, not permission to develop against imaginary interfaces.

| Task | Final inputs |
| --- | --- |
| APP-02 | SAFE-02 approved selector/registry implementation for final form integration. |
| APP-03 | DATA-05 forecast composition and SAFE-03 cost output for final evidence presentation. |
| APP-07 | WATCH-01/02 runnable platforms for actual native keyboard/screen-reader evidence. |
| APP-08 | WATCH-03 verified state-machine outcomes before final integrated readiness acceptance. |
| OPS-03 | DATA-08 refresh job/migration for final invocation/recovery evidence; container preparation can precede it. |
| OPS-04 | WATCH-01/02/03, QA-01/02 and SAFE-04 actual runnable verification commands. |
| QA-01 | APP-02 through APP-08 integrated controls before claiming the complete journey is covered. Initial harness work begins after APP-01. |
| QA-02 | WATCH-01/02 and APP-05 integrated persistence/cache behavior for native checks; browser checks proceed independently. |
| QA-04 | Evidence/status from every other task, including explicit BLOCKED/NOT_RUN, rather than a requirement that all tasks already be done. |

QA-03's full data and assessment dependencies, APP-05's storage/budget dependencies, DATA-08's OPS-02 dependency and WATCH-04's APP-08 dependency are already included in their task frontmatter. QA-03 can prepare templates early; final review binds the final component/engine hashes. WATCH-04 can prepare a protocol early; acceptance requires the final integrated binary.

## External resource decisions

| Resource | Identify by | If absent |
| --- | --- | --- |
| Full Xcode/iOS SDK, supported Android SDK/JDK, emulator/simulator capability | D1–D2 | Finish read-only diagnosis and portable tests; actual affected build ACs remain blocked. |
| Existing signing identity and physical iOS/Android devices | D1–D2 | No account/signup/purchase workaround. Install/device/watch/accessibility ACs remain blocked. |
| Qualified Keys maritime reviewer and safe on-water operator arrangements | D1 through the project owner | Build the dossier and review protocol; no fabricated approval or external contact. |
| Applicable approved equipment source and station/coverage review | D2–D5 | Empty/unapproved registry and unknown coverage remain valid; recommendations cannot pass those checks. |
| Confirmed provider rights, public-source accessibility and approved policy settings | Per DATA-01, before activation | Display capability as unavailable/unknown and preserve bounded failures; do not activate an unlicensed fallback. |
| Local Docker/PostgreSQL and already-authorized staging | D2 | Verify what can run locally; inaccessible deployment/restore evidence is blocked. |
| Native CI runners already available | By D6 | Commit reproducible commands and ordinary CI; record native CI as blocked, not successful via export. |

## Scope reduction if reality exceeds capacity

1. Keep baseline preservation, contract consistency, live-data guards, conservative assessment, durable-save correctness and truthful watch readiness as P0.
2. Finish reproducible browser E2E/offline tests, provider limits, real-source provenance/omission reporting and actual available native build checks before visual polish or extra curated examples.
3. Delay APP-03/04/06 presentation/lifecycle expansion and additional DATA-07 records if needed, while preserving existing behavior and reporting unresolved defects. Unknown tariff behavior must still remain correct.
4. OPS-04 is P1 overall, but a confirmed critical dependency vulnerability cannot be deferred solely because of that label; triage severity and exposed usage explicitly.
5. If native resources or human approval fail to materialize, deliver a limited internal alpha with those capabilities disabled/unverified. Record unfinished ACs and exact next actions. Do not substitute mocked device results or treat discovered maps as verified anchoring coverage.

Do not cut boundary/unknown-data tests, lower required monitoring evidence, relax source rights or change the definition of PASS to meet a calendar target. Any reduced scope belongs in the final report and manifest status ledger maintained by the integrator.
