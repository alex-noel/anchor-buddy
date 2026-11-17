# Anchor Buddy app quality plan

**40 scoped tasks for the current app, prepared 17 November 2026.** Improve everyday usability, make saves and recovery trustworthy, and finish existing planning/offline/watch flows. Keep the current product direction and reuse delivered work.

Start with **Q01, Q06 and Q08** in parallel: visual foundations, a repeatable browser harness, and durable saves. Assign Q33 soon after a watch reviewer is available. Check native toolchain availability early for Q36/Q37; do not let external setup stall independent UI work.

Execution was subsequently authorized with model/reasoning tiers matched to complexity. Read the [execution and acceptance status](EXECUTION.md) before dispatching: the initial order above is retained as planning history. Current task statuses and evidence are in the manifest and individual briefs.

- [Worker instructions and assignment prompt](WORKER_INSTRUCTIONS.md)
- [Dispatch order and shared-file ownership](DISPATCH.md)
- [Current findings and verification](AUDIT.md)
- [Machine-readable briefs and dependencies](manifest.json)

Each task below links to a self-contained brief with the observed gap, files, implementation boundary, acceptance criteria and focused verification. **14 Routine, 23 Engineering, 3 Specialist tasks.** Routine tasks suit a cost-efficient implementer. Engineering tasks can also use a cost-efficient coding model when the specified contract is fixed and a stronger reviewer checks the result. Specialist tasks need native/integration expertise or external evidence. These tiers are routing advice, not current model pricing claims.

Priority: **P0** fixes correctness, durable state, watch readiness or acceptance blockers; **P1** improves clarity and usable completion. Dependencies and file leases control order, not the ID or priority alone. Effort ranges estimate focused implementation and local verification by a developer; they are not model runtime estimates or a calendar promise. External SDK/signing/device/reviewer waiting is excluded.

## Shared UI and test foundations

| Task | Outcome | Priority | Worker | Effort | Requires |
| --- | --- | --- | --- | --- | --- |
| [Q01](tasks/Q01.md) | Unify visual hierarchy and semantic colors | P1 | Routine | 3–5 h | None |
| [Q02](tasks/Q02.md) | Finish shared controls and keyboard selection | P1 | Routine | 4–6 h | Q01 |
| [Q03](tasks/Q03.md) | Connect validation errors to their fields | P0 | Routine | 3–5 h | Q01 |
| [Q04](tasks/Q04.md) | Make sheets preserve focus and unsaved work | P1 | Engineering | 4–6 h | Q02, Q03, Q08 |
| [Q05](tasks/Q05.md) | Polish the responsive app shell and notices | P1 | Routine | 3–5 h | Q01, Q02 |
| [Q06](tasks/Q06.md) | Add a repeatable browser journey harness | P0 | Engineering | 5–8 h | None |

## Reliable setup and editing

| Task | Outcome | Priority | Worker | Effort | Requires |
| --- | --- | --- | --- | --- | --- |
| [Q07](tasks/Q07.md) | Use exact conversions consistently | P0 | Engineering | 2–4 h | None |
| [Q08](tasks/Q08.md) | Commit vessel and default saves before closing | P0 | Engineering | 5–8 h | None |
| [Q09](tasks/Q09.md) | Serialize preference changes and report failures | P0 | Engineering | 3–4 h | Q08 |
| [Q10](tasks/Q10.md) | Recover readable data after partial startup failure | P0 | Engineering | 4–6 h | Q08 |
| [Q11](tasks/Q11.md) | Finish setup as one durable configuration | P0 | Engineering | 3–5 h | Q08, Q09, Q10 |
| [Q12](tasks/Q12.md) | Make vessel configuration easier to complete | P1 | Routine | 3–5 h | Q03, Q04, Q07, Q08 |
| [Q13](tasks/Q13.md) | Organize search into area stay and limits | P1 | Routine | 4–6 h | Q03, Q04, Q07, Q08, Q12 |
| [Q14](tasks/Q14.md) | Clarify stay timezones and calendar interaction | P1 | Engineering | 3–5 h | Q02, Q13 |

## Search maps and result understanding

| Task | Outcome | Priority | Worker | Effort | Requires |
| --- | --- | --- | --- | --- | --- |
| [Q15](tasks/Q15.md) | Make submitted search progress and completion truthful | P1 | Engineering | 3–5 h | Q13 |
| [Q16](tasks/Q16.md) | Recover map loading and renderer errors | P1 | Engineering | 4–6 h | Q01, Q05 |
| [Q17](tasks/Q17.md) | Keep map markers ranks and selection consistent | P1 | Engineering | 4–6 h | Q01, Q16 |
| [Q18](tasks/Q18.md) | Improve result card scanning and status language | P1 | Routine | 3–4 h | Q01, Q02 |
| [Q19](tasks/Q19.md) | Explain filters and empty result states | P1 | Routine | 3–4 h | Q05, Q15, Q18 |
| [Q20](tasks/Q20.md) | Group details around evidence and next actions | P1 | Routine | 4–6 h | Q01, Q04, Q18 |
| [Q21](tasks/Q21.md) | Summarize forecast coverage for the whole stay | P1 | Engineering | 4–6 h | Q14, Q20 |
| [Q22](tasks/Q22.md) | Render prices without invented currency or precision | P1 | Engineering | 2–4 h | Q07 |

