# Anchor Buddy: two-week implementation and validation plan

Planning date: **11 November 2026**. Work window: **12–25 November 2026**, ten working days in Europe/Warsaw. This is a proposed work plan, not a record of completed implementation or approved maritime capability.

The target is a reviewable **internal alpha**: reliable controls, reproducible real-source ingestion, explicit evidence gaps, tested caching, actual native builds where tools are available, and an honest acceptance ledger. Complete worldwide safety coverage and public release are not promised within this window.

## Start here

- [Worker instructions and copyable assignment](WORKER_INSTRUCTIONS.md): attach this to every delegated task.
- [Schedule, reservations and dispatch rules](DISPATCH.md): dependency order, daily assignments, shared-file ownership and external gates.
- [Task index](TASK_INDEX.md): all 34 individual, copy-ready briefs with effort and dependencies.
- [Combined task book](ALL_TASKS.md): the common instructions followed by every full task brief in one file.
- [Machine-readable task manifest](manifest.json) and [dispatch CSV](dispatch.csv): importable task metadata. They are initial planning state, not an automatically updated progress tracker.

The briefs define **249 acceptance criteria and 231 mapped test cases**. Every brief contains a direct instruction, baseline code references, ownership boundaries, technical requirements, numbered acceptance criteria, explicit test cases, validation commands, handoff requirements and stop conditions. The briefs are designed for bounded implementation by less expensive workers; safety semantics, contracts and final evidence still need a designated expert reviewer.

## What already exists

Do not rebuild completed functionality merely because it appeared in an earlier product request. The planning baseline includes an Expo/React Native application, MapLibre web/native display, a TypeScript API and deterministic domain package, Python/GDAL ingestion, local persistence, regional download/cache mechanisms and Swift/Kotlin watch implementations.

The current product already has onboarding/tour, empty initial Explore, map/list views, quick and advanced filters, multiple seabed choices, local boat/default settings, source inspection, saved searches/maps and a plan/watch journey. Recent work addressed stale selections, cancelled search drafts, manual pins and changes to boat/search settings. The next pass must preserve those fixes while correcting remaining control and persistence defects.

Existing live integrations supply different kinds of evidence: public map display, boating POIs, point forecasts, NOAA station products and scientific seabed/depth context. These are **not interchangeable with complete reviewed anchoring coverage**. Europe and Asia map discovery already exist; this sprint improves source capability reporting and caching validation rather than claiming complete regional chart analysis.

A real NOAA ENC extraction pilot exists for cell US5FL4DR. Its recorded assembly includes substantial unsupported/omitted content and no approved complete analytical coverage. There is no basis to mark that pilot, station relationships, equipment guidance or all tariff data reviewed automatically. Preserve the runtime synthetic-data rejection boundary.

The prior validation reports record 237 automated tests plus web/native JavaScript export checks. These are historical baseline evidence to re-establish in FOUNDATION-01, not a fresh result from writing this plan. Native JavaScript/Hermes exports are not native compilation, executable Swift/Kotlin parity or physical overnight-watch evidence. Read [the controls audit](../../controls-audit-2026-11-11.md), [live-data walkthrough](../../live-only-e2e-2026-11-11.md), [validation report](../../validation-2026-11-11.md) and [release checklist](../../release-checklist.md).

## Outcomes by the end of the window

| Outcome | Required evidence | If a prerequisite is unavailable |
| --- | --- | --- |
| Controls behave consistently from setup through saving and planning | APP tasks plus repeatable QA-01/02 walkthroughs, field validation, cancellation, late-response and storage-failure checks | Fix or disable the broken action; expose a specific recovery state. |
| Real evidence is assembled reproducibly | Original-source provenance, immutable component hashes, omission inventories, freshness/rights status, conservative unknowns and repeatable ingestion | Deliver the unapproved artifact and explicit gaps; keep recommendation gates closed. |
| Europe/Asia discovery and downloaded areas are honestly represented | Real-source regional smoke checks, capability matrix, offline/integrity tests and cache/update UX | Retain only available layers; explain missing analysis or offline permission. |
| Calculations remain deterministic and conservative | Geometry/equipment/cost regression cases, exactly-once uncertainty and cross-runtime comparison artifacts | A failing or untested capability cannot be labelled verified. |
| Native watch is exercised beyond a JS export | Actual platform builds, Swift/Kotlin scenario parity, integrated readiness UI and controlled physical trials | Code may be merged with watch capability gated; report which platform evidence is missing. |
| Deployment and maintenance are reproducible | Resource limits, shared provider budgets, repeatable CI, container health, backup/restore and rollback evidence | Local verification may finish; inaccessible staging remains unverified. |
| The release decision is reviewable | QA-04 ledger of every AC, known defects, external gates and capability-specific go/no-go | Issue a no-go or limited internal-alpha decision; never fabricate a green release. |

## Staffing, effort and scope

There are **34 tasks totaling 341 active hours**. Reserve **20% contingency: 68.2 hours**, giving **409.2 hours** of planned task effort including contingency. These are estimates, not promises.

