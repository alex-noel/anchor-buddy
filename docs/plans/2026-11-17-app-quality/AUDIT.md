# Current app findings and baseline

Reviewed baseline: `f7e00acdb9423fb212486931a0cb354e227e41ec`, 17 November 2026, Europe/Warsaw. The worktree was clean before planning. Only this planning directory is added; no app implementation changes were made.

## Fresh verification

| Check | Result |
| --- | --- |
| `npm run check` | Passed: runtime guard, all workspace typechecks, 260 Node tests and 24 Python ingestion tests, **284 total** |
| `npm run export:web --workspace=@anchor-buddy/mobile` | Passed; exported bundle and verified offline-shell preparation |
| Isolated browser smoke | Actual viewport 390×844 CSS px; completed local test vessel/default setup and skipped tour; inspected empty Explore, Settings and browser watch unavailable |
| Explore document width | 390 CSS px at a 390 CSS px viewport; no document-level overflow in this state |
| Native compilation, device watch, full offline fault suite | Not performed in this planning pass; remain open |

The browser used a dedicated isolated context and a clearly named local QA vessel, not a real user's boat. No API was started for this narrow smoke; no live source result, complete map rendering or positive nautical assessment was claimed. Screenshots were inspected inline; there is no retained screenshot artifact in this plan. The temporary browser tab and local static server were closed.

Local command logs: `/tmp/anchor-quality-plan-check.log` and `/tmp/anchor-quality-plan-export.log`. These ephemeral logs are supporting local evidence, not portable release artifacts. Future execution must capture its own current logs.

## Confirmed high-value gaps

| Finding | Current source | Planned work |
| --- | --- | --- |
| Form closes and active values change before durable save succeeds | App.tsx saveVessel/saveDefaults/persist; Forms.tsx submit callbacks | Q08–Q12 |
| One rejected startup read can hide otherwise valid state; corrupt and absent data are conflated | App.tsx startup Promise.all; storage platform modules | Q10 |
| Setup completion spans multiple independent writes | App.tsx finishSetup | Q11 |
| Reassessment success is announced before async data work completes | App.tsx openSaved | Q15 |
| Map error warning has no recovery reset | Chart.web.tsx error handler | Q16 |
| Map/list cap and selected status are separately represented | Both Chart variants and ResultCard | Q17 |
| Currency defaults to USD and fractional precision is capped at two | mobile units.ts money; domain format.ts | Q22 |
| Plan edits have no durable draft | PlannerScreen local state | Q24 |
| Saved searches silently discard older entries at 30 | App.tsx saveCurrent; workspace.ts readSavedSearches | Q25 |
| Delete dialog closes before async deletion outcome | SavedScreen confirmation callbacks | Q26 |
| Explicitly retained evidence is not clearly separated from the eight-region cache | regionalDataCore.ts cacheRegion | Q28 |
| Watch capture has weaker validation/cancellation than Planner | WatchScreen capture | Q33 |
| UI alarm-test boolean does not expire with the native 600000ms rule | WatchScreen; Swift module; Kotlin WatchRuntime | Q34 |
| Stopping watch is one direct press | WatchScreen active controls | Q35 |

Visual improvements such as progressive disclosure, spacing and card hierarchy are proposed refinements grounded in component structure. They are not claims that every current screen is broken. Modal focus behavior and broad responsive behavior must be measured before replacing framework behavior. The earlier integrated 500px limitation is historical; the new 390px smoke covers only the few states named above.

## Preserve completed work

The [execution ledger](../../validation/core-plan-execution.md) marks FOUNDATION-01, FOUNDATION-02, APP-01 and DATA-01 complete. SAFE-01 and OPS-04 are implemented with external evidence remaining. The new tasks continue unfinished APP/QA/native behavior; they do not rebuild controller extraction, provider registry or primitive geometry.

## Important work outside these forty tasks

The quality tranche focuses on the current app experience. Preserve these separate backlog items rather than treating their omission as completion:

- Reviewed real nautical coverage, station relationships, equipment guidance and source-specific tariff rules: old DATA-02–08, SAFE-02/03 and QA-03.
- Actual native-engine/cross-runtime parity, controlled overnight devices and qualified on-water review: SAFE-04 and WATCH-03/04. Q36/Q37 provide real build/install evidence, not all of those validations.
- API input validation/work bounds: server.ts accepts fractional maxGeneratedCandidates before engine.ts rejects it; candidate generation allocates/scans before truncation. Track under OPS-01; do not infer route protection from body-size limits.
- API public-metadata privacy: CO-OPS returns the internal mapping including reviewedBy; an explicit public projection is still needed under OPS-01.
- Container context hygiene: root Docker builds lack .dockerignore and copy broad source trees; follow up under OPS-03 before distribution.
- Provider coordination/scaling, operational refresh, backup/rollback and deployment remain under OPS-02/03 and DATA-08. No cloud deployment is included.
- Release dependency wording contains historical findings; Q40 reconciles current status with a fresh audit if available and keeps uncertainty explicit.

These findings are code-backed backlog references, not fresh live exploit, performance or deployment test results. No provider rights, maritime approval or device monitoring capability is inferred from passing automated checks.