## Planning saved work and offline use

| Task | Outcome | Priority | Worker | Effort | Requires |
| --- | --- | --- | --- | --- | --- |
| [Q23](tasks/Q23.md) | Make anchor-plan editing and arrival checks clearer | P1 | Routine | 3–5 h | Q01, Q03, Q04, Q17 |
| [Q24](tasks/Q24.md) | Save anchor-plan drafts and reassess on return | P1 | Engineering | 6–10 h | Q08, Q10, Q23, Q25, Q26 |
| [Q25](tasks/Q25.md) | Make the saved library limits and history explicit | P1 | Engineering | 3–5 h | Q01, Q08, Q10 |
| [Q26](tasks/Q26.md) | Keep deletion pending until it succeeds | P1 | Engineering | 4–6 h | Q08, Q25 |
| [Q27](tasks/Q27.md) | Show map-download stages and usable progress | P1 | Routine | 3–5 h | Q01, Q02, Q04 |
| [Q28](tasks/Q28.md) | Expose storage usage and protect retained evidence | P1 | Engineering | 4–6 h | Q08, Q10, Q25, Q26 |
| [Q29](tasks/Q29.md) | Cancel reviewed-pack operations safely | P1 | Engineering | 4–6 h | Q08, Q10 |
| [Q30](tasks/Q30.md) | Make connectivity and evidence freshness visible | P1 | Routine | 3–5 h | Q05, Q15, Q20 |
| [Q31](tasks/Q31.md) | Expose offline app readiness and waiting updates | P1 | Engineering | 4–6 h | Q05 |
| [Q32](tasks/Q32.md) | Organize Settings and localize action feedback | P1 | Routine | 3–5 h | Q01, Q02, Q09, Q29, Q31 |

## Watch integration and final acceptance

| Task | Outcome | Priority | Worker | Effort | Requires |
| --- | --- | --- | --- | --- | --- |
| [Q33](tasks/Q33.md) | Validate and cancel watch position capture | P0 | Engineering | 3–5 h | None |
| [Q34](tasks/Q34.md) | Keep watch readiness aligned with native checks | P0 | Engineering | 4–6 h | Q02, Q33 |
| [Q35](tasks/Q35.md) | Confirm stopping and verify watch transitions | P0 | Routine | 2–4 h | Q04, Q34 |
| [Q36](tasks/Q36.md) | Compile and install the real iOS app | P0 | Specialist | 4–8 h + external setup | None |
| [Q37](tasks/Q37.md) | Compile and install the real Android app | P0 | Specialist | 4–8 h + external setup | None |
| [Q38](tasks/Q38.md) | Verify responsive layouts and accessible journeys | P1 | Engineering | 4–6 h | Q06, Q11, Q12, Q13, Q14, Q17, Q18, Q19, Q20, Q21, Q23, Q25, Q27, Q30, Q32, Q35 |
| [Q39](tasks/Q39.md) | Prove save and offline recovery end to end | P0 | Engineering | 5–8 h | Q06, Q08, Q09, Q10, Q11, Q16, Q24, Q25, Q26, Q27, Q28, Q29, Q30, Q31 |
| [Q40](tasks/Q40.md) | Record integrated acceptance and remaining gaps | P0 | Specialist | 4–6 h + external acceptance | Q01–Q39 |

## Relationship to earlier work

This is the next **application-quality tranche**, replacing the old plan's proposed dispatch order for this purpose. It does not declare the full maritime/backend release backlog complete. Preserve completed FOUNDATION-01/02, APP-01 and DATA-01. Preserve the implemented SAFE-01 and OPS-04 work and their outstanding external gates. Each brief identifies the relevant old task where applicable.

Broader reviewed ENC/station/equipment/tariff work, native-engine parity and overnight/on-water trials, provider scaling, API resource/privacy hardening and deployment remain in the [earlier backlog](../2026-11-12-two-week/TASK_INDEX.md) and [release checklist](../../release-checklist.md). Current code findings outside this tranche are recorded in [AUDIT](AUDIT.md). Missing reviewed equipment/data cannot be fixed by better UI or fabricated values.

No new account system, booking/payments, AI integration, new provider expansion, cloud deployment or runtime sample data is included. A usable internal app and a certified nautical release are separate acceptance outcomes. The initial plan left app source unchanged; the authorized execution now includes the implementation and verification recorded in EXECUTION.md.