Assume six implementation worker slots available for eight working hours per day, plus a dedicated integrator/reviewer. The integrator owns FOUNDATION-01/02 and QA-04: 24 of the 341 task hours. The remaining 317 hours belong to implementation slots; allow roughly 63.4 hours of their contingency there. Reserve an additional team allowance of about 35–45 hours for reviews, file reservations, merge resolution and defect triage, led by the integrator. This includes an independent qualified engineer reviewing FOUNDATION-02 and any safety/native change authored by the lead; the author cannot self-approve. Six workers at six hours per day would not provide equivalent capacity after dependencies and contingency; reduce scope explicitly if that is the actual staffing model.

Time for toolchain downloads, provider response delays, signing/device access, qualified external review and human overnight observation is not interchangeable with active coding hours. WATCH-04 requires two eight-hour runs on **each** platform: 32 platform-hours of observation, potentially two nights with iOS/Android tested in parallel. Availability of those resources is an external gate.

| Lane | Tasks | Base hours | Main purpose |
| --- | ---: | ---: | --- |
| Foundation | 2 | 14 | Reproducible baseline and frozen interfaces |
| Data | 8 | 68 | Provenance, real ingestion, coverage, tides/weather/rules/places and refresh |
| Assessment | 4 | 42 | Hazard primitives, equipment, tariffs and runtime parity |
| Application | 8 | 71 | Controller, durability, evidence UX, maps, cache, saved plans, accessibility and watch handoff |
| Native watch | 4 | 50 | Actual builds, executable parity and device trials |
| Operations | 4 | 54 | API limits, provider coordination, deployment and CI |
| QA/integration | 4 | 42 | E2E, offline faults, maritime dossier and final decision |

## Week one: establish stable interfaces and remove bottlenecks

Pin the complete current working state before multiple workers branch. Freeze only the schema changes required by named tasks. In parallel, prepare native toolchains, dependency inventory, human/device availability and the review ledger using read-only preflight work.

After the contract gate, extract the application controller, establish real platform build commands, define provider policy, bound API work and implement hazard primitives. Then develop data normalizers, durable forms, cost/equipment logic and the browser test harness on independent file reservations. Do not permit parallel workers to edit the application shell or shared schemas independently.

The week-one checkpoint is engineering evidence, not a map full of nominally safe recommendations: reproducible baseline, frozen contracts, build/toolchain status, explicit missing-data inventory, initial controller tests and a functioning source-backed ingestion path.

## Week two: integrate, break deliberately, and verify

Integrate data components and shared provider coordination, then exercise cache/update failures, browser offline behavior and saved-plan reassessment. Compare domain outputs across actual runtimes. Test native watch state machines and the final readiness interface before physical trials.

Prepare the hash-bound maritime dossier as source/engine outputs stabilize. If qualified review or a safe human-controlled trial cannot occur, retain the dossier and the blocked ACs. Run final native trials on the planned nights only when prerequisites genuinely pass. Finish with controlled deployment recovery, regression runs, secret/privacy review and the capability-level release decision.

## Explicit non-goals

- New provider/email accounts, paid subscriptions, chart contracts or obtaining credentials on the user's behalf.
- A Garmin plugin, booking, payments, navigation routing, guaranteed approach clearance or live berth availability without an authoritative source.
- Enabling the assistant without approved partner/mobile authentication; there is no separately billed API fallback in scope.
- Invented tariff tables, complete global tide/current coverage, fabricated reviewed equipment presets or synthetic production recommendations.
- Guaranteeing public release or overnight safety within two weeks. Human maritime approval and physical device validation remain independent requirements.
- Rewriting the whole application, switching infrastructure vendors or adding a new state framework simply to distribute work.

## Completion and scope control

Task dependencies mean the referenced **engineering contract and code** must be reviewed and available before dependent implementation integrates. They do not allow an unavailable maritime or device approval to be assumed. The manifest lists separate final evidence inputs for tasks whose early preparation can proceed independently.

Each AC is reported as PASS, FAIL, BLOCKED or NOT_RUN. A task with blocked required ACs is not `done`; use `implemented_awaiting_external_evidence` when correct engineering is merged behind the appropriate gate. QA-04 can finish an honest no-go report even when other tasks remain blocked.

If delivery slips, preserve correctness, live-data boundaries, durable saves, provider limits and truthful watch status first. Defer polish or additional curated records before removing a safety test. Do not manufacture an “all features complete” outcome by deleting blocked ACs. The detailed reduction order and daily dispatch are in [DISPATCH.md](DISPATCH.md).

## Verify or regenerate this plan

Run `python3 docs/plans/2026-11-12-two-week/build_plan.py --check` to verify IDs, every AC-to-test mapping, dependency cycles (including final integration inputs), local Markdown links and generated-file consistency. Run the same command without `--check` after editing briefs or common instructions to regenerate the index, task book, CSV and manifest. This validates planning documents; it does not run the application or satisfy any implementation AC.
