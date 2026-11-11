# Anchor Buddy — complete two-week worker task book

Generated from the common instructions and individual briefs. Edit the source files, then run `python3 docs/plans/2026-11-12-two-week/build_plan.py`. For dates, resources, ownership and final integration gates read [DISPATCH.md](DISPATCH.md); for scope read [README.md](README.md).

34 tasks; 341 base hours; 249 ACs; 231 test cases.

---

# Instructions for every Anchor Buddy worker

Use this document together with exactly one task brief from `tasks/`, the pinned baseline revision, and the integrator's file reservation. The task brief is written as a direct user instruction: implement it, verify its numbered acceptance criteria, and return evidence. Do not treat an acceptance criterion as a suggestion.

## Copy-and-paste assignment

```text
Continue Anchor Buddy in the provided repository.

Implement task: <TASK-ID and attached full task brief>
Common instructions: <attach this entire WORKER_INSTRUCTIONS.md>
Baseline revision: <full Git SHA from FOUNDATION-01>
Merged prerequisite revisions: <task ID -> full Git SHA>
Reserved files/directories: <explicit reservation from the integrator>
Contract revision: <FOUNDATION-02 merge SHA and docs/contracts/v2.md>
Target integration branch: <existing branch supplied by the integrator>
Available runtime/device resources: <actual tools and permitted devices>

Read the code and the task before editing. Implement only this scope. Preserve
the existing live-data guards and fail-closed assessment behavior. Do not create
accounts, purchase services, publish, push, contact others, or introduce credentials.

Run the relevant existing checks and the task's explicit test cases. Report each
AC as PASS, FAIL, BLOCKED or NOT_RUN, with evidence. If an input, native toolchain,
provider entitlement, physical device or human approval is unavailable, complete
independent engineering work and identify the exact blocked criteria. Do not
invent approval or substitute a JavaScript export for a native device test.

Return a reviewable change and the structured handoff defined below. Do not mark
the task complete unless every required AC actually passes.
```

The integrator fills every placeholder before dispatch. Attach the actual brief, not just its title. Workers need repository access and the merged prerequisite code; a prose plan alone is insufficient. File paths in briefs are repository-relative unless a brief declares a smaller path root. “Proposed” files/commands are work to create, not evidence that they already exist.

## Before changing anything

1. Read the assigned brief, relevant `AGENTS.md` files if any now exist, the root README/package scripts, the cited current code, and the frozen contracts. Confirm that the baseline exists locally and inspect `git status --short`. Preserve all pre-existing changes. Never reset or clean a shared working tree.
2. Work in an isolated checkout/worktree on `codex/<task-id-lowercase>`. Have the integrator resolve branch collisions. Reuse the declared baseline and merged prerequisites; do not start a second implementation from an old snapshot. Use separate local ports, databases and disposable test profiles where processes could collide.
3. Confirm the reserved files. New helpers and tests are preferred over edits to an unreserved central file. If wiring is required in `App.tsx`, `server.ts`, shared schemas, root dependencies or CI, send the owner a precise integration patch/note. Do not silently acquire ownership by editing first.
4. Build a checklist of AC IDs, test cases, required evidence and external prerequisites. Check the task's source claims against current code. Record any baseline difference that changes the approach.
5. Run the smallest relevant baseline check. If it already fails, retain the failure and notify the integrator. Do not spend the entire ticket fixing unrelated dependencies or claim your change introduced a pre-existing failure.

## Implementation rules

- Preserve the three assessment outcomes: passes configured checks, excluded, insufficient evidence. Ranking, filtering or prettier text cannot turn either of the latter into a pass. “Passes configured checks” is not a guarantee of safe anchoring.
- Runtime data must remain genuinely source-backed and explicitly classified. Never copy a fixture into app data, relabel synthetic evidence as real, invent a depth/price/coverage polygon, or flip review flags to make an example work. Empty results and explicit unavailable states are valid product behavior.
- Test-only analytical fixtures are allowed in isolated test entry points. Keep them out of runtime exports and distributable app bundles. Do not add a production endpoint or hidden flag that bypasses the real-data guard.
- Preserve original source/issue/retrieval dates, source currency, datums, units, rights and uncertainty. Cache access or retries must not make stale evidence fresh. A successful HTTP request does not establish complete geographical or time coverage.
- Use full-footprint unsimplified geometry for analysis. Rendered tiles, isolated scientific samples, bounding rectangles and absence of hazard objects are not proof of clearance. Forecast swing arcs never shrink full-circle exclusions.
- Apply the agreed tide convention exactly once: nominal converted `minWaterLevelM`/`maxWaterLevelM`, plus separate conservative `uncertaintyM`. The engine expands nominal bounds for clearance and rode. Do not expand in both ingestion and assessment.
- Do not invent scope ratios, equipment compatibility, operating limits, station mappings, tariffs, legal permissions, reviewer signatures or source reuse rights. Implement explicit unknown/unsupported states and the mechanisms for a future approved record.
- The native watch runs independently of navigation, JavaScript, internet and AI. UI actions that do not explicitly arm/stop it must not change its native session. Never automatically recenter the confirmed anchor. Do not show “Monitoring” without native status evidence.
- No public release, paid provider integration, account signup, email creation, contacting reviewers, booking a trial, message sending or infrastructure purchase is included in these tickets. Prepare reviewable artifacts and identify operator actions. Existing authorized local tooling and test infrastructure may be used.
- Do not commit credentials, local `.env` values, tokens, signing material, private boat tracks, personal vessel profiles, reviewer contacts or signatures. Use invented test identities only in isolated test data. Redact logs before adding evidence to the public repository.
- Keep changes narrow. Avoid unrelated redesign, dependency replacement, broad formatting, universal catch-and-ignore handling or opportunistic architecture work. Request a contract amendment if needed; compilation convenience is not a reason to weaken types or validation.
- Use official provider/framework documentation for uncertain current behavior. Record the consulted URL and date when a policy or integration decision depends on it. Unknown licensing or authentication remains unknown; a free endpoint is not automatically licensed for commercial/offline redistribution.

## Repeated control review

Apply these questions before implementation, after implementation, and during the final walkthrough. Report concrete defects under your task; send unrelated findings to the integrator with a reproduction rather than expanding your scope.

| Question | Required behavior to inspect |
| --- | --- |
| What user decision does this control support? | Remove or explain redundant choices; distinguish configuration, search draft and active state. |
| Are the available options complete and evidence-backed? | Vessel kinds, multiple seabeds, unknown values, fee status and equipment selections have explicit supported/unsupported meanings. Never hide missing evidence behind a default. |
| Is this a scalar, multi-choice or range? | Multi-seabed preferences stay multi-choice. Empty selection has a documented meaning. Zero, unset and unknown differ. |
| What units and precision does the user see? | Labels, input parsing, conversion, min/max and result formatting agree across nautical/metric/imperial modes. Changing units does not change the underlying value. |
| Whose timezone is this? | Human-readable stay times use the declared user/business timezone; UTC persistence and DST boundaries remain correct. Local presentation is separate from interval arithmetic. |
| Can the user finish without guessing? | Show required fields, examples and helper descriptions. Do not present a recommendation that lacks an approved source as an authoritative default. |
| What happens on invalid input? | Reject NaN, non-finite numbers, reversed dates, partial numeric strings and unsupported ranges; preserve the draft and show a field-specific message. |
| What happens on Save, Cancel, Back and retry? | Save succeeds only after persistence. Cancel restores prior active values. Back has a stable destination. Retry does not duplicate work or reset unrelated inputs. |
| Can stale work overwrite the user's new choice? | Resolve overlapping requests out of order; close/unmount during a request; verify that only the current generation can activate results. |
| What happens offline or without permission? | Explain current availability and recovery; preserve complete cached versions. A permission refusal does not produce fake location or fake success. |
| Is the result tied to the input the user sees? | Vessel, stay, map pin, filters, region, evidence versions and assessment revision match. Saved material is reassessed explicitly. |
| Can a keyboard or assistive technology operate it? | Accessible name, role, state, focus return, disabled explanation, touch targets and error announcement are usable. |
| Does it imply more certainty than the data supports? | Separate suitability, approach, availability, price completeness, coverage and native monitoring health. Unknown values remain visible. |
| Could this action alter a running watch? | Search, settings, cache, route changes and reopened plans cannot arm, stop or recenter implicitly. |

## Verification and evidence

Use the current package scripts; check the file before invoking a script. At the planning baseline the root exposes `npm run check`, `npm run typecheck`, `npm test`, `npm run test:ingest`, and `npm run check:runtime`. Workspace tests exist for domain, API, mobile and anchor-watch. Browser exports and native JavaScript exports are separate from native compilation. New parity/E2E/native commands described in tasks must be implemented and documented before they count as runnable checks.

For each test case record the exact command or human action, commit/binary/data versions, expected result, actual result and artifact location. Run appropriate checks for the change, then the integrator runs the combined suite. Re-run when a relevant implementation/data version changes; do not endlessly repeat already passing unrelated suites.

Controlled recorded responses are for repeatable tests. Live source checks are a separate bounded, opt-in exercise that observes provider budgets and source rights. A mocked request proves behavior under that response; it does not prove that a public provider is currently available or licensed. A browser offline toggle alone does not prove the network is unavailable. A successful Hermes export does not prove that Swift/Kotlin compiled, alarms sounded or monitoring survived screen lock.

Use these AC statuses without reinterpretation:

| Status | Meaning |
| --- | --- |
| PASS | The stated behavior was actually exercised or independently reviewed using the required evidence. |
| FAIL | The check ran and its expected result was not met. Include reproduction and owner. |
| BLOCKED | A named required input, tool, person, entitlement or device is unavailable. State exactly what would unblock it. |
| NOT_RUN | The check has not been attempted. It is not a pass or a blocker by default. |

Task status is separate: `planned`, `ready`, `in_progress`, `in_review`, `implemented_awaiting_external_evidence`, or `done`. Only all required ACs passing permits `done`. An integrator may merge correct engineering with an explicitly disabled capability and mark it `implemented_awaiting_external_evidence`. This permits consumers of the stable code contract to continue; it does not satisfy the missing approval or enable the capability. Never rewrite an external AC into an internal one to obtain completion.

## Handoff template

Create a task report at the integrator-approved validation location. Use this structure:

```text
Task / title:
Baseline SHA / prerequisite SHAs / final change SHA:
Task status:
Implemented behavior and user-visible outcome:
Changed files and ownership confirmation:
Contract or migration changes (approved by whom, revision):

AC ID | PASS/FAIL/BLOCKED/NOT_RUN | evidence | remaining action/owner
<one row for every AC, no omissions>

Test ID | command/action | expected | actual | input/binary SHA | artifact
<one row for every listed test; link any additional regression cases>

Existing checks executed and result:
Live-source checks versus controlled test checks:
Native build/device matrix, when applicable:
Secret/privacy review and redactions:
Operational changes / rollback or recovery:
Known limitations and external gates:
Integration steps for files owned by someone else:
Discovered out-of-scope defects with reproduction:
```

Keep public reports free of private absolute home paths and personal data. Repository-relative paths and synthetic test identifiers are sufficient. Preserve full sensitive evidence locally or in an operator-approved private store; provide a redacted reproducible summary for review.

## When to stop and escalate

Stop the dependent action when the frozen contract conflicts with source meaning, an approval is missing, a change would weaken a safety exclusion, production data would need to be fabricated, or you would overwrite another worker's files. State the precise conflict and a bounded proposed resolution to the integrator. Continue unrelated tests, documentation, interfaces and fail-closed behavior when possible. Do not wait silently for a credential or human review and do not “solve” the blocker by removing the gate.

If the estimate is likely to overrun by more than 25%, report the completed ACs and remaining work early. Split a reviewable implementation from unavailable external evidence; do not silently drop a requirement or change the acceptance criteria. The integrator controls scope reduction and the final capability decision.


---

Task source: [FOUNDATION-01](tasks/FOUNDATION-01.md) · 6h · P0 · prerequisites: none

# FOUNDATION-01 — Capture a reproducible baseline and establish worker branches

Prepare Anchor Buddy for parallel implementation. Preserve the current work, produce one reproducible integration commit, and give every worker an exact starting revision. Do not implement new product features in this task.

## Current implementation and inputs

Read `README.md`, `docs/controls-audit-2026-11-11.md`, `workers/ingest/REAL_ENC_SMOKE.md`, `package.json`, `.github/workflows/check.yml`, `.gitignore` and the actual working-tree diff. At planning time, substantial implemented work is uncommitted, including new source files and deletion of runtime demo modules. The remote branch alone must not be assumed to contain this work. The last recorded total is 237 tests; reproduce the result instead of trusting the number.

## Ownership and outputs

Own only baseline bookkeeping: proposed `docs/validation/baseline-2026-11-12.md`, an inventory of included changes, and the baseline commit/branch. Existing implementation files may be included unchanged after inspection; do not rewrite them to simplify the baseline. Keep downloaded charts, recordings, personal test data, `.env`, credentials, binary exports and `.artifacts/` out of source control. The output is an immutable baseline SHA and reproducible command/environment record, not a release tag.

## Instructions

1. Inventory tracked, untracked and ignored files using Git. Categorize each as implementation, permitted test fixture, documentation, generated artifact or unresolved ownership. Preserve all files, including unresolved ones. Never use a hard reset, broad clean or force push.
2. Inspect configuration examples and changed/new files for secrets and personal records. Run an available reputable secret scanner or a documented bounded pattern scan; report limitations. Do not print suspected secret values. Do not rewrite public Git history as part of this task.
3. Use Node 24, the lockfile and a documented Python 3.11+ runtime. In an isolated checkout/worktree populated with the intended baseline, run the commands below. Do not replace real-data failures with invented runtime records.
4. Record the distinction between successful TypeScript/Hermes export and native compilation. Keep unavailable Xcode/Android SDK/device checks explicitly unrun.
5. Commit the reviewed implementation snapshot on `codex/baseline-2026-11-12` or the integrator's assigned equivalent. If unrelated changes cannot be attributed, exclude them without deleting them and describe the unresolved dependency; do not declare the baseline ready if required code is missing.
6. Record the commit, tool versions, test totals, known failures, required ignored assets, and reproducible setup. Give future workers `codex/<task-id>-<short-name>` branches based on this SHA. A worktree must contain the baseline, not copies of another worker's evolving directory.

## Acceptance criteria

- **FOUNDATION-01-AC01:** The baseline SHA contains every implementation file required by the documented app walkthrough, including test-only runtime boundaries.
- **FOUNDATION-01-AC02:** A fresh checkout installs with `npm ci`; it needs no untracked source file from the original workspace.
- **FOUNDATION-01-AC03:** `npm run check` passes with recorded suite totals and command exit status.
- **FOUNDATION-01-AC04:** Web and iOS/Android JavaScript exports pass, with native compilation accurately marked separately.
- **FOUNDATION-01-AC05:** No credential, downloaded chart payload, generated native export or private device log enters the baseline commit.
- **FOUNDATION-01-AC06:** Existing user work remains recoverable; the report lists excluded/unresolved files without claiming they were completed.
- **FOUNDATION-01-AC07:** The integrator can create an isolated task branch from the recorded SHA and reproduce the same checks.

## Test cases

| ID | Setup and action | Expected result / AC |
| --- | --- | --- |
| F01-T01 | Fresh checkout of the candidate SHA; run `npm ci` then `npm run check`. | Exit 0, explicit suite totals; AC01–03. |
| F01-T02 | Run `npm run export:web --workspace=@anchor-buddy/mobile`. | Complete integrity-checked shell, no fixture imports; AC04. |
| F01-T03 | In `apps/mobile`, run `npx expo export --platform ios --platform android --output-dir /tmp/anchor-buddy-baseline-native`. | Bundles exported; no claim of native compilation; AC04. |
| F01-T04 | Inspect `git ls-files` and secret-scan candidate changes. | Ignored charts/exports/secrets absent; findings show paths only; AC05. |
| F01-T05 | Compare original workspace inventory before/after; create a second worktree from SHA. | No lost original files; second tree reproduces source completeness; AC06–07. |

## Handoff and stop rules

Deliver the SHA, report, exact commands, failures and clean ownership inventory. Do not publish/deploy a release or merge unrelated changes. If the baseline check fails, fix only an attributable baseline packaging omission; otherwise report the failing command and owner and keep downstream implementation blocked. Estimated effort: **6 worker-hours**, excluding dependency downloads.


---

Task source: [FOUNDATION-02](tasks/FOUNDATION-02.md) · 8h · P0 · prerequisites: FOUNDATION-01

# FOUNDATION-02 — Freeze versioned evidence, persistence and integration contracts

Define and implement the smallest compatible contract changes needed by the data, assessment, mobile and operations workers. Publish explicit schemas and migration rules before those workers edit shared types. Keep behavior conservative and prevent incompatible independent interpretations.

## Baseline and ownership

Read `packages/domain/src/types.ts`, `validation.ts`, `apps/api/src/providers/contracts.ts`, `live-types.ts`, `apps/api/src/packs.ts`, `workers/ingest/anchor_ingest/assessment.py`, `apps/mobile/src/lib/workspace.ts`, `storage.ts`, `storage.web.ts`, and the other task briefs. `RegionPack` currently lacks an explicit schema-version field; hazards accept only polygon areas; `ScopeGuidance` is embedded in the boat; `TariffBand` is season-oriented; source validity and forecast validity share existing timestamp fields.

Own shared domain/public API types, their validation contracts and proposed `docs/contracts/v2.md` plus small contract tests. Do not edit the assessment algorithm, provider fetchers, native watch protocol or App screens. You are the only shared-schema editor in this wave. Later workers propose schema amendments to the integrator instead of editing these files concurrently.

## Requirements and instructions

1. Produce a field-by-field compatibility table covering existing versus proposed fields, required/optional/null meanings, migration ownership and rejection behavior. Freeze longitude/latitude order, WGS84, metres, knots, true bearings, UTC instants, IANA business timezones, and half-open calculation intervals. Preserve original provider datums and units alongside normalized values. Freeze the UI conversion policy: untouched drafts retain their exact canonical number; edited numbers convert from the declared unit without intermediate display rounding. Compare calculated edited values against the exact specified conversion using epsilon `max(1e-9, abs(expected) * 1e-12)` in canonical units. This is a UI arithmetic test tolerance, never permission to alter a safety threshold or geometry outcome. Document display rounding separately.
2. Specify a versioned evidence envelope. Distinguish source observation/survey/model issue time, retrieval time, refresh eligibility, usable freshness, forecast interval, rights/entitlement and review status. Add only fields required by a named consuming task. A refresh or cache read must not advance original issue/retrieval dates.
3. Define point/line/polygon hazard primitives and positional-uncertainty provenance for SAFE-01/DATA-02. Unknown object dimensions or uncertainty cannot become a zero-size assured-clear object. Marks remain display objects and do not imply complete hazard coverage.
4. Define independently versioned static evidence and dynamic forecast/tide components, composed snapshot identity, required source references, integrity hashes and review bindings. Changing a reviewed component invalidates that approval unless the documented review scope explicitly permits the change.
5. Define equipment-guidance references/compatibility fingerprints for SAFE-02. For SAFE-03/DATA-07, define tariff product/vessel/dimension selectors, source decimal rate precision, currency minor units, rounding stage, billing timezone/increments, tax inclusion, unknown mandatory charges, deposits and field-level source references. Registry entries without evidence remain unavailable. Do not select a nautical ratio or a tariff policy on an operator's behalf.
6. Specify versioned local profile/search/plan records and migration hooks. Legacy single seabed preferences are supported through the existing migration; legacy unproven snapshots remain hidden. Failed migration retains the original record for recovery and does not auto-arm any watch.
7. Implement validators/migration envelope helpers required to make contracts executable. Unknown major schema versions return an actionable unsupported-version result before activation. Keep current compatible packs readable; do not weaken `validateLiveRegionPack` to accept synthetic input.
8. Freeze tide semantics explicitly: `minWaterLevelM`/`maxWaterLevelM` are nominal interval bounds in the declared datum; `uncertaintyM` is a separate nonnegative conservative bound. Datum offsets change nominal levels; documented source/conversion/residual uncertainty is combined conservatively and applied exactly once by the assessment engine (subtract for clearance, add for rode). Never pre-expand bounds and then expand them again. Preserve unsupported relationships as unknown.
9. Record a fingerprint of the existing watch protocol in `modules/anchor-watch/src/types.ts` and `validation.ts`; preserve its behavior. The integrator owns any separately reviewed amendment. This task does not redesign or extend native watch behavior.
10. Publish examples that are explicitly test-only, a change log and each downstream task's permitted extension points. Record the integrator's approval of the interface, not a claim of maritime review.

## Acceptance criteria

- **FOUNDATION-02-AC01:** Every new field has type, units, null semantics, version and consuming owner documented.
- **FOUNDATION-02-AC02:** Existing permitted legacy records migrate without changing coordinates, money, dimensions or source dates.
- **FOUNDATION-02-AC03:** Unsupported major versions and missing required provenance are rejected before active state changes.
- **FOUNDATION-02-AC04:** Point forecast, chart display, seabed context and verified analytical coverage cannot be confused by the contract.
- **FOUNDATION-02-AC05:** Review identity is bound to component hashes and scope; automatic recomposition cannot self-approve changes.
- **FOUNDATION-02-AC06:** Synthetic runtime rejection and three assessment outcomes remain intact.
- **FOUNDATION-02-AC07:** Equipment/tariff extensions and persistence migration responsibilities have one named owner each; downstream dependency cycles are absent.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| F02-T01 | Parse an existing non-synthetic unreviewed ENC assembly and current discovery response. | Compatible input accepted with unchanged values and unreviewed state; AC02,06. |
| F02-T02 | Change schema major version to an unsupported value, then attempt activation. | Explicit unsupported result; prior complete pack remains active; AC03. |
| F02-T03 | Supply point forecast with no spatial review; supply a scientific DTM sample as depth evidence. | Neither satisfies analytical coverage schema; AC04. |
| F02-T04 | Change one reviewed static component's bytes but keep old review record. | Hash/review binding fails; no approved composition; AC05. |
| F02-T05 | Migrate a legacy saved search, then force the storage commit to fail. | Original recoverable record remains; no fabricated old result values; AC02–03. |
| F02-T06 | Pass explicitly synthetic and missing-synthetic-classification source records. | Existing live boundary rejects both; AC06. |
| F02-T07 | Normalize nominal tide bounds 0.6–1.2 m with separate uncertainty 0.1 m, then calculate clearance and rode. | Effective levels are 0.5–1.3 m, never 0.4–1.4 m; units/null semantics documented; AC01,04. |
| F02-T08 | Independently review the owner/consumer table and topologically sort all task prerequisites; exercise untouched and edited unit conversions. | Each extension has one owner, no cycle exists, unchanged canonical values are exact and edited conversions meet the frozen tolerance; AC01,07. |

Run existing `npm run typecheck`, `npm run test --workspace=@anchor-buddy/domain`, `npm run test --workspace=@anchor-buddy/api` and `npm run check:runtime`. New contract-specific commands must be added and documented before being reported as run. Deliver schema examples, test output and a consumer migration table. Estimated effort: **8 worker-hours**; expert review is required for semantics, not merely TypeScript compilation. Stop on conflicting source meaning rather than inventing a datum, validity window or approval.


---

Task source: [DATA-01](tasks/DATA-01.md) · 6h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02

# DATA-01 — Provider capabilities, coverage and permitted use

Implement a versioned provider capability registry that lets Anchor Buddy tell a user which real data products are available for an area and deployment, without confusing map display, analytical use, authentication or offline permission.

**Estimate:** 6 worker-hours. **Priority:** P0 enabling contract. **Prerequisites:** FOUNDATION-01 and the provider contract agreed in FOUNDATION-02. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. This is engineering work; it does not authorize account creation, accepting terms or buying data.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `apps/api/src/providers/contracts.ts`, `live-factory.ts`, `live-types.ts`, `apps/api/LIVE_DATA.md`, `packages/domain/src/types.ts`, and `apps/mobile/src/components/RegionalDataSheet.tsx`. A static `PROVIDERS` array and domain provider interfaces already exist. MET wind, regional waves, NWS, community places and EMODnet context are implemented; reviewed nautical coverage and commercial AI access are not established by their presence.

Own the provider descriptor implementation in `apps/api/src/providers/contracts.ts`, a proposed `apps/api/src/providers/capabilities.ts`, proposed `apps/api/test/capabilities.test.ts`, and a proposed `docs/data/provider-register.md`. Coordinate one merge window for `contracts.ts`. Treat `server.ts`, `live-factory.ts`, mobile files and shared domain types as read-only; give the integrator a wiring patch/request instead of concurrently editing them.

## Inputs, outputs and requirements

Input is a deployment configuration plus provider descriptors, not user-supplied assertions of license entitlement. Output is a serializable, nonsecret capability report using the FOUNDATION-02 envelope. Include stable provider/product IDs, implementation state, current availability, product role (`display-context` versus assessment evidence), supported geography, authentication mode, source/policy URLs, last policy verification date, attribution, refresh policy, and separate online display/offline storage/analysis rights. Represent unknown rights explicitly; a boolean true must have supporting policy evidence. Keep deployment credentials server-side and report only `configured`/`missing` capability status. A credential cannot activate a nonexistent adapter or broaden its licensed products.

Maintain current behavior when optional products are unconfigured. Do not request a provider outside its supported extent merely to discover it is unsupported. A regional extent is an adapter routing bound, never a declaration of positive nautical coverage. Publish statuses in stable order and distinguish disabled, unsupported area, unavailable response and partial coverage. Use the existing seven evidence-layer names unless FOUNDATION-02 explicitly changes them.

## Implementation instructions

1. Inventory every current descriptor and map it to a real adapter or an explicit pending capability. Record mismatches before changing code.
2. Recheck official policies referenced in `LIVE_DATA.md`; record retrieval/verification date and short factual permissions. Flag ambiguity for operator review. Do not copy lengthy terms into the repository.
3. Implement pure capability resolution from deployment configuration and request area. Never read or return secret values in the public result, logs or snapshots.
4. Add schema/runtime validation for unknown enum values, malformed URLs, missing attribution and rights records without evidence dates. Reject malformed descriptors at startup with a provider ID and a nonsecret explanation.
5. Give the integrator a documented backward-compatible response example for existing `GET /v1/providers` (currently `{ providers: PROVIDERS }`) and identify any shared summary changes needed in `/health` or `/v1/regions`; do not invent a second competing registry endpoint. Provide sample unsupported/disabled/partial states to APP coverage work.
6. Document how an operator adds a future implemented provider and how policy expiry prompts re-verification. Provider keys, passwords, account emails and tokens must not enter committed examples.

## Non-goals and stop conditions

Do not implement new paid chart downloads, scrape consumer Garmin/Navionics products, enable ChatGPT, create accounts or change the deterministic safety engine. If offline/analysis rights are ambiguous, keep them unknown and record the official question for the operator. Complete the registry mechanism and tests; do not label that provider approved.

## Acceptance criteria

- **DATA-01-AC01:** Every current provider ID has exactly one validated descriptor tied to an implemented adapter or an explicit pending state.
- **DATA-01-AC02:** Public reports and captured test logs contain no configured credential values, private contacts or credential-bearing URLs.
- **DATA-01-AC03:** Display, offline and analytical rights are distinct; missing evidence cannot resolve to permitted analytical/offline use.
- **DATA-01-AC04:** Outside-region requests resolve to unsupported coverage without invoking that provider transport.
- **DATA-01-AC05:** Unconfigured optional wave/AI/chart adapters remain disabled; core discovery remains available independently.
- **DATA-01-AC06:** Invalid descriptors fail validation with actionable, nonsecret errors, and capability output is deterministic for identical inputs.
- **DATA-01-AC07:** The dated provider register links primary policies and records unresolved rights separately from approved facts.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-01-T01 | Resolve the checked-in default deployment for Split. | Implemented global/European products appear with truthful role/status; no paid or AI capability becomes active. | 01,05 |
| DATA-01-T02 | Resolve an Asian point with a transport spy for EMODnet. | Unsupported Europe-only context, zero EMODnet requests. | 04 |
| DATA-01-T03 | Configure a test-only sentinel API key and serialize reports/errors/logs. | Sentinel is absent everywhere; only configured state is public. | 02 |
| DATA-01-T04 | Supply offline permission without a policy reference/date, then an unknown enum. | Both invalid descriptors are rejected; no default-to-true behavior. | 03,06 |
| DATA-01-T05 | Resolve identical inputs twice with reordered descriptor input. | Canonical public output is identical. | 06 |
| DATA-01-T06 | Review registry entries against their linked official pages. | Date, attribution, product scope and unresolved rights are inspectable; no copied license assertion lacks a source. | 07 |

Run existing `npm run typecheck --workspace=@anchor-buddy/api`, `npm run test --workspace=@anchor-buddy/api`, and `npm run check:runtime`. Add tests to the existing API test glob. Hand off the capability contract, changed-file list, command results and unresolved policy questions. Official starting references: [NOAA ENCs](https://charts.noaa.gov/ENCs/ENCs.shtml), [NWS API](https://www.weather.gov/documentation/services-web-api), [CO-OPS API](https://api.tidesandcurrents.noaa.gov/api/prod/), [MET terms](https://api.met.no/doc/TermsOfService).


---

Task source: [DATA-02](tasks/DATA-02.md) · 8h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02, DATA-01

# DATA-02 — Harden real ENC extraction and source mapping

Harden the existing NOAA ENC ingestion path so repeated real-chart imports remain reproducible, preserve source semantics and fail closed on unsupported geometry, datum, units or update chains.

**Estimate:** 8 worker-hours. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-01 product policy fields. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. Deliver import correctness and an explicit omission inventory, not a declaration that all chart hazards are supported.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `workers/ingest/REAL_ENC_SMOKE.md`, `README.md`, `anchor_ingest/sources.py`, `geometry.py`, `assessment.py`, `packs.py` and `tests/test_assessment.py`. The actual Key West cell US5FL4DR already yielded 4,299 source objects, 288 depth areas, 40 polygon hazards and 77 marks. Do not rebuild this feature as if it were missing. Source sounding datum, height datum and depth-unit codes are distinct. Isolated soundings and non-area hazards remain in SQLite/omission reports; coverage and survey quality are not inferred.

Own focused changes in `sources.py`, `geometry.py`, `assessment.py`, associated Python tests, and the ingestion verification documentation. Reserve these files during this task; DATA-03 starts after this merge. Shared `packs.py`, `__main__.py`, API/domain files and Docker images are read-only unless the integrator approves a serialized patch. Do not change infrastructure dependency versions casually.

## Inputs and outputs

Inputs are an explicitly selected NOAA exchange set, contiguous updates, provenance, and operator datum/unit mappings accepted by FOUNDATION-02. Outputs remain verified `analysis.sqlite`, unreviewed `assessment.json`, and an omission report. Preserve stable source identity plus split-point identity, update/edition metadata, exact geometry with holes, unknown bounds, original unit/datum codes and the transformation audit. Source artifacts remain outside source control in ignored storage; tests may use small attributed response samples only where redistribution is allowed. Synthetic geometry stays test-only.

The current `HazardArea` domain contract accepts areas only. After FOUNDATION-02 freezes the replacement primitive contract, serialize supported source point/line hazards into `assessment.json` with their original geometry, object class and source IDs. Preserve unknown extent/positional uncertainty explicitly as unknown; never replace either with zero or an invented buffer. Engineering serialization does not require maritime approval or completed SAFE-01 implementation. Keep hazard coverage incomplete while required uncertainty or object semantics remain unresolved. Unsupported classes retain raw geometry and omission reasons. Local M_SDAT/M_UNIT overrides still require an approved spatial resolver; withholding those depths is preferable to a cell-wide assumption.

## Implementation instructions

1. Add a repeatable small-source regression harness for split soundings, duplicate FIDs, missing updates, deleted features, mixed units and local datum/unit metadata. Capture actual GDAL version and command arguments in evidence.
2. Prove deterministic feature identity across two extractions of the same input; IDs must distinguish source objects/point ordinals without depending on filesystem traversal order. Detect genuine collisions instead of silently dropping records.
3. Validate every per-source mapping against raw sounding datum and unit codes. Preserve null lower/upper bounds. Normalize units only through explicit mappings, recording the conversion and source value.
4. Test and document update-chain enforcement and failed-run cleanup. A partial/new extraction must never overwrite a prior complete source pack or its current pointer.
5. Emit supported point/line primitives through the frozen schema and test unknown extent/uncertainty fields explicitly. Make remaining omission reports machine-readable by reason code, object class and source ID; summarize unresolved safety-critical classes, not only their total number. Retain raw geometry for subsequent review. If the shared contract is unavailable or contradictory, report this implementation blocked instead of claiming that retaining all primitives as omissions completes it.
6. Re-run US5FL4DR or its documented current replacement and one independently selected small adjacent cell. Record actual editions, update sequences and changed counts; do not assert that historical counts are fixed expectations.
7. Run TypeScript `validateLiveRegionPack` on the assembled result through an explicit small verification script or existing import path. Its acceptance must not change the unreviewed status.

## Non-goals and blockers

No rendered-tile clearance calculations, sounding interpolation, automatic survey-quality approval, universal datum conversions, bulk world download or manual edits that turn omission counts into complete coverage. If an official source is unavailable, preserve the last complete artifacts and attach an unavailable-source result; do not substitute fixtures as a successful live run. Report GDAL/toolchain blockers with the exact failing command.

## Acceptance criteria

- **DATA-02-AC01:** Same source/version inputs produce identical normalized feature IDs and canonical geometry/depth outputs.
- **DATA-02-AC02:** Split soundings remain individually addressable; collisions or missing update steps fail explicitly.
- **DATA-02-AC03:** Units/datums require explicit matching source codes; local overrides never silently inherit an unsafe cell-wide mapping.
- **DATA-02-AC04:** Supported source point/line hazards are serialized with original geometry/source IDs and explicit unknown extent/uncertainty when absent; null depth bounds, polygon holes and small hazards survive without invented interpolation/buffers. Unresolved hazard evidence keeps coverage incomplete.
- **DATA-02-AC05:** Every excluded mapping has a stable omission reason and retained raw source reference; unresolved critical classes block coverage approval.
- **DATA-02-AC06:** Interrupted/invalid runs leave the previous complete pack and pointer byte-for-byte unchanged.
- **DATA-02-AC07:** Two real selected-cell runs have provenance/hash evidence, and generated assessments validate structurally while remaining unreviewed.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-02-T01 | Extract the same saved exchange set twice into separate directories. | Stable IDs, geometry, bounds and omissions match after excluding creation timestamps. | 01,02 |
| DATA-02-T02 | Test-only chain omits `.002` but includes `.003`; run extraction. | Explicit update-gap failure, no published output. | 02,06 |
| DATA-02-T03 | Same numeric bounds with metre, foot and fathom mappings; include null upper bound. | Explicit converted metres match 1, 0.3048 and 1.8288 factors; null stays null. | 03,04 |
| DATA-02-T04 | Include a local datum override, isolated sounding, supported point obstruction and line cable with missing extent/uncertainty. | Point/line primitives serialize with original geometry/IDs and explicit unknown fields; no zero/buffer substitution or complete hazard coverage. Unsupported local datum and sounding interpolation remain documented omissions. | 03,04,05 |
| DATA-02-T05 | Inject duplicate IDs and fail after partial output writing. | Collision/failure is visible; previous pack/pointer hashes are unchanged. | 02,06 |
| DATA-02-T06 | Run two real bounded NOAA cells and validate assemblies in TypeScript. | All raw sources traceable; structural validation passes; no review/coverage is fabricated. | 05,07 |

Run existing `npm run test:ingest`, the exact `catalog/download/extract/build/verify/assemble` commands documented in `workers/ingest/README.md`, and `npm run check:runtime`. Any new harness command must be documented as newly introduced. Hand off actual commands, source hashes, object-class/omission tables, regression results and unresolved mappings. References: [NOAA ENC downloads](https://charts.noaa.gov/ENCs/ENCs.shtml), [GDAL S-57 driver](https://gdal.org/en/stable/drivers/vector/s57.html).


---

Task source: [DATA-03](tasks/DATA-03.md) · 10h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02, DATA-02

# DATA-03 — Compose immutable regional evidence and display packs

Implement composition of a small real Florida Keys pilot pack from separately versioned evidence components. Keep unsimplified analysis, rendered display assets and human review attestations separate, and preserve the existing release gate when a component or review is missing.

**Estimate:** 10 worker-hours. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-02. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. DATA-04/05/06/07 outputs are optional inputs to the composition mechanism, not prerequisites for its implementation. DATA-08 performs final integration after those tasks; do not create a dependency cycle.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `workers/ingest/anchor_ingest/assessment.py`, `packs.py`, `postgis.py`, `workers/ingest/README.md`, `apps/api/src/packs.ts`, `apps/mobile/src/lib/packInstall.ts`, and `packages/domain/src/types.ts`. Verified immutable source packs and unreviewed ENC assembly exist. API `FilePackStore.assessment()` requires reviewed release status plus maritime, coverage, geometry, station-mapping and on-water flags. Merely generating valid JSON must not satisfy them.

Own a proposed `workers/ingest/anchor_ingest/composition.py`, proposed composition tests, recipe documentation and serialized follow-up edits to `packs.py` after DATA-02. Treat `__main__.py`, domain schemas, API pack routes and mobile install code as integrator-owned; hand off explicit wiring changes. New modules/interfaces below are proposed, not claims of existing functionality.

## Contract and scope

Input is a composition recipe naming exact component IDs/versions/hashes, intended bounds, time zone, intended evidence validity and optional immutable review-attestation references. Components include chart analysis, rules/habitat, water levels, weather/current intervals, official places/tariffs, and display tile/style assets. Output is a new version directory with a manifest, checksummed assets, a `RegionPack` assessment, a composition report and references to original provenance. No network fetch belongs inside the pure composition function.

Require globally unambiguous IDs without silently changing semantic source IDs. Validate every referenced source and coverage ID. Retain component dates; composition time is not source retrieval time. Set aggregate validity conservatively while preserving each source's distinct interval. A source crop/search rectangle never establishes complete coverage. Use the FOUNDATION-02 review contract to bind attestations to component hashes and reviewed scope; changing a reviewed component must invalidate affected attestations. A chart-display asset can be present only with explicit storage rights; analysis must never be read back from simplified/rendered tiles.

## Implementation instructions

1. Define a pure validator/composer against the frozen contract. Identify required versus optional components per evidence layer; missing layers produce a machine-readable deficiency report and unreviewed output.
2. Merge exact source geometry and time intervals without cross-component interpolation. Detect conflicting IDs, incompatible datums, unknown unit conversions, incompatible bounds and overlapping contradictory records. Do not pick the more favorable value.
3. Integrate DATA-02 omission summaries into coverage eligibility. Any unresolved safety-critical primitive or chart seam must remain visible and prevent a complete claim for its affected area/layer.
4. Generate display assets only through the separately documented tile path with rights/attribution and source-version identity. Keep unsimplified SQLite/assessment geometry independently hashed.
5. Stage output in a temporary directory, validate asset size/hash/schema references, then atomically install an immutable version. Publishing the latest pointer is a separate action; failure leaves the previous complete version intact.
6. Enforce attestation identity: absent, expired, future-dated, mismatched-hash or insufficient-scope review cannot promote release status. Preserve existing on-water release requirements; internal technical review is not an equivalent.
7. Supply one real pilot recipe, composition report and API/mobile install handoff. If human-reviewed components are unavailable, deliver an honest unreviewed pilot and the exact missing-review manifest, not a falsely releasable pack.

## Acceptance criteria

- **DATA-03-AC01:** Composition consumes only immutable explicitly identified components and validates all hashes and reference IDs before activation.
- **DATA-03-AC02:** No component retrieval/expiry date is refreshed by composition, caching or publication.
- **DATA-03-AC03:** Missing/contradictory evidence and critical omissions remain explicit; no search rectangle or empty hazard collection becomes complete coverage.
- **DATA-03-AC04:** Display geometry/assets and unsimplified analysis remain separate and retain matching source-version references and attribution.
- **DATA-03-AC05:** Review attestations bind to exact content/scope; changing a bound component invalidates promotion. Existing API release gates remain effective.
- **DATA-03-AC06:** Failed or interrupted composition preserves the previous complete version and pointer; same version cannot be overwritten.
- **DATA-03-AC07:** A real pilot recipe produces a structurally valid pack plus a machine-readable deficiencies report without manufacturing approvals.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-03-T01 | Compose valid test-only components with distinct IDs and exact hashes. | Deterministic canonical content and references; source dates unchanged. | 01,02 |
| DATA-03-T02 | Remove habitat coverage and include unresolved line hazards. | Pack stays unreviewed with both missing items; no complete habitat/hazard claim. | 03 |
| DATA-03-T03 | Give a display polygon simplified enough to omit a small hazard. | Analysis still uses original geometry; display does not affect safety evidence. | 04 |
| DATA-03-T04 | Change one chart byte after producing its review attestation. | Hash mismatch blocks promotion/activation; prior version remains active. | 01,05,06 |
| DATA-03-T05 | Fail after writing half the staging assets; rerun into an existing version. | No partial current pointer; overwrite attempt rejected. | 06 |
| DATA-03-T06 | Compose the real pilot with missing human reviews, then request live assessment. | Unreviewed output is inspectable; existing API rejects live-assessment release. | 05,07 |

Run `npm run test:ingest`, `npm run test --workspace=@anchor-buddy/api`, and `npm run typecheck --workspaces --if-present` after integration. Document any new CLI as proposed until implemented. Handoff includes recipe, manifest and report locations, content hashes, dependency schema version, test commands, expected blocked release response and precise external review checklist. No credentials or large source datasets belong in the PR.


---

Task source: [DATA-04](tasks/DATA-04.md) · 10h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02, DATA-01

# DATA-04 — Normalize reviewed tide and current station relationships

Implement validated tide/current component assembly using explicit station-to-area relationships. Make it possible to ingest a reviewed Florida Keys pilot relationship without treating a nearby station, tide prediction or rectangular station bound as proof of local water levels or currents.

**Estimate:** 10 worker-hours. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-01. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. Deliver adapter/normalizer tests and a review-ready mapping dossier even if no maritime approval is available; analytical activation remains externally gated.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

`apps/api/src/providers/coops.ts` already validates `StationMapping` identity, review dates, bounding box, chart datum, offset and uncertainty, and retrieves raw CO-OPS predictions. It does not assemble `TideInterval` or complete coverage for live discovery. `packages/domain/src/types.ts` expects dated water-level bounds, coverage IDs, uncertainty and `stationRelationshipReviewed`; weather/current intervals share a separate contract.

Own focused CO-OPS validation/normalization changes, a proposed `apps/api/src/providers/water-level-components.ts`, corresponding API tests, and proposed operator mapping examples/docs. Coordinate changes to the existing `StationMapping` interface with FOUNDATION-02. Treat domain types, composition, `live-factory.ts`, `server.ts`, fixtures used by other lanes and UI files as read-only; submit integration requirements to their owner.

## Required contract

Mapping input must identify source station/product/bin where applicable, original and target datums, units, time basis, supported area geometry with holes if present, review identity/date/expiry, transformation provenance, allowed time range and the uncertainty model. The existing coarse bounding box may be retained as a fast rejection check; it cannot replace reviewed geometry. Persist no individual user's location history. Mapping reviewer names/contacts follow the agreed operator-record privacy policy; do not invent a human signature.

Output is a dated tide/current component for DATA-03, referencing original response/source IDs and mapping/version hashes. Freeze the FOUNDATION-02 contract as nominal `minWaterLevelM`/`maxWaterLevelM` in the target datum, plus separate nonnegative `uncertaintyM` (or null when unknown). Apply the signed datum offset to nominal levels; do not pre-expand them. The combined bounded uncertainty includes separately evidenced weather-driven residual and transformation contributions under the reviewed combination rule. The engine applies it exactly once: lower = nominal minimum − uncertainty; upper = nominal maximum + uncertainty. Astronomical predictions alone cannot establish total water-level certainty. Any unknown required contribution leaves uncertainty null and coverage incomplete. Tide height never supplies currents; product/bin equivalence requires review.

## Implementation instructions

1. Validate the current CO-OPS product parameter requirements against official documentation. Preserve UTC query/response times and source units; never parse station-local strings as device-local time.
2. Replace permissive raw-object handling at the component boundary with explicit response validation. Missing fields, error envelopes, bad numeric values, impossible timestamps and unsupported products need typed failures.
3. Implement interval segmentation from actual sample coverage and reviewed interpolation/envelope rules. A hole, endpoint gap, absent residual bound or unsupported product remains unknown; do not bridge it with a convenient constant.
4. Apply datum conversion exactly once with documented sign and units. Keep raw/nominal converted levels, offset, separate uncertainty contributions, combination rule and versions in the report. Reject negative uncertainty; never encode already-expanded levels as nominal bounds. Exercise the actual engine with assembled intervals to prove clearance and maximum-depth rode calculations apply uncertainty once. Shared engine edits belong to SAFE-01/the integrator; this task must not change clearance equations.
5. Require the complete candidate footprint to remain inside mapping coverage through the shared evidence contract. A successful station request at the search centre must not bless the whole search radius.
6. Prepare a small Keys mapping dossier using public station metadata, explicitly separating observed facts from review questions. Leave unapproved fields pending; do not set `reviewedBy` to an agent or developer and call it maritime approval.
7. Integrate via component output and typed unavailable reasons. Outages reuse only original dated cached evidence under OPS cache policy, never revised retrieval/expiry times.

## Acceptance criteria

- **DATA-04-AC01:** Invalid, expired, future-reviewed or wrong-datum mappings are rejected before requesting/assembling analytical evidence.
- **DATA-04-AC02:** Unsupported products/bins, malformed errors, NaN values and temporal gaps cannot create usable interval bounds.
- **DATA-04-AC03:** Conversion retains source units/datum, applies the signed offset once to nominal bounds, and emits separate nonnegative uncertainty. An assembly-to-engine test proves uncertainty expands water levels exactly once for clearance and required rode.
- **DATA-04-AC04:** Missing weather-driven residual uncertainty leaves water-level certainty incomplete; tide predictions alone do not set complete coverage.
- **DATA-04-AC05:** Coverage respects reviewed geometry/holes and the full footprint; a point inside a bounding box is insufficient.
- **DATA-04-AC06:** Current magnitude/direction comes only from its stated product and bin; tide heights never become currents.
- **DATA-04-AC07:** The real pilot dossier identifies source dates, product availability and unresolved reviewer decisions without fabricated approval.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-04-T01 | Test-only reviewed mapping has +0.4 m offset, source levels 0.2–0.8 m, residual uncertainty 0.06 m and transformation uncertainty 0.04 m with a test-only reviewed additive bound. | Component nominal bounds are 0.6–1.2 m and uncertainty is 0.1 m; effective bounds are 0.5–1.3 m only when the engine expands them. A negative uncertainty input is rejected. | 02,03 |
| DATA-04-T02 | Omit the weather-residual bound from the same input. | Incomplete evidence; no complete tide coverage or safe clearance assertion. | 04 |
| DATA-04-T03 | Expire mapping by one millisecond or request the wrong chart datum. | Typed rejection before HTTP request; zero transport calls. | 01 |
| DATA-04-T04 | Footprint crosses a reviewed polygon edge or a hole while its centre remains inside. | Evidence cannot cover the full footprint. | 05 |
| DATA-04-T05 | Remove a sample interval; return an API error or invalid current bin. | Gap/product failure remains unknown with an actionable reason; no interpolation by default. | 02,06 |
| DATA-04-T06 | Inspect a bounded live station metadata/prediction request and the dossier. | Source response, product and timestamps recorded; analytical activation still requires actual mapping approval. | 07 |
| DATA-04-T07 | Feed T01's assembled interval into the real domain engine with test-only complete evidence, same-datum chart bounds 5–7 m, draft 1.5 m, bow height 1 m and test-only reviewed ratio 7; provide 70 m usable rode and sufficient coverage. | Minimum/maximum depth are 5.5/8.3 m, minimum clearance is 4.0 m, and required rode is `ceil((8.3 + 1) × 7) = 66 m` under the existing conservative whole-metre rule. No second uncertainty expansion occurs. | 03,04 |

Run existing `npm run test --workspace=@anchor-buddy/api`, `npm run test --workspace=@anchor-buddy/domain` and `npm run typecheck --workspace=@anchor-buddy/api`; add assembly/engine contract tests to the API test glob. Hand off a component example, mapping schema migration notes, datum-sign/uncertainty tests, live-request evidence and outstanding maritime decisions. Reference: [official CO-OPS API documentation](https://api.tidesandcurrents.noaa.gov/api/prod/). Do not bypass provider access limits or create accounts to unblock this ticket.


---

Task source: [DATA-05](tasks/DATA-05.md) · 10h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02, DATA-01

# DATA-05 — Compose spatially bounded forecasts and official warnings

Implement forecast components that retain each product's actual spatial and temporal support, and combine them conservatively for the stay plus departure contingency. Continue showing real point forecasts even when they cannot establish complete anchorage weather/current coverage.

**Estimate:** 10 worker-hours. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-01. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. DATA-04 current components are accepted through the frozen contract when available; do not wait for its implementation to write/test this composer.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `apps/api/src/providers/nws.ts`, `nws-live.ts`, `met-norway.ts`, `met-ocean.ts`, `open-meteo.ts`, `discovery.ts`, `live-types.ts` and domain `WeatherInterval`/`CoverageArea`. NWS raw grid intervals and active alerts are fetched. MET ocean reports its actual snapped model coordinate. Live discovery deliberately does not claim full spatial safety coverage. Current `coverageAreaIds: ['live-weather-request']` cannot alone prove complete weather or current evidence.

Own `nws.ts`, `nws-live.ts`, a proposed `apps/api/src/providers/forecast-components.ts` and targeted tests. Coordinate any other provider adapter edit with the integrator; `discovery.ts`, `live-factory.ts`, `http.ts`, shared types and UI stay read-only. OPS-02 owns request budgets/cache behavior; this ticket supplies component semantics rather than a parallel transport stack.

## Inputs, outputs and constraints

Input comprises actual provider payloads, immutable source records, explicit spatial-support metadata, request start/end and separately reviewed current components. Output comprises nonoverlapping dated intervals, source/coverage references, missing-parameter flags and a component report. Preserve product ID, model/grid geometry or point, native resolution/coordinate, issue/retrieval/expiry times, units and any reviewer-approved applicability rules. Use the existing shared schema or the approved FOUNDATION-02 extension; never independently redefine it.

An economic request extent or arbitrary buffer around a model coordinate is not model coverage. If a provider exposes only a point sample, keep it as context with incomplete spatial evidence. Preserve wind direction conventions and distinguish significant wave height, separate swell and individual-wave maxima; do not invent one from another. `null` is unknown, not calm. A warning query returning zero active messages does not guarantee the absence of future warnings for an entire multi-day stay. Retain warning spatial geometry or authoritative zone identity, onset/effective/end/expiry, cancellation/update identity and uncertain applicability.

## Implementation instructions

1. Validate documented NWS grid metadata and raw interval units without discarding available source geometry. Check official current product documentation; do not assume `/points` works at every offshore location.
2. Build an interval compositor using the union of actual boundary times and the exact search-plus-contingency window. Retain half-open interval semantics agreed in FOUNDATION-02, gaps, duplicate issues and source expiry. Never nearest-time fill a missing parameter.
3. Establish one explicit provider-selection/conflict policy per parameter. When spatial/time support differs, retain distinct source provenance and mark incomplete intersections; do not choose whichever value makes a candidate pass.
4. Map warnings using spatial intersection/zone evidence and effective intervals. Handle canceled/replaced bulletins without keeping stale duplicates. Unresolved zone geometry remains a deficiency.
5. Preserve model point versus selected location in reports. NWS geometry can support a grid footprint only after its meaning and quality are checked; MET global and ocean point products must not silently cover the search circle.
6. Give DATA-03 the component output, DATA-08 a bounded live-smoke interface and APP coverage work human-readable missing-field reasons. Keep official warning outages independent from ordinary wind availability.
7. Document permitted refresh cadence and transport requirements via DATA-01/OPS-02; do not add retries or alternate provider mirrors that bypass their policies.

## Acceptance criteria

- **DATA-05-AC01:** Every assembled value retains its source/product, units, original timestamps and actual spatial-support identity.
- **DATA-05-AC02:** The full requested stay plus contingency is represented as explicit supported or missing intervals; no gaps or endpoint extensions are fabricated.
- **DATA-05-AC03:** Missing gusts, swell, waves or currents remain null/incomplete; a point or snapped coordinate never creates a search-circle coverage claim.
- **DATA-05-AC04:** Warning applicability respects source geometry/zones and effective time; replacements/cancellations are handled and unresolved coverage remains visible.
- **DATA-05-AC05:** Conflicting or differently supported providers follow a documented conservative policy with deterministic output and source attribution.
- **DATA-05-AC06:** Outside-region or denied optional providers leave core point forecasts usable and do not trigger unauthorized retries.
- **DATA-05-AC07:** Real bounded US, European and Asian requests produce reports whose actual availability is recorded without inventing required fields or fixed counts.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-05-T01 | Wind covers 12–18 UTC, waves 13–17, current 12–16; request 12–19 including contingency. | Segmented output exposes 12–13/16–19 deficiencies; no complete seven-hour coverage. | 01,02,03 |
| DATA-05-T02 | Forecast reverses 350°→170° with distinct intervals and a high gust. | Direction/peak values and units survive exactly; no averaging hides reversal or gust. | 01,05 |
| DATA-05-T03 | MET ocean snaps away from requested position; only point geometry exists. | Actual model point is retained and spatial coverage remains incomplete. | 03 |
| DATA-05-T04 | Warning begins during stay, intersects only part of footprint, then is canceled by a later issue. | Applicable intervals/identity follow the documented update policy; uncertainty is never blanked by an empty list. | 04 |
| DATA-05-T05 | Optional wave service is disabled and official warnings time out. | Wind context remains available; missing wave/warning evidence is visible and transport budget is respected. | 03,06 |
| DATA-05-T06 | Request one Keys point, one Bergen point and one Asian preset through the real configured adapters. | Save status/provenance reports; differences in product coverage are truthful, not constant expected counts. | 07 |

Run `npm run typecheck --workspace=@anchor-buddy/api`, `npm run test --workspace=@anchor-buddy/api`, and the existing bounded live-smoke command documented in `apps/api/LIVE_DATA.md`. A new multi-area runner must be explicitly opt-in. Handoff includes interval diagrams or tables, conflict policy, source fields retained, test commands and unresolved coverage-review items. References: [NWS API](https://www.weather.gov/documentation/services-web-api), [MET product documentation](https://api.met.no/), [MET terms](https://api.met.no/doc/TermsOfService).


---

Task source: [DATA-06](tasks/DATA-06.md) · 8h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02, DATA-01

# DATA-06 — Ingest dated restrictions, habitat and temporary notices

Implement a traceable rules/habitat/notices component for a bounded Florida Keys pilot, with explicit jurisdiction and effective dates. Prepare a review dossier that exposes uncertainty rather than interpreting absent polygons or incomplete legal summaries as permission to anchor.

**Estimate:** 8 worker-hours plus external review time. **Priority:** P0. **Prerequisites:** FOUNDATION-01/02 and DATA-01. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. Do not contact third parties yourself unless separately authorized.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `workers/ingest/anchor_ingest/sources.py`, `__main__.py` (`official` command), `geometry.py`, `assessment.py`, and the `RestrictionArea`, `CoverageArea`, `HazardArea` and `Place` contracts in `packages/domain/src/types.ts`. An authoritative spatial import already exists and intentionally leaves rule applicability unresolved. `floridaKeysReefBuoy` and overnight exclusion behavior already exist; preserve them.

Own a proposed `workers/ingest/anchor_ingest/rules_components.py`, proposed rules tests, and proposed `docs/data/keys-rules-review.md`. Treat `sources.py`, `geometry.py`, `__main__.py`, domain engine/schema and public pack release metadata as read-only while DATA-02/03/SAFE-01 work there. Pass wiring/change requests to the integrator, not overlapping edits.

## Inputs and outputs

Inputs are official spatial layers and dated text/legal references supplied through a bounded recipe: source URL/identifier, jurisdiction, publication/retrieval/effective dates, geographic extent, version/hash, license/attribution and any actual review attestation. Output is a component with exact source geometry, unresolved/resolved applicability, explicit prohibitions or unknown permission, notice validity, coverage deficiencies and a human review checklist. Retain original scope distinctions: sanctuary-wide versus zone-specific rules, federal/state/local jurisdictions, habitat boundaries versus known absence, and temporary versus permanent restrictions.

Use stable identifiers and link interpretation to the underlying text/version. Do not infer legal precedence from source recency. A rule with no reliable end date requires an explicit review/refresh policy; it must not silently expire to allowed or become permanent without evidence. Source geometry missing because a download failed is different from a successfully retrieved empty layer. Do not convert every text notice into an invented polygon. An unresolved nonspatial notice affecting the pilot becomes an applicability blocker.

## Implementation instructions

1. Inventory official sanctuary GIS, applicable federal/state/local rules, habitat datasets and USCG notice entry points for the chosen pilot. Record URLs and retrieval outcomes, including denied/unavailable responses.
2. Import exact geometry with holes and source IDs. Keep interpretation fields unresolved unless a real reviewer supplied scoped approval. Request the necessary schema fields through FOUNDATION-02 before coding incompatible records.
3. Normalize effective intervals and jurisdiction identifiers. Detect contradictory overlapping rules and ambiguous amendments. Produce a conflict queue instead of selecting a permissive winner.
4. Encode the published Keys reef-buoy use category as daytime/short-term only, with official source evidence. Do not infer current vacancy, vessel limits or indefinite free use from a community buoy marker.
5. Preserve habitat completeness separately from habitat object presence. Missing polygons never prove clear seabed; a reviewed coverage polygon must document how its completeness was established.
6. Maintain notice identities, issue/update/cancel relationships and source freshness. If notice access fails, retain prior evidence with original dates and show a coverage gap; do not substitute a guessed incident list.
7. Produce the DATA-03 component and review dossier with each unresolved question, affected geography, source version, expected reviewer discipline and blocked recommendation consequence. A human can review it without reading source code.

## Acceptance criteria

- **DATA-06-AC01:** Every imported rule/habitat/notice record links an authoritative source/version, jurisdiction, geometry or explicit missing geometry, and dated applicability.
- **DATA-06-AC02:** No unresolved rule or unavailable layer is represented as permission; source failure differs from a successful empty response.
- **DATA-06-AC03:** Exact geometry holes, overlapping jurisdictions and effective-date changes survive import and produce explicit conflicts where unresolved.
- **DATA-06-AC04:** Florida Keys reef moorings are not eligible for overnight recommendations, with the official guidance retained as evidence.
- **DATA-06-AC05:** Habitat/hazard completeness cannot be inferred from an empty object list; full-footprint coverage remains independently required.
- **DATA-06-AC06:** Temporary notice updates/cancellations retain identity/history and do not reset source dates or silently remove unresolved impact.
- **DATA-06-AC07:** The pilot review dossier lists every blocked interpretation and contains no invented human approval or unverifiable legal conclusion.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-06-T01 | Import a polygon with a hole and two overlapping jurisdiction records. | Coordinates/holes survive; unresolved conflict is explicit. | 01,03 |
| DATA-06-T02 | Compare a successful empty habitat response with HTTP failure. | Distinct source statuses; neither establishes complete safe seabed by itself. | 02,05 |
| DATA-06-T03 | Stay crosses the effective time of an anchoring prohibition. | New rule applies to the overlapping stay interval; no whole-stay permission. | 03 |
| DATA-06-T04 | Official Keys reef buoy is free but search is overnight. | Overnight exclusion remains despite price; daytime classification does not imply availability. | 04 |
| DATA-06-T05 | Notice is replaced/canceled; a second notice lacks geometry or expiry certainty. | Update lineage retained; unresolved second notice still blocks completeness. | 01,06 |
| DATA-06-T06 | Reviewer inspects the dossier against raw sources. | Every interpretation has a source/version and pending review question or actual signed evidence. | 07 |

Run `npm run test:ingest` and, after integration, `npm run test --workspace=@anchor-buddy/domain`. New rule-component test filenames must be included by the current unittest discovery command. Handoff includes source inventory, conflict table, unreviewed component, tests and questions requiring a local reviewer. Official starting references: [sanctuary regulations](https://floridakeys.noaa.gov/regs/), [Keys mooring guidance](https://floridakeys.noaa.gov/mbuoy/allmbuoys.html), [USCG notice entry point](https://www.navcen.uscg.gov/local-notices-to-mariners). The last URL returned HTTP 403 during planning; treat access as unresolved, not as absence of notices.


---

Task source: [DATA-07](tasks/DATA-07.md) · 8h · P1 · prerequisites: FOUNDATION-01, FOUNDATION-02, DATA-01

# DATA-07 — Curate official places, vessel limits and tariff rules

Implement a small operator-source register and ingestion workflow for real marina, dock and mooring facts. Capture published tariff rules without inventing rates, occupancy, overnight permission or vessel limits, and provide a reviewed input set for the deterministic tariff engine.

**Estimate:** 8 worker-hours. **Priority:** P1. **Prerequisites:** FOUNDATION-01/02 and DATA-01. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. SAFE-03 owns tariff calculation semantics; agree the tariff examples/contract in FOUNDATION-02, then develop ingestion independently. Do not create a circular dependency on SAFE-03 implementation.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `packages/domain/src/types.ts` (`Place`, `Tariff`, `TariffBand`), `cost.ts`, `apps/api/src/providers/overpass.ts`, `contracts.ts`, and `workers/ingest/README.md`. The deterministic cost engine exists, but runtime OSM discovery intentionally leaves prices, limits and permissions unverified. `official-places` describes a review-required capability, not an existing complete commercial catalogue.

Own a proposed `workers/ingest/anchor_ingest/places_components.py`, associated tests, proposed `workers/ingest/data/official-places/` factual records/schema examples, and `docs/data/place-curation.md`. Keep raw bulk PDFs/HTML and unlicensed excerpts out of git. Treat `cost.ts`, domain types/validation, discovery transport, API routes and UI as read-only. Request schema extensions through FOUNDATION-02; request merge/wiring via the integrator.

## Inputs and outputs

Input records identify a stable internal place ID, official business/operator name, kind, sourced position and its meaning (entrance/berth/feature centre), source URL/date/hash/reference, currency, local IANA time zone, effective tariff dates, basis/rate/period, minimums, seasonal boundaries, taxes, mandatory/optional extras and any dimension/type surcharges. Missing fields are explicit unknowns, not zero. Preserve original published units and the normalized values with a conversion record.

Additional facts include overnight/daytime status, published maximum LOA/beam/draft/displacement/air-draft limits, vessel categories, entrance/berth depth and datum, access windows, closures, facilities and public business contact links. `availability` remains unknown unless a current authorized source genuinely establishes it. A tariff is not a booking feed. A limit from an old blog or community tag is not operator verification. Approval of cost facts does not approve approach clearance, safe holding or legal permission.

## Implementation instructions

1. Define validated curation records using the frozen contract and implement a deterministic importer. Keep exact source facts distinct from reviewer interpretation and generated internal IDs.
2. Curate a bounded pilot inventory: target six real places across the Keys, one European pilot and one Asian pilot, covering marina/dock/mooring categories. Require at least three independently verifiable tariff schedules before claiming a price pilot complete. This is a dataset gate: if the target cannot be met, report the missing items and keep those prices unknown instead of inventing them.
3. Use official operator/municipal pages or published tariffs. Record the page/document section, verification date, effective date and permitted factual reuse. Do not create accounts, accept paid subscriptions, email operators or submit booking requests without separate user authorization.
4. Reject ambiguous overlapping seasonal bands, missing currency/time zone, incomplete tax basis, contradictory rates and unsupported pricing clauses. Preserve the original note and mark the estimate unsupported until SAFE-03 can represent it correctly.
5. Normalize lengths carefully: source feet versus metres, minimum billable length, multihull/beam charges and rate periods must not be collapsed into one guessed nightly rate. Send SAFE-03 source-derived examples with independently calculated expected line items, including rounding policy assumptions for review.
6. Define identity/merge rules with community POIs. Official data may supplement a matched place, but matching by name/proximity alone cannot silently transfer a tariff to another marina. Conflicts require an explicit reviewed link.
7. Emit a DATA-03 places/tariffs component and a coverage table distinguishing confirmed free, paid, unknown, expired, closed and unsupported pricing. Tariff expiration must not extend when caches refresh.

## Acceptance criteria

- **DATA-07-AC01:** Every factual field marked verified has an official source/reference and effective/verification dates; unverified fields remain unknown.
- **DATA-07-AC02:** Tariff normalization retains original currency, units, local time zone, seasonal periods, mandatory charges, tax basis and published minimums.
- **DATA-07-AC03:** Ambiguous or unsupported pricing fails closed to unknown/unsupported estimate with a reason, never a guessed price or confirmed-free label.
- **DATA-07-AC04:** Place matching requires explicit reviewed identity links; proximity/name collisions cannot attach a tariff automatically.
- **DATA-07-AC05:** Published fee facts do not imply available berths, verified approach, overnight permission or complete vessel compatibility.
- **DATA-07-AC06:** Import is deterministic, expired source/tariff records retain their dates, and future/contradictory effective dates are rejected or explicitly pending.
- **DATA-07-AC07:** Deliver the target six-place/three-tariff pilot or mark the dataset acceptance blocked with the exact missing official sources; engineering completion must not be reported as dataset completion.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-07-T01 | Import a sourced per-foot tariff with a minimum billable length and tax-exclusive required extra. | Original rule and units survive; normalized contract preserves each independent charge. | 01,02 |
| DATA-07-T02 | Place has `fee=no` only in OSM or a missing rate/currency. | It is not confirmed free or a zero-price quote. | 01,03 |
| DATA-07-T03 | Two nearby marinas share a similar name but only one reviewed official ID. | Tariff attaches only to the linked place; second remains unknown. | 04 |
| DATA-07-T04 | Official tariff is current but berth availability and entrance depth are absent. | Paid estimate data can exist; availability/approach/compatibility stay unverified. | 05 |
| DATA-07-T05 | Stay crosses a seasonal boundary; source omits whether a surcharge is per night or stay. | Effective bands preserved; ambiguous surcharge blocks total until reviewed. | 02,03,06 |
| DATA-07-T06 | Reimport unchanged records and then expired records; review inventory counts. | Stable IDs/content, no renewed dates, and explicit dataset-complete or dataset-blocked evidence. | 06,07 |

Run `npm run test:ingest`; after integration run `npm run test --workspace=@anchor-buddy/domain` and `npm run test --workspace=@anchor-buddy/api`. Add importer tests to current Python discovery. Hand off the small factual register, a source/rights table, unsupported clauses, identity links, expected calculation cases for SAFE-03 and command results. Do not copy private contact data, credentials or full copyrighted source documents into the repository.


---

Task source: [DATA-08](tasks/DATA-08.md) · 8h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, OPS-02

# DATA-08 — Refresh and publish versioned evidence with regional live checks

Implement an operator-run refresh pipeline that produces complete immutable candidate versions, exposes their data deficiencies and atomically publishes only versions eligible under the existing release rules. Validate real discovery in selected European and Asian areas without promising global nautical safety coverage.

**Estimate:** 8 worker-hours. **Priority:** P0 integration. **Prerequisites:** FOUNDATION-01/02, DATA-03 through DATA-07 engineering outputs, and OPS-02 for final integration. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. Reviews are external gates, not conditions for writing the mechanism. Develop against OPS-02's frozen interface earlier; final integration consumes its shared provider budgets/cooldowns. This task owns regional run-state/leases, distinct from OPS-02's provider coordination. OPS-03 owns rollout wiring; do not create a reverse dependency on its completed deployment.

Keep runtime data explicitly non-synthetic. Fixtures belong only in isolated test entry points and must remain blocked from production imports. Never invent review, coverage, license or provider facts to satisfy acceptance.

## Baseline and ownership

Read `workers/ingest/anchor_ingest/__main__.py`, `packs.py`, `postgis.py`, `apps/api/src/packs.ts`, `providers/disk-cache.ts`, `providers/discovery.ts`, `apps/api/scripts/live-smoke.ts`, `infra/compose.yaml` and `apps/api/LIVE_DATA.md`. Manual download/build/verify/publish/index commands, immutable packs, live response caching and a bounded smoke script already exist. They are not an unattended, reviewed regional refresh service.

Own proposed `workers/ingest/anchor_ingest/refresh.py`, a PostgreSQL regional run-state/lease implementation and its migration, refresh tests, operator recipes/runbook and proposed `apps/api/scripts/regional-smoke.ts`. Reserve the migration number/path with the integrator; do not collide with OPS-02's migration. OPS-02 reviews the lease/interface contract but does not own regional scheduling state. CLI/`packs.py` integration is serialized after DATA-03; `server.ts`, provider transport/cache, Compose/CI and domain/mobile code stay read-only. Give OPS-03 the migration/invocation/environment/health contract for rollout integration.

## Required inputs and outputs

Input is an explicit allowlisted regional recipe and immutable component dependencies, operator configuration, source policies, intended run identity and existing current-version pointer. Do not discover/download every global chart or scrape arbitrary URLs. Output is a structured run report with source changes, retained-original-date components, missing/expired evidence, validation/review state, candidate version/hash, publication outcome and rollback identifier. Logs must not include API keys, credential URLs, user's saved coordinates or personal boat data.

Separate source refresh from permission to publish. A valid new component may invalidate an earlier review; the system must show review required rather than copy old attestations onto changed content. The previous complete pack remains available with its original expiry while a candidate fails or waits for review. Never serve an unreviewed candidate through the reviewed-assessment route. Internal inspection artifacts require an explicit nonproduction path and must not contaminate the public catalogue.

## Implementation instructions

1. Build a dry-run/planning mode that resolves component dependencies and expected requests without fetching or publishing. Enforce bounded geographic selection, provider budgets and per-recipe maximum artifact sizes.
2. Implement per-region PostgreSQL run-state and bounded leases using an OPS-02-reviewed interface. Persist idempotency key, phase, candidate hash, owner/fencing token, lease expiry and recovery outcome; use database time and short transactions without holding locks during network calls. Only a current lease owner may publish. Distinguish no-change, staged, failed, interrupted, review-required and published outcomes. Database outage stops mutation/publication rather than falling back to an independent local lock.
3. Execute source refresh, validation, DATA-03 composition and checksumming in dependency order. A successfully empty source removes superseded records; unavailable sources retain original dated evidence only under the explicit cache policy.
4. Validate all review bindings and component freshness before switching the current pointer. Upload immutable assets first, verify remote sizes/hashes, then perform the pointer update atomically/conditionally. Do not publish a pointer before all required assets exist.
5. Make retries bounded and policy-aware. Retries cannot fan out across public mirrors or reset provider cooldowns; a process restart must not bypass persistent quotas supplied by OPS.
6. Extend live smoke coverage with one selected request each for Split, Bergen, Singapore and Hiroshima (or documented equivalent presets). Check schemas, provenance, coverage status and absence of synthetic values; record actual counts, never fixed provider values. Respect product-specific refresh policies and reuse dated cached requests when appropriate.
7. Produce an operator dashboard/report artifact describing the pilot's unresolved dependencies and release gate, plus a rollback drill restoring the prior pointer without modifying either immutable version.

## Acceptance criteria

- **DATA-08-AC01:** Dry-run performs no provider, storage mutation or publication calls and lists exact planned components/limits.
- **DATA-08-AC02:** PostgreSQL run-state/leases prevent concurrent same-region publication; expired owners cannot publish, restart recovers explicitly, and coordinator outage leaves the current pointer unchanged. The integrator-assigned migration and OPS-03 rollout contract are delivered.
- **DATA-08-AC03:** Failed refresh preserves the previous complete version, original source dates and cache expiry; successful empty responses do not resurrect obsolete records.
- **DATA-08-AC04:** Publication verifies every required remote artifact before an atomic pointer update, and rollback selects an intact prior version.
- **DATA-08-AC05:** Missing/mismatched/expired reviews block reviewed publication, even when all technical validation passes.
- **DATA-08-AC06:** Requests respect provider budgets/cooldowns after retries and process restarts, with nonsecret reports and no unauthorized mirrors.
- **DATA-08-AC07:** Four bounded Europe/Asia smoke reports retain real provenance and truthful partial/unavailable states; no safety coverage or data values are fabricated.

## Test cases

| ID | Setup and action | Expected result | AC |
| --- | --- | --- | --- |
| DATA-08-T01 | Dry-run an otherwise publishable recipe with spies on transport/storage. | Exact plan returned; zero external/mutation calls. | 01 |
| DATA-08-T02 | In isolated PostgreSQL, start two same-region jobs, kill the first mid-stage, expire/reacquire its lease and retry publication with the old token; then stop the database. | One current owner/publisher; stale token rejected, staging never becomes current, explicit crash recovery, and database outage cannot publish or activate a local-lock fallback. | 02,03 |
| DATA-08-T03 | One provider times out while another returns a valid empty collection. | Failed component retains original dates if permitted; empty component deletes old records. | 03 |
| DATA-08-T04 | Remote asset upload succeeds partially or a hash differs; attempt publication. | Current pointer unchanged; retry verifies all assets before activation. | 04 |
| DATA-08-T05 | Replace chart content under an old review reference, then retry. | Review-required outcome; no reviewed catalogue publication. | 05 |
| DATA-08-T06 | Restart inside a provider cooldown, then run regional smoke. | No excess request; report identifies cache/retrieval dates and region-specific availability. | 06,07 |
| DATA-08-T07 | Publish two valid test-only versions and roll back in isolated storage. | Prior manifest/assets remain immutable and selected pointer resolves consistently. | 04 |
| DATA-08-T08 | Apply the integrator-numbered migration twice under its supported migration runner in an isolated database, then exercise the documented OPS-03 invocation and rollback. | Schema/run-state initializes once, repeated application follows the runner's documented no-op behavior, and rollback affects only owned coordination state without deleting source evidence. | 02,04 |

Run existing `npm run test:ingest`, `npm run test --workspace=@anchor-buddy/api`, and `npm run typecheck --workspace=@anchor-buddy/api`. New refresh/regional-smoke commands must be documented before invocation and must require explicit live-run flags. Handoff the run-state schema, invocation examples, four smoke reports, interruption/rollback evidence, publication-gate results and remaining human review actions. Do not schedule a real recurring production job, expose a public deployment or accept provider terms merely because this ticket describes the mechanism.


---

Task source: [SAFE-01](tasks/SAFE-01.md) · 12h · P0 · prerequisites: FOUNDATION-02

# SAFE-01 — Assess real point and line hazards conservatively

Extend deterministic footprint assessment to preserve and check actual point and line chart hazards. Keep the existing conservative behavior for uncertain geometry, chart seams, unknown depth and missing coverage. Do not infer safe seabed from omitted objects or rendered map tiles.

## Baseline, prerequisites and scope

Read `packages/domain/src/geo.ts`, `engine.ts`, `validation.ts`, `types.ts`, `test/assessment.test.ts`, and `workers/ingest/REAL_ENC_SMOKE.md`. The successful real chart assembly contains polygon hazards but reports omitted point/line objects. `diskIntersectsArea` currently checks polygon edges and holes; `areaContainsDisk` deliberately requires one polygon to contain the full disk. These protections already exist: preserve them rather than rewriting the engine wholesale.

Depend on FOUNDATION-02's frozen primitive/uncertainty schema. Own `geo.ts`, a proposed `hazards.ts` helper and dedicated geometry tests. Make the narrowly required engine call-site edit under an integrator lock; SAFE-02 also needs `engine.ts`, so these edits are sequential. Shared types/validators stay read-only unless the schema owner approves an amendment. DATA-02 supplies ingestion mapping independently; do not wait for human-approved real data to test the mathematical implementation.

## Technical instructions

1. Support the contracted point, line and polygon primitives, preserving original geometry and source IDs. Compute point-to-disk and segment/polyline-to-disk intersection using the repository's local metric/geodesic approach or a justified, deterministic alternative compatible with Node, V8 and Hermes.
2. Include sourced object extent/positional uncertainty and the reviewed numerical guard in exclusion distance. If a real hazard's required extent/uncertainty is unresolved, produce insufficient evidence for the affected assessment and prevent a completeness assertion. Never silently substitute zero metres or invent a circular polygon as source geometry.
3. Keep full-circle vessel/rode footprint exclusions independent of wind prediction. Check tiny objects wholly inside the circle, crossing cables/channels, hole boundaries and degenerate-but-valid zero-length primitives. Invalid or self-inconsistent input must fail validation without hanging or throwing from UI render.
4. Preserve conservative minimum depth and maximum rode calculations across the entire stay plus contingency. Maintain exclusions when all other checks pass; ranking, preferred seabed and +20/+30% alternatives must not erase them.
5. Establish a reproducible numerical error envelope using analytical cases and offline PostGIS/geodesic reference calculations. Keep the guard at least as conservative as the existing 2 m until evidence supports a different value. Record unsupported geometry extents/latitudes explicitly. Domain input beyond ±85° latitude or crossing unsupported bounds must not be represented as valid coverage.
6. Do not implement polygon-union clearance in this ticket. Adjacent polygons with no single full-footprint proof may remain insufficient evidence. Document that limitation and add a negative seam test so a future union optimization cannot silently fill a gap.
7. Bound runtime work and report truncation/unsupported complexity. Use deterministic stable ordering and IDs. Do not simplify analysis geometry to meet a performance target; retain it and return an explicit unsupported/insufficient result if processing limits are reached.

## Acceptance criteria

- **SAFE-01-AC01:** A sourced point or line intersecting the conservative footprint produces an exclusion with its original source IDs.
- **SAFE-01-AC02:** Missing uncertainty/extent evidence cannot create an assured-clear result or complete hazard coverage.
- **SAFE-01-AC03:** Tiny internal hazards, holes and tangent/boundary cases are handled conservatively; no circumference-only sampling.
- **SAFE-01-AC04:** Wind reversal and preferred/deeper alternatives never reduce the exclusion footprint.
- **SAFE-01-AC05:** Existing polygon, datum, clearance and chart-seam protections keep their expected outcomes.
- **SAFE-01-AC06:** Results are deterministic, bounded, non-mutating and compatible with the shared runtime target.
- **SAFE-01-AC07:** A numerical validation report states supported domains, guard, reference method, tolerances and limitations.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| S01-T01 | Fixture point 10 m from a 50 m footprint centre; assess, then move to exactly the guarded boundary. | Both excluded, stable reason/source IDs; AC01,03. |
| S01-T02 | Cable line crosses a circle while both endpoints are outside; reverse line coordinate order. | Both results excluded and equivalent; AC01,06. |
| S01-T03 | Missing point extent/uncertainty, otherwise complete test evidence. | Insufficient evidence; never a pass due to zero buffer; AC02. |
| S01-T04 | 1 m hazard inside a large disk and a habitat hole boundary intersecting it. | Both detected independently of sampling density; AC03. |
| S01-T05 | Wind reverses 180°; deeper alternative requires more rode. | Existing hazard exclusion retained/enlarged footprint checked; AC04. |
| S01-T06 | Adjacent depth polygons contain the centre but not the complete disk; add a narrow gap. | Remains insufficient; gap never bridged implicitly; AC05. |
| S01-T07 | Fixed seeded geometry corpus at equator, Keys, northern Europe and ±85° limits; compare reference distances. | Error within documented bound, no nondeterministic statuses; AC06–07. |

Run `npm run test --workspace=@anchor-buddy/domain`, `npm run typecheck` and `npm run check:runtime`. Keep analytical fixtures under test-only paths. Deliver implementation, numeric reference results, benchmark inputs/runtime and review notes. Estimated effort: **12 worker-hours**. Stop before choosing unreviewed real-world clearance margins; this task does not authorize recommendations or navigation.


---

Task source: [SAFE-02](tasks/SAFE-02.md) · 10h · P0 · prerequisites: FOUNDATION-02

# SAFE-02 — Add verifiable equipment guidance selection

Implement a usable, evidence-backed way to select anchoring equipment guidance. A design-family dropdown alone must not imply that a universal scope ratio is safe. Keep a boat with unidentified or unsupported equipment usable for discovery while its anchoring assessments remain insufficient.

## Baseline and ownership

Read `packages/domain/src/types.ts` (`VesselProfile`, `ScopeGuidance`), `validation.ts`, `engine.ts`, `defaults.ts`, `apps/mobile/src/components/Forms.tsx`, and `lib/formDrafts.ts`. New profiles already start with `scopeGuidance: null`; editing relevant boat/equipment fields already invalidates attached guidance. Do not undo these fixes.

Own proposed domain `equipmentGuidance.ts`, its tests, a source-record registry format, and a new reusable mobile `EquipmentGuidanceSelect.tsx` component. APP-02 owns the existing profile form/persistence; deliver a typed prop integration contract instead of editing `Forms.tsx` concurrently. Engine validation/lookup edits require the integrator's shared-file lock after SAFE-01. FOUNDATION-02 owns shared types. An empty registry is a valid shipped state when no real entry has been reviewed.

## Instructions

1. Define records using the frozen schema: immutable ID/version, source URL/document revision, verified/reviewed dates, explicit applicability, equipment identifiers, rode configuration, any supported vessel dimensions/displacement/windage restrictions, supported wind/gust/wave/current envelope, scope/rode method and revocation status. Record unknown applicability explicitly.
2. Preserve the original published rule. If it is not expressible by the supported deterministic method, classify it unsupported and explain why. Do not translate prose into a ratio without review or use AI-generated ratings as evidence.
3. Implement a pure matcher from confirmed vessel/equipment + requested conditions + registry + explicit assessment time to eligible entries or structured rejection reasons. Check expiry, source identity, missing required fields and conflicting guidance. No silent 'closest' equipment match.
4. Reference the selected record by version and a canonical compatibility fingerprint. Revalidate on profile edits, time change, registry refresh and withdrawal. Migration of old inline guidance must retain its original evidence but cannot convert unverifiable legacy data into a reviewed registry record.
5. Build a selector showing only known entries and clear unavailable/no-match states. Show the source and applicability before confirmation. Keep manual identification fields separate from rating assertions. Do not expose a 'mark reviewed' toggle to ordinary app users.
6. Feed the selected reviewed method into existing maximum-depth-plus-bow-height rode calculation. Recalculate the entire footprint whenever applicability or deployed rode changes. Insufficient available equipment must exclude a candidate even in +20%/+30% depth alternatives.
7. Preserve discovery, saved searches and independent watch access without a selected guidance record. Explain the missing evidence at the relevant control, not through a fake default or mandatory account.

## Acceptance criteria

- **SAFE-02-AC01:** Selection is tied to a source/version and exact applicable equipment; family-only or nearest-match selection cannot enable a rating.
- **SAFE-02-AC02:** Missing, expired, withdrawn or conflicting guidance produces structured insufficient-evidence reasons.
- **SAFE-02-AC03:** Relevant profile changes invalidate the selection; unrelated display-unit changes do not.
- **SAFE-02-AC04:** A user can inspect source/applicability and confirm an eligible selection, but cannot self-approve a source.
- **SAFE-02-AC05:** Required rode uses upper water-depth bounds and bow height and rejects equipment-limit violations for every alternative.
- **SAFE-02-AC06:** Legacy profiles migrate without inventing reviewed guidance and remain editable/searchable.
- **SAFE-02-AC07:** Empty-registry behavior is fully usable and explained; there is no runtime test/demo entry.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| S02-T01 | Test-only reviewed record exactly matches equipment and conditions; select and assess. | Exact ID/version/fingerprint recorded; published calculation reproduced; AC01,04–05. |
| S02-T02 | Same family but different unverified model or rope/chain configuration. | No eligible match and no inferred ratio; AC01–02. |
| S02-T03 | Change loaded draft/anchor/usable rode after selection; separately switch nautical to metric display. | Relevant edits invalidate; unit-only edit preserves canonical selection; AC03. |
| S02-T04 | Withdraw record or advance explicit clock beyond validity while plan is open. | Reassessment fails guidance check and old safe-looking values do not persist; AC02. |
| S02-T05 | Max water depth 8 m, bow 1 m, test-only ratio 7: required 63 m; boat has 60 m. | Excluded; +20/+30% fallback cannot pass with the same equipment; AC05. |
| S02-T06 | Empty real registry and old inline/demo guidance in storage. | No rating offered; discovery/independent native watch route remains available; AC06–07. |

Run existing domain/mobile tests, TypeScript and `npm run check:runtime`. Add focused matching/migration tests and component state tests where the harness exists. Deliver the component contract, migration examples, real-source evidence ledger or an explicitly empty registry, and AC results. Estimated effort: **10 worker-hours**. Source acquisition/review delays must be reported as blocked content, never replaced with an invented production entry.


---

Task source: [SAFE-03](tasks/SAFE-03.md) · 10h · P1 · prerequisites: FOUNDATION-02

# SAFE-03 — Calculate source-specific tariffs without guessing

Extend the tariff engine so the real operator rules collected by DATA-07 can be represented accurately. Preserve unknown fees, original currency and the separation between estimated cost and berth availability.

## Baseline and ownership

Read `packages/domain/src/cost.ts`, `types.ts` (`Tariff`, `TariffBand`, `CostEstimate`), `validation.ts`, `engine.ts` sorting, and `apps/mobile/src/lib/units.ts`. The current engine supports flat/per-metre/per-foot rates, seasonal periods, minimum charges, multihull/beam supplements, taxes and required extras. It rounds every amount to two decimals, matches bands by date only, and has no explicit source-specific length increment or billing/check-in rule. Do not rebuild supported arithmetic needlessly.

Own `cost.ts`, proposed `money.ts`, and dedicated tariff tests. Shared schema changes come from FOUNDATION-02. DATA-07 owns factual curation, APP-03 owns presentation. Any `engine.ts` price-ordering change is merged sequentially by the integrator. No exchange-rate service or billing/payment implementation belongs here.

## Technical instructions

1. Implement explicit band selection by effective local date, berth/mooring product, vessel type and published length/beam bands. Define inclusive/exclusive boundaries in the contract; overlapping equally applicable rules yield unknown rather than taking the first entry. Unsupported combinations remain unknown with a reason.
2. Represent published rounding increments (for example, each started metre/foot), minimum billable length, minimum stay charge, and whether seasonal boundaries use calendar nights/days or elapsed hours. Do not assume every marina bills at midnight or that a day stop is automatically cheaper.
3. Apply exact currency minor-unit rules and declared rounding stages. Use integer minor units or auditable decimal/rational arithmetic; never accumulate binary floating-point pennies silently. Source currency metadata is pinned/versioned for parity. Support zero-, two- and three-decimal currencies when explicitly known; unknown currency precision must not default to an invented charge.
4. Separate tax-inclusive from tax-exclusive rates, taxable from nontaxable extras, required from optional items and refundable deposits from estimated nonrefundable cost. A quote-only or metered unknown mandatory utility makes the relevant total/range explicitly incomplete; do not report a complete total that excludes required unknown costs.
5. Bill across seasons, local midnight, DST transitions and departure boundaries using the source's rules and tariff timezone. The user's display timezone must not change the charge. Preserve deterministic reasons and item labels without requiring locale-dependent business logic.
6. Return itemized amounts, quantities, applied rule IDs, source references, completeness and limitations. Confirmed-free evidence can return zero only while its supporting publication is applicable. Unknown is distinct from zero. Never infer a berth is available from a tariff.
7. Keep suitability-first sorting. Within an assessment group, unknown totals sort last. Different currencies have no meaningful global numeric cheapest ordering without conversion; group them by deterministic currency code with an explanatory label/contract, rather than comparing raw EUR, JPY and USD values as equivalent.

## Acceptance criteria

- **SAFE-03-AC01:** Exactly one source-supported price rule is selected; ambiguity/gaps return unknown with rule IDs/reasons.
- **SAFE-03-AC02:** Length increments, minimums, vessel supplements and billing periods reproduce approved examples exactly.
- **SAFE-03-AC03:** Currency rounding is correct for 0/2/3 minor digits and identical across supported runtimes.
- **SAFE-03-AC04:** Taxes, optional charges, deposits and unknown mandatory extras are distinguished and do not yield misleading totals.
- **SAFE-03-AC05:** DST, seasonal transitions and tariff timezones do not change the intended number of billed periods.
- **SAFE-03-AC06:** Free, paid, incomplete and unknown stay distinct; costs never assert availability.
- **SAFE-03-AC07:** Mixed-currency sorting is explicit and deterministic; no silent conversion or raw cross-currency comparison.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| S03-T01 | Test tariff EUR 4 per started metre/night; 10.01 m vessel, 2 nights, no other fees. | 11 × 4 × 2 = EUR 88.00, itemized; AC02. |
| S03-T02 | Two applicable length bands overlap at a boundary; then make a gap. | Both ambiguous/gap cases unknown; boundary policy documented; AC01. |
| S03-T03 | Explicit fixtures JPY 101, EUR 1.005 and KWD 1.2345 with documented half-up stage. | JPY 101, EUR 1.01, KWD 1.235; no extra cents or floating error; AC03. |
| S03-T04 | Rate already includes tax; add one required nontaxable extra, optional electricity and refundable deposit. | No double tax; optional/deposit separate; known items exact; AC04. |
| S03-T05 | Arrival/departure span spring/fall clock change and season boundary in tariff timezone; vary display timezone. | Charge unchanged by display zone and follows explicit period rule; AC05. |
| S03-T06 | Free record expires before stay; or mandatory metered utility lacks a bound. | Not a complete free/paid total; uncertainty visible; AC04,06. |
| S03-T07 | Equal-suitability EUR, JPY, USD and unknown-cost results sorted by price. | Deterministic currency groups, unknown last, no claimed cross-currency cheapest; AC07. |

Run domain tests and TypeScript; hand APP-03 sample outputs for all states and DATA-07 a supported-rule checklist. Estimated effort: **10 worker-hours**. Do not scrape or invent tariffs. Financial/source interpretation needs review when ambiguous. Reference: [ECMA-402 CurrencyDigits](https://tc39.es/ecma402/#sec-currencydigits); pin actual supported currency metadata rather than relying on differing runtime locale databases for business arithmetic.


---

Task source: [SAFE-04](tasks/SAFE-04.md) · 10h · P0 · prerequisites: SAFE-01, SAFE-02, SAFE-03, WATCH-01, WATCH-02

# SAFE-04 — Prove deterministic assessment parity

Create and execute a cross-runtime assessment corpus that compares the same inputs/data versions on Node API, browser JavaScript and actual iOS/Android Hermes. Investigate discrepancies; do not bless the Node implementation as correct merely because it produced the first snapshot.

## Scope and baseline

Read `packages/domain/src/engine.ts`, `geo.ts`, `cost.ts`, `testing.ts`, `packages/domain/test`, API `/v1/search` and `/v1/estimate` in `apps/api/src/server.ts`, mobile assessment calls and `scripts/check-runtime.mjs`. Existing unit tests and bundle exports are useful but are not runtime parity proof. WATCH-03 separately validates the native watch state machine; do not duplicate it here.

Own proposed `tests/parity/`, test runners and a dedicated development-only parity harness excluded from the distributable app. Request app/build wiring through the integration owner. Do not change Swift/Kotlin watch code or broaden runtime fixture imports. Domain fixes discovered here belong to their owning SAFE task and require re-review.

## Instructions

1. Define a canonical test envelope containing schema version, engine revision, source/component hashes, explicit assessment clock/purpose, vessel, search, candidate/options and expected invariants. Use test-only analytical cases and permitted dated real-source snapshots. Do not alter a real source's review/provenance flag to manufacture a passing case.
2. Define canonical output normalization: object key order may normalize, but candidate/result ordering, source IDs, reason codes/severity, null-versus-zero, money minor units, exclusion state and deeper-alternative selection must compare exactly. Set a documented small tolerance only for raw distance/depth geometry scalars where justified; a tolerance cannot excuse different safety statuses.
3. Split execution into two explicitly labelled cohorts. Cohort A is the complete analytical test-only corpus, invoked directly through the shared domain in Node, browser and both compiled native Hermes test builds. Cohort B is permitted real-source input, invoked through the unchanged production HTTP boundary and directly on the other runtimes where admissible. Unreviewed packs remain rejected by the production pack gate; record this rejection instead of changing review flags. If no eligible complete pack exists, positive HTTP assessment parity is blocked; rejection parity still runs. Record runtime/OS versions and binary/source SHA. Keep localized text separate from business values. Never add a production fixture/test-mode endpoint.
4. Include overnight low water, rising-water rode, wind reversal, unknown gust/waves/current, expired forecasts, point/line/tiny hazards, holes/seams, datum mismatch, restriction effective dates, day-use buoys, unavailable berths, mixed currencies and equipment-invalid deeper alternatives.
5. Test stable candidate IDs/generation under input feature-order permutation. Repeated runs with identical assessment time must not read `Date.now`, network, device locale or mutable globals implicitly.
6. On mismatch, minimize the input case and identify whether arithmetic, sort order, timezone/Intl support, schema conversion or API validation caused it. Keep the failing case; get the owning worker to correct it and rerun affected suites.
7. Prove test harness separation by exported bundle/runtime-import inspection. A production user must not be able to inject synthetic packs or turn a test-case flag into reviewed coverage.

## Acceptance criteria

- **SAFE-04-AC01:** Every case records exact input hashes, engine revision and explicit clock; runs are repeatable.
- **SAFE-04-AC02:** The full analytical corpus executes directly on Node/browser/both native runtimes; the eligible real-source cohort executes through HTTP and those runtimes. Artifacts identify every cohort, exclusion, rejection and blocked positive API case.
- **SAFE-04-AC03:** Status, reasons, candidate ordering, fallback selection and currency amounts match exactly.
- **SAFE-04-AC04:** Numeric tolerances are justified and never hide an exclusion/pass disagreement.
- **SAFE-04-AC05:** All named critical scenarios are represented with independent expected invariants, not only copied snapshots.
- **SAFE-04-AC06:** Runtime exports cannot load test fixtures/harnesses; no test-mode production endpoint is added.
- **SAFE-04-AC07:** Any unavailable native runner is marked blocked, never substituted by a JavaScript bundle-export claim.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| S04-T01 | Run one envelope 20 times in each runtime with fixed clock. | Exact canonical output equality within a runtime; AC01,03. |
| S04-T02 | Execute cohort A directly on all four runtimes; send eligible cohort B through production HTTP; separately send synthetic and unreviewed input. | Admissible calculations match exactly. Synthetic/unreviewed production input stays rejected. No eligible reviewed pack means positive HTTP parity is blocked, not fabricated; AC02–03,06. |
| S04-T03 | Reorder source arrays and equal-ranked candidate inputs using a fixed seed. | Stable final ordering/IDs and unchanged reasons; AC03,05. |
| S04-T04 | Use DST/night-billing cases and 0/2/3-decimal currencies across different device locales. | Canonical amounts/statuses identical; localized presentation may differ; AC03–04. |
| S04-T05 | Geometry at the numerical boundary changes one status on one runtime. | Test fails regardless of scalar tolerance; minimized case retained; AC04. |
| S04-T06 | Inspect exported production dependency graph and try synthetic live API input. | Test harness absent; synthetic input rejected; AC06. |
| S04-T07 | Remove an available device/runtime from the run matrix. | Report marks native parity blocked, not passing via another engine; AC07. |

Existing checks: `npm run check:runtime`, `npm run test --workspace=@anchor-buddy/domain`, `npm run test --workspace=@anchor-buddy/api`, and `npm run typecheck`. Add proposed `test:parity` commands only with runnable implementations and documented setup. Deliver machine-readable comparison JSON, minimized failures and a reviewer-readable matrix. Estimated effort: **10 worker-hours**, excluding device scheduling.


---

Task source: [APP-01](tasks/APP-01.md) · 12h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02

# APP-01 — Extract the workspace controller without changing behavior

Implement a small, tested workspace controller so subsequent workers can extend independent screens without repeatedly editing the same application shell. Preserve the current user journey and safety behavior. This is a structural task, not a redesign.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current baseline and outcome

Read apps/mobile/src/App.tsx, lib/workspace.ts, lib/selectionAssessment.ts, lib/useEvidenceRefresh.ts and docs/controls-audit-2026-11-11.md. App.tsx is approximately 1,942 lines and currently owns navigation, independent modal flags, draft state, selected pins, evidence loading, local writes and native-watch status. The November audit already fixed cancelled saved-search metadata, stale detail selection, manual pins, profile changes and watch suggestions. Preserve those fixes.

The outcome is an explicit transition model and small effect adapters. Do not add Redux or another state framework merely to move code. A pure reducer with typed actions plus focused hooks is sufficient.

## Ownership and dependency contract

You exclusively edit App.tsx during this task and create proposed lib/workspaceController.ts, lib/workspaceController.test.ts and lib/useWorkspaceController.ts. Existing storage, native bridge, assessment engine, provider response types and screen implementations are read-only. Obtain FOUNDATION-02's frozen payload versions before defining persisted or cross-package types.

After merge, the designated integrator is the sole editor of App.tsx. APP-02 through APP-08 supply components, controller actions and a wiring note; they must not independently merge conflicting shell edits. Record the exported controller actions/selectors in an adjacent contract document or typed interface.

## Technical instructions

1. Inventory current state and write a transition table covering empty Explore, active search, map preview, search draft, detail, plan, watch and blocking setup. Distinguish screen navigation from the independently running native watch.
2. Introduce a discriminated modal state so mutually exclusive edit sheets cannot accidentally coexist. Preserve intentional parent setup plus child profile/default editing through an explicit parent-return field, not two unrelated booleans.
3. Move pure navigation/draft/selection transitions into the reducer. Do not persist React component instances, callbacks, AbortControllers or assessment objects as application identity.
4. Keep effects in adapters: storage commits, latest-request-wins source fetches, assessment recomputation and native status subscriptions. Request generations must ignore late completion after cancellation, region change or unmount.
5. Recompute derived counts, details and filtered results from the same active inputs. Keep manual pins outside filtered-result counts. Preserve the original search while an edit draft is cancelled.
6. Capture an immutable search/boat/data-version input tuple for each assessment run. Never mix an old request's region metadata with a newer search.
7. Define public actions for commitProfile, begin/commit/cancelSearch, open/closeDetails, openPlan, showWatch, open/closePreview and saved-search reopening. Names are proposed; settle them once in the contract and use them consistently.
8. Keep native monitoring untouched by route changes, search closure, cache refresh or controller teardown. Reading/subscribing to status must not arm, stop or recenter.
9. Wire the existing screens back through the controller, then compare the current walkthrough before any other feature task changes those screens.

## Acceptance criteria

- APP-01-AC01: The transition table covers every currently reachable screen and modal; illegal action/state combinations are explicit no-ops or visible recoverable errors.
- APP-01-AC02: App.tsx delegates navigation and request lifecycle to the new controller; no second source of truth for active search, draft or selected pin remains.
- APP-01-AC03: Cancelling a draft leaves prior search, filters, pin, area label and timezone unchanged.
- APP-01-AC04: Late source responses cannot replace newer search data or update state after unmount.
- APP-01-AC05: Closing a search, changing tabs and editing the vessel never invoke native stop or arm.
- APP-01-AC06: Initial setup, tour, map/list, source inspection, planning, save/reopen and watch requirements preserve their current behavior.
- APP-01-AC07: Controller tests exercise real transition boundaries, not snapshots of implementation internals.
- APP-01-AC08: The integration contract lists action payloads, ownership and effect responsibilities so later workers need not infer them.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-01-T01 / APP-01-AC01, APP-01-AC03 | Start an active search with pin A; open a saved expired stay B, change draft fields, cancel. | Original search A, pin and filters remain byte-equivalent. |
| APP-01-T02 / APP-01-AC04 | Use controlled deferred test promises; request A, request B, resolve B then A. | Only B reaches active state; A cannot write its active-region pointer. |
| APP-01-T03 / APP-01-AC05 | Provide a bridge spy reporting monitoring; close search, switch tabs and replace profile. | Status remains monitoring; zero arm/stop/recenter commands. |
| APP-01-T04 / APP-01-AC01, APP-01-AC06 | Fresh local store; configure boat, edit defaults, cancel a child sheet, finish setup. | Returns to correct parent; Explore remains empty until a submitted search. |
| APP-01-T05 / APP-01-AC02, APP-01-AC06 | Filter marinas, add a manual pin, switch map/list and reopen detail. | Counts agree and exclude the manual pin; detail uses the same current assessment. |
| APP-01-T06 / APP-01-AC04 | Begin fetch, close search or unmount, then resolve the fetch. | No active-search resurrection, state update or unintended cache activation. |
| APP-01-T07 / APP-01-AC07, APP-01-AC08 | Have a second worker enumerate every exported action and legal transition using only the contract; compare against tests. | Each action has an input/output definition and a behavioral test; no undocumented shell-only transition is required. |

Run npm run typecheck --workspace=@anchor-buddy/mobile, npm run test --workspace=@anchor-buddy/mobile and npm run export:web --workspace=@anchor-buddy/mobile. New tests must be included by the existing lib/*.test.ts script. Use QA-01's browser runner when available; otherwise record the manual walkthrough separately.

## Handoff and stop conditions

Deliver the reducer/adapter, transition table, integration contract, passing command logs and before/after walkthrough notes. Budget 12 worker-hours after the foundation contract gate plus integrator review; do not widen the extraction into unrelated rendering changes. Stop and ask the integrator if the extraction requires a domain schema or native protocol change. Do not weaken a guard to preserve a formerly accidental UI behavior; document the discrepancy for review.


---

Task source: [APP-02](tasks/APP-02.md) · 8h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02, APP-01

# APP-02 — Make profile and default saves durable and recoverable

Implement durable saves for vessel profiles, search defaults and display preferences. A user must be able to tell whether a change was committed, is still pending, or failed. A failed local write must not silently become a confirmed configuration on the next screen.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current baseline and intended change

Read App.tsx's persist, saveVessel, saveDefaults and finishSetup paths; lib/storage.ts, lib/storage.web.ts, lib/formDrafts.ts; components/Forms.tsx and components/Onboarding.tsx. Native storage uses SQLite rows; the web implementation uses localStorage. Single-key writes are atomic, but the current shell updates several in-memory fields before awaiting persistence and initial setup writes multiple keys sequentially. A quota error or process termination can leave partial configuration.

Do not redo the existing blank vessel form, zero bow-height handling, multi-seabed choices, duration control or input precision fixes. Build commit/recovery semantics around them.

## Ownership and interfaces

Own proposed lib/settingsRepository.ts and its tests, storage.ts/storage.web.ts transaction helpers, Forms.tsx and Onboarding.tsx save-state integration. Coordinate with APP-05 before modifying storage interfaces; APP-05 consumes them read-only. App.tsx and the APP-01 controller are wired only by the integrator. SettingsScreen.tsx is also an integration touch point: provide a prop/action wiring note rather than editing it concurrently.

Use FOUNDATION-02's approved version envelope and migration policy. SAFE-02 owns the equipment-guidance registry and selector; do not implement a competing selector or a freely entered “safe scope” field. You own only persistence and form integration of the approved selection.

## Technical requirements and instructions

1. Define a validated settings record containing schema version, vessel, search defaults, units, offline preference, layer defaults, supported language and configuration-confirmed flags. Preserve the existing database/storage prefix so installed data is found.
2. Implement one logical commit on both platforms. SQLite may use a transaction; web must use one versioned JSON record or a staged-record plus verified active-pointer design. Do not claim several localStorage writes form a transaction.
3. Read legacy vessel/preferences/default keys through a one-time, idempotent migration. Validate each input with domain validators and current read helpers. Missing/corrupt required profile data returns to incomplete setup; it must not receive plausible dimensions.
4. Write the new complete record before changing confirmed in-memory state or closing the form. Retain the user's draft after failure, show a concise error next to Save, and offer retry. Disable duplicate submissions while pending.
5. On successful profile changes, preserve the existing equipment-guidance invalidation rules and invalidate stale plan/watch suggestions through the controller. Do not stop the native service.
6. Keep cancellation side-effect free. Preference changes may be explicitly immediate only if the UI reports pending/error state and reverts after a failed commit; document the selected behavior.
7. Distinguish unsupported future schema from corrupt JSON. Preserve unreadable raw data for recovery, do not silently overwrite it, and show a safe reset/recovery action that identifies what would be removed.
8. Record storage errors without embedding raw vessel profiles, precise coordinates, tokens or arbitrary exception dumps in remote logs.

## Acceptance criteria

- APP-02-AC01: A successful Save produces one validated durable settings revision before the UI claims completion.
- APP-02-AC02: Storage failure leaves the old committed state intact and the edited draft available for retry.
- APP-02-AC03: Repeated Save clicks cannot create concurrent commits or duplicate completion actions.
- APP-02-AC04: Legacy migration is idempotent and preserves valid settings without inventing missing vessel data.
- APP-02-AC05: Interrupted setup cannot yield confirmed flags with absent or invalid vessel/default records.
- APP-02-AC06: Unsupported schema is recoverable and is not overwritten automatically.
- APP-02-AC07: Equipment/profile edits continue to invalidate dependent guidance and plan suggestions while native monitoring remains unchanged.
- APP-02-AC08: The Settings, onboarding and profile/default sheet controls use the same commit contract and expose accessible pending/error feedback.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-02-T01 / APP-02-AC01, APP-02-AC08 | Save a valid profile/default record in fresh native and web repositories; reopen. | Exact canonical values, confirmed flags and units return. |
| APP-02-T02 / APP-02-AC02 | Inject quota/disk failure before activation; save changed loaded draft. | Old loaded draft remains committed; form retains new value and Retry succeeds after fault removal. |
| APP-02-T03 / APP-02-AC03 | Hold commit unresolved and trigger Save twice. | One repository commit and one controller completion action. |
| APP-02-T04 / APP-02-AC04 | Load existing legacy keys including zero bow height and comma-decimal-derived canonical values; restart migration twice. | Values preserved; same new revision; no duplicate record or invented scope guidance. |
| APP-02-T05 / APP-02-AC05 | Interrupt after staging but before activation; restart. | Previous complete record or incomplete setup, never a partially confirmed profile. |
| APP-02-T06 / APP-02-AC06 | Store malformed JSON and a future-version envelope separately. | Clear recoverable states; neither silently becomes defaults nor overwrites original bytes. |
| APP-02-T07 / APP-02-AC07 | While bridge reports monitoring, change anchor design or usable rode length. | Guidance/plan suggestions invalidated; no native stop, arm or anchor movement. |

Run npm run typecheck --workspace=@anchor-buddy/mobile and npm run test --workspace=@anchor-buddy/mobile; export web after integration. Test repository adapters with injected failures and conduct one actual SQLite persistence round trip in the installed native build when available.

## Handoff and limits

Deliver migration design, repository contract, failure tests, wiring instructions and recorded storage-restart results. Estimate 8 worker-hours after APP-01. Exclude cloud sync, accounts, multi-vessel fleet management and wholesale storage replacement. If a migration could discard real user data, stop with a concrete recovery proposal; do not auto-delete to make a test pass.


---

Task source: [APP-03](tasks/APP-03.md) · 7h · P1 · prerequisites: FOUNDATION-01, FOUNDATION-02, APP-01

# APP-03 — Make evidence gaps and full-stay forecasts understandable

Implement a clearer evidence inspector that helps a user understand why a result is excluded or needs more evidence, and what they can do next. Present the deterministic engine's decision faithfully; do not rewrite uncertain evidence as a recommendation.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Existing behavior

Read components/Details.tsx, RegionalDataSheet.tsx, ResultCard.tsx, lib/selectionAssessment.ts, lib/units.ts and the domain AssessmentReason/Assessment types in packages/domain/src/types.ts. Details already expose source dates and all forecast intervals through expansion. RegionalDataSheet already distinguishes centre-point scientific context from assessment data, shows 24/all intervals, and reports provider failures. These behaviors must remain.

The remaining problem is presentation: a long flat list of machine-generated reasons, mixed retrieval/validity dates and generic fallback messages is difficult to act on. Some source IDs appear directly in messages. The new view model should group evidence without hiding exclusions.

## Scope and ownership

Own Details.tsx, RegionalDataSheet.tsx and proposed lib/evidencePresentation.ts plus tests. ResultCard.tsx is owned by APP-04; provide an optional summary prop contract if needed. The domain engine, statuses, reason codes, source objects, tariffs and weather samples are read-only. App.tsx and navigation wiring belong to the integrator. APP-07 owns shared controls and date formatting; consume its public helpers without duplicate formatters.

Inputs are the current Assessment, RegionPack, optional RegionalData and selected display units. Outputs are presentation-only groups and explicit navigation intents such as reviewSearch, reviewBoat or viewSource. FOUNDATION-02 freezes any new fields before use.

## Technical instructions

1. Build a pure presentation mapper for exclusions, missing critical evidence, informational limitations and source provenance. Preserve every original reason code/message in an expandable technical/evidence detail, with source names resolved from sourceIds when available.
2. Put all hard exclusions before missing evidence. Show counts for collapsed categories. Never collapse the only visible statement that a position is excluded, that current evidence expired, or that the result is historical.
3. Give actionable groups only where a real control exists: edit invalid stay dates, edit vessel/equipment, refresh expired live data when online, view a required reviewed pack, or contact an operator through an actual published URL/phone. Otherwise state that the evidence is unavailable; do not invent an action.
4. Keep five time concepts distinct: source observation/publication date, retrieval time, valid interval, review effective interval and snapshot refresh deadline. Label absent dates “not supplied”; retrieval is not survey age.
5. Show the forecast's spatial applicability: search-centre point context versus verified local/full-footprint coverage. Include timezone, stay endpoints, departure contingency and visible gaps. Do not join unrelated intervals into an implied continuous series.
6. Display missing wind gusts, waves and current as unknown, never zero. Include source labels and interval boundaries; maintain all-interval access. If a source supplies values beyond the selected stay, label that context rather than silently extending the assessment.
7. Keep prices/availability/approach separate from suitability. No estimate implies a berth exists, and no map distance implies a navigable route.
8. Implement safe link handling for supported http/https/tel schemes and accessible labels. Do not open arbitrary unvalidated URL schemes from provider data.

## Acceptance criteria

- APP-03-AC01: Every engine reason is represented and the displayed outcome exactly matches the deterministic status.
- APP-03-AC02: Exclusions and expired/current-vs-historical state are visible before optional expansion.
- APP-03-AC03: Every rendered action reaches a usable control or valid source; unsupported actions are absent with a textual explanation.
- APP-03-AC04: Time labels cannot confuse retrieval, observation, validity, review and refresh dates.
- APP-03-AC05: Centre-point context never appears as local anchorage or whole-footprint evidence.
- APP-03-AC06: All forecast intervals and gaps remain accessible, including the departure contingency; unknown values remain unknown.
- APP-03-AC07: Price, availability, permission and approach state remain independently visible.
- APP-03-AC08: Provider source text cannot trigger an unsupported URL scheme or remove evidence through formatting.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-03-T01 / APP-03-AC01, APP-03-AC02 | Test-only assessment with one exclusion, 12 missing-evidence reasons and information. Open detail collapsed. | Excluded status and exclusion visible; group counts match; expanding reveals all reasons. |
| APP-03-T02 / APP-03-AC03 | Expired live data while offline; inspect available actions, then reconnect. | Offline refresh disabled/explained; reconnect makes actual refresh reachable. |
| APP-03-T03 / APP-03-AC04 | Old survey, recent retrieval, future validity end and absent review date. | Four distinct labels; no suggestion that survey became recent. |
| APP-03-T04 / APP-03-AC05, APP-03-AC06 | Real-shaped point forecast with 27 intervals and one gap; inspect local detail and expand source timeline. | Context-only label, all intervals including contingency, explicit gap and unknown gusts. |
| APP-03-T05 / APP-03-AC07 | Paid marina with tariff but unknown berth availability and unverified approach. | Cost visible independently; availability/approach remain unknown/unverified. |
| APP-03-T06 / APP-03-AC08 | Source URLs use javascript:, malformed https, valid https and tel. | Unsafe schemes blocked; supported links correctly labelled and only activated on user action. |
| APP-03-T07 / APP-03-AC01 | Source refresh removes selected place. | Existing recoverable selection state remains, with no stale “passes” detail. |

Run mobile typecheck/tests and web export. Pure mapper tests belong under src/lib/*.test.ts; execute the actual inspector journeys using QA-01's browser harness or record manual evidence before that runner lands.

## Delivery and boundaries

Deliver the mapper, grouped panels, tests and a small action-to-controller wiring table. Estimate 7 hours. No AI summarizer, new chart interpolation, inferred permissions, translated legal rules or replacement safety status. If domain output is contradictory, report it to SAFE-01 with the exact input/reason codes instead of repairing the decision in the UI.


---

Task source: [APP-04](tasks/APP-04.md) · 8h · P1 · prerequisites: FOUNDATION-01, FOUNDATION-02, APP-01

# APP-04 — Keep map markers, list ranks and selections consistent

Implement one shared display projection for map markers and result cards. A selected result must remain identifiable when sorting, filtering, paging or switching views, without turning dense map content into a navigation claim.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Baseline and remaining gap

Read components/Chart.web.tsx, Chart.tsx, mapStyle.ts, ResultCard.tsx and the controller's assessment selectors. Both map renderers currently display the first 50 assessments. App.tsx now labels that cap and separates a manual pin from result counts, but prepending that pin changes the renderer's array indexes while list ranks remain unchanged. A list-selected result outside the first 50 can also lack a visible map marker. Marks and evidence labels are separate overlays and must stay independent from result filters.

Depth/seabed/marks toggles, world presets, map-based search selection and unit-aware web scales already exist. Do not rebuild them.

## Ownership and contracts

Own Chart.web.tsx, Chart.tsx, mapStyle.ts, ResultCard.tsx, MapLayersSheet.tsx and proposed lib/mapResultProjection.ts with tests. Preserve ChartProps compatibility through optional additions approved by FOUNDATION-02; publish the exact new prop contract to the integrator. App.tsx is read-only. APP-05 owns useChartStyle and map cache services. APP-07 owns shared UI primitives.

Accept ordered filtered assessments, selected identity and an optional unranked manual pin. Return stable marker IDs, optional display ranks, page metadata and a separately selected marker. Do not mutate Assessment or use rendered geometry for any domain computation.

## Instructions

1. Define stable identity using candidate/assessment IDs and dataset version where needed. Do not select by array index, display name or nearest map coordinate.
2. Assign list rank before injecting manual pins. A manual chosen pin uses a distinctive labelled symbol and no result rank. Normal generated suggestions retain their filtered-list identity.
3. Keep a bounded first page of 50 ordinary results. Add accessible previous/next page controls or an equivalent explicit “show next results on map” action. Counts must distinguish total filtered results, visible ranked markers and a separate manual pin.
4. Always render the selected result even if outside the current 50-result page, without duplicating it. Cap this exception at one additional result marker. A manual pin may add one further marker; document the maximum of 52 result/pin markers.
5. Selection from list or marker opens the same current detail. Switching views preserves identity. If filters hide the selected result, explain the hidden state or clear it deterministically; never select a different result with the same old rank.
6. Keep user camera gestures when only selection/style/units change. Explicit search-area change or “Show selected position” may move the camera. Respect reduced motion when available.
7. Make marker labels keyboard/screen-reader usable. Include place name, rank where applicable and assessment status. Do not rely on colour alone. Preserve source attribution and unit labels.
8. Explain layer types in the legend: reviewed analysis geometry, scientific display context and community marks. Toggles affect visibility only; hazard/exclusion checks continue unchanged. Do not add a route line.
9. Profile an actual dense result response and a permitted test-only 300-result dataset. Avoid remounting the entire map or rebuilding unchanged markers for every native-watch heartbeat.

## Acceptance criteria

- APP-04-AC01: Every normal marker rank equals its corresponding filtered-list rank; manual pins never shift these numbers.
- APP-04-AC02: Map paging exposes every filtered result and reports visible/total counts accurately.
- APP-04-AC03: A result selected from outside the current page remains visible once on the map with the correct identity.
- APP-04-AC04: Sorting/filtering cannot silently move selection to a different place; removed data follows the existing recoverable-selection behavior.
- APP-04-AC05: Web and native renderers consume the same projection and obey the 52-marker upper bound.
- APP-04-AC06: Layer changes never change assessment status, exclusions or result calculations.
- APP-04-AC07: Keyboard/accessibility users can select a marker or use its equivalent list action without colour-only cues.
- APP-04-AC08: Passive status updates do not reset the map camera, remount the map or produce unbounded marker growth.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-04-T01 / APP-04-AC01 | Three ranked marinas plus manual pin, sort by distance then price. | Same card/marker ranks in each ordering; manual pin unranked. |
| APP-04-T02 / APP-04-AC02, APP-04-AC05 | 123 test-only results; visit every page. | Pages cover 1–50, 51–100, 101–123 without missing/duplicated result IDs. |
| APP-04-T03 / APP-04-AC03, APP-04-AC05 | Select list result 83 while map page 1 is active. | Result 83 appears once in addition to the page; counts distinguish it. |
| APP-04-T04 / APP-04-AC04 | Select a marina, enable anchor-only filter, then refresh data removing that marina. | Explicit hidden/removed selection state; no substitution by index. |
| APP-04-T05 / APP-04-AC06 | Toggle all layers off and on with fixed engine inputs. | Assessment result hashes unchanged; only rendered layers differ. |
| APP-04-T06 / APP-04-AC07 | Keyboard-only web and VoiceOver/TalkBack native marker/list traversal. | Names/statuses announced and activation opens the intended result. |
| APP-04-T07 / APP-04-AC08 | Pan/zoom, then deliver 20 watch heartbeat updates and switch units. | Camera preserved, stable map instance and bounded marker count. |

Run mobile typecheck/tests, web export and native rendering checks on WATCH-01/02 builds when available. Record device/build and dense-response timings; do not invent a frame-rate claim from unit tests.

## Handoff and limits

Deliver projection helpers/tests, both renderers, an integration-props note and screenshots of a manual-pin/ranked-result pair. Estimate 8 hours. Do not add global point clustering, chart-derived navigation, custom vector tile generation or a new map provider. If MapLibre behavior differs by platform, keep the list fully usable and report the exact unsupported native behavior rather than simulating success.


---

Task source: [APP-05](tasks/APP-05.md) · 10h · P1 · prerequisites: FOUNDATION-01, FOUNDATION-02, APP-01, APP-02, OPS-02

# APP-05 — Expose cache budgets, recovery and verified browser updates

Implement a cache-management panel and recovery flow for downloaded maps and evidence. Users must understand what is stored, what is incomplete or expired, and what can be removed without compromising their active context.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current baseline

Read lib/worldMapsCore.ts, worldMaps.ts, worldMaps.web.ts, components/useChartStyle.ts, lib/offlineShell.web.ts, components/MapDownloadsSheet.tsx, scripts/web-offline-worker.js and docs/world-maps.md. Downloads already support coarse-first progress, resume, resource hashes, 3,000 tiles/50 MB per area, local-language fonts, interruption recovery and complete-copy replacement. Those controls were browser-tested in Japan. Do not replace them with a second downloader.

Remaining work is aggregate storage visibility, cross-asset recovery and an understandable browser shell update state. Current per-area caps do not communicate the combined storage used by many areas.

## Ownership and dependencies

Own map cache helpers/adapters listed above, MapDownloadsSheet.tsx, proposed components/CacheManagementPanel.tsx and lib/cacheInventory.ts/tests. APP-06 exclusively owns SavedScreen.tsx; publish the new panel's props instead of editing that screen. The integrator wires Settings/Saved/App shell. APP-02 owns storage repository primitives, which you consume; coordinate any additional method through FOUNDATION-02.

Early preparation may begin after FOUNDATION-02 freezes the contracts: build pure inventory/budget calculations, panel states and test-only adapter doubles. Shared-storage extensions and durable integration wait for APP-02's repository implementation; ask its owner for the required method rather than editing its files. Final provider-budget integration and acceptance wait for OPS-02's implemented shared coordination and unavailable/cooldown contract. Test doubles support early work but do not satisfy that integration gate.

Do not modify domain evidence validity or native watch state. Consume a read-only deletion-protection policy from the controller identifying active/unverified watch and active pack references. Route remote downloads/repairs through the existing API proxy governed by OPS-02's shared provider budget; do not implement another coordinator or add direct-provider/proxy bypasses. Surface its busy/unavailable/cooldown response and preserve resumable state, honoring any explicit retry time without creating an automatic request burst.

## Requirements and steps

1. Build an inventory separating display map areas, cached regional evidence, reviewed pack assets and browser app-shell resources. Show status, known byte usage, source/version, last use/update where actually recorded and expiry where meaningful. Unknown byte usage must remain unknown.
2. Add a 250 MB default user-selected map-cache budget, configurable between 50 and 1,000 MB. This app budget is additional to the existing 50 MB/3,000-tile per-area cap and actual OS/browser availability. Do not promise the OS will retain cached files.
3. Preflight the estimated incremental bytes of a download/update. Count the old complete copy plus staging bytes until activation/cleanup. If required space exceeds budget, ask the user to reduce area/detail or explicitly remove named assets; do not silently evict maps.
4. Query platform free-storage estimates only through supported APIs; when unavailable, report that preflight cannot prove capacity and still catch actual write/quota errors. Preserve partial coarse coverage and the previous complete version.
5. Verify selected manifests/resources on an explicit Repair/Verify action and before use where existing logic requires it. Show corrupt/incomplete state, support resume/refetch for permitted sources, and never mark an unavailable source repaired.
6. Keep active-watch evidence protected when the watch is active or unverified. Deleting a map must not delete its saved search or source evidence; deleting source evidence must not remove profiles/watch logs. Use named confirmation and surface failure without removing the UI row prematurely.
7. Add a browser “Check for app update” status: unsupported/Metro, checking, up to date, verified update waiting, failed/offline. Reuse the integrity-checked service-worker lifecycle. Explain that all Anchor Buddy tabs must close and reopen before activation; do not call skipWaiting or reload while the watch is active/unverified.
8. Prevent shared MapLibre/font/application assets from being counted as verified area coverage unless the area's own manifest references them. Do not broaden offline permissions for scientific WMS/context layers.

## Acceptance criteria

- APP-05-AC01: Inventory separates asset categories and never reports unknown storage/coverage as zero or complete.
- APP-05-AC02: Per-area caps remain enforced and the aggregate budget includes staging plus retained complete maps.
- APP-05-AC03: Budget/quota failure preserves old usable assets and gives an actionable retry/reduce/delete path.
- APP-05-AC04: Corrupt data is detected; repair completion requires verified bytes and a valid manifest.
- APP-05-AC05: Deletion respects active/unverified watch protection and affects only the named asset category.
- APP-05-AC06: Browser update status reflects actual registration/worker state, preserves old complete shell, and never auto-reloads an active watch.
- APP-05-AC07: Interrupted downloads can still resume from Saved with their original area/detail/attribution.
- APP-05-AC08: Cached source expiry never changes simply because it was viewed, verified, repaired or copied.
- APP-05-AC09: Integrated downloads/repairs honor OPS-02's shared busy/unavailable/cooldown responses, retain resumable assets and never fall back to direct provider access or an independent budget.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-05-T01 / APP-05-AC01, APP-05-AC02 | Four 50 MB areas, 30 MB pending update, 250 MB budget; request another 40 MB. | Combined 270 MB request blocked with explicit calculation; existing areas retained. |
| APP-05-T02 / APP-05-AC03, APP-05-AC07 | Write adapter fails after coarse tiles and fonts; restart and resume. | Partial map usable at completed zoom; later resume reaches verified completion. |
| APP-05-T03 / APP-05-AC04 | Corrupt one stored tile/glyph and run Verify then Repair with provider available/unavailable. | Corruption visible; available source repairs hash; unavailable source remains incomplete. |
| APP-05-T04 / APP-05-AC05 | Active/unverified watch references regional pack; attempt deletion, then delete unrelated map after confirmation. | Protected evidence remains; unrelated map alone is removed. |
| APP-05-T05 / APP-05-AC06 | Export A installed, export B published; check update while two tabs use A. | B verified/waiting; A remains usable; normal lifecycle activates B only after old clients close. |
| APP-05-T06 / APP-05-AC06, APP-05-AC08 | Offline update check and expired forecast inventory. | Useful offline state, original forecast deadline unchanged, no false update success. |
| APP-05-T07 / APP-05-AC03 | Platform storage estimate absent and later quota exceeded. | Estimate labelled unavailable; actual write error preserves old active pointer. |
| APP-05-T08 / APP-05-AC07, APP-05-AC09 | Against OPS-02's completed local coordination harness and counting stub provider, begin a download, trigger shared cooldown, then coordinator outage; recover and explicitly resume. | UI reports the actual retry/unavailable state; prior complete and partial assets remain; no direct-provider request or retry burst occurs; resume completes under the shared budget. |

Run mobile typecheck/tests, existing scripts/web-offline.test.mjs through npm run test --workspace=@anchor-buddy/mobile, and export:web. Coordinate actual disconnected-radio/process-restart testing with QA-02.

## Handoff and scope limit

Deliver inventory/budget helpers, panel contract, recovery tests, updated cache documentation and a recorded interrupted update. Estimate 10 hours. No silent LRU eviction, cloud backup, blanket cache deletion, global map bundles or native OTA updater. Stop if provider rights are unclear; leave that layer online-only and identify the exact capability missing.


---

Task source: [APP-06](tasks/APP-06.md) · 8h · P1 · prerequisites: FOUNDATION-01, FOUNDATION-02, APP-01, APP-02

# APP-06 — Persist anchor-plan drafts with explicit reassessment

Implement explicit Save plan and Resume plan behavior for locally planned anchor positions. Treat a saved plan as user intent and dated evidence references, never as permission to arm a watch or as a previously verified safe location.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current state

Read screens/PlannerScreen.tsx, SavedScreen.tsx, lib/workspace.ts and the controller contract from APP-01. Saved searches already preserve a manual selectedPosition, filters, a dated result snapshot and pack identity. Reopening reassesses with the current vessel. Expired stays now require explicit new-date review. Planner currently owns edited coordinates, optional deployed rode and arrival checkboxes in component state; leaving/restarting the app can lose that draft.

Do not duplicate saved-search behavior or restore arrival confirmations from an old stay.

## Ownership and proposed contract

Own PlannerScreen.tsx, SavedScreen.tsx, proposed lib/savedPlans.ts/tests and a focused proposed PlanDraftRepository using APP-02's persistence interface. App.tsx/controller integration is performed by the integrator. APP-05 owns cache-management UI and services; add its agreed panel slot without changing its logic. Domain/native modules and watch logs are read-only.

FOUNDATION-02 must approve a versioned SavedPlan record. Minimum fields: stable id, user name, created/updated timestamps, selected position, planned rode in canonical metres or absent, search preferences/stay, depth-alternative allowance, vessel identity/revision fingerprint and source pack id/version references. Do not embed a trusted live Assessment, raw provider credentials, “monitoring=true”, confirmed-anchor state or arrival acknowledgments.

## Technical instructions

1. Add an explicit Save plan action beside the planner's editing controls. State clearly that planned coordinates/rode are drafts; the user must confirm actual deployment separately at arrival.
2. Validate coordinates, rode, date bounds and maximum supported record count before saving. Limit plans to 30 records initially, matching the scale of existing saved searches; when full, offer named replacement/deletion instead of silent eviction.
3. Save only after persistence succeeds. Keep unsaved edits after failure. When leaving an edited plan, offer Save, Discard or Keep editing without blocking access to an active watch. The watch remains accessible and independently running.
4. Resume by loading the draft and recomputing against current boat and data. Show a material-change notice when the vessel fingerprint, pack version, stay dates or equipment guidance differs. Never automatically apply older boat dimensions.
5. If dates elapsed, propose the preserved duration at a new future window and require explicit confirmation. A new stay clears prior deployed/actual assertions; the planned rode may be retained only as a clearly labelled proposal that requires user review.
6. Reset all arrival checkboxes and anchor/radius/test confirmations on every resume, vessel change, material position/rode change or new stay. No saved plan may issue a native watch command.
7. Separate Saved sections for search snapshots, plan drafts, display maps and source evidence. A plan's source references may be missing/expired; show that and allow review without fabricating the data.
8. Keep deletion scoped: deleting a plan removes that draft only. Retain maps, searches and watch logs. Do not store a generated derived radius as a confirmed alarm radius.

## Acceptance criteria

- APP-06-AC01: Save plan persists a validated versioned draft with canonical inputs and source/vessel references.
- APP-06-AC02: Save failure keeps the user's edits and old saved revision; duplicate clicks do not duplicate records.
- APP-06-AC03: Unsaved navigation offers explicit choices while the watch remains reachable.
- APP-06-AC04: Resume always reassesses with current vessel/data and identifies material changes.
- APP-06-AC05: Elapsed stays require reviewed new dates; no past arrival or confirmation silently carries into a new stay.
- APP-06-AC06: Every resumed plan has empty arrival/watch confirmations and cannot arm/recenter/stop native monitoring.
- APP-06-AC07: Missing or expired source packs remain visible as missing/expired, not a restored “passes” result.
- APP-06-AC08: The 30-plan limit and named deletion are deterministic and do not remove unrelated local assets.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-06-T01 / APP-06-AC01, APP-06-AC04 | Plan coordinates and 40 m rode, save, terminate/reopen app, resume. | Same planned values restored; fresh assessment produced with current input versions. |
| APP-06-T02 / APP-06-AC02 | Fail persistence while saving edited coordinates; retry twice rapidly after recovery. | Draft retained; one successful revision; no duplicate plan. |
| APP-06-T03 / APP-06-AC03, APP-06-AC06 | Dirty planner while native bridge reports monitoring; navigate to watch then back. | Watch reachable without stopping; draft still recoverable; no automatic native command. |
| APP-06-T04 / APP-06-AC04, APP-06-AC07 | Save with vessel A/pack 1; change draft/rode on vessel and delete pack 1; resume offline. | Material-change notice and insufficient evidence; old assessment not treated as current. |
| APP-06-T05 / APP-06-AC05, APP-06-AC06 | Resume an elapsed stay whose old checkboxes were complete. | Date review required; all arrival/watch confirmations false; planned rode explicitly requires review. |
| APP-06-T06 / APP-06-AC08 | Store 30 drafts; save a 31st, cancel replacement, then delete one named draft. | No silent loss; only confirmed named plan removed; maps/searches remain. |
| APP-06-T07 / APP-06-AC01 | Feed future-schema, corrupt, NaN or out-of-range records through reader. | Safe recoverable rejection; invalid draft never reaches assessment or native arm. |

Run mobile typecheck/tests, web export, QA-01 saved-plan browser flow and one real SQLite restart flow on a native build. Repository tests must cover interrupted activation, not just JSON serialization.

## Deliverables and exclusions

Deliver record schema/migration note, repository, planner/saved UI, tests and exact controller wiring instructions. Estimate 8 hours after APP-02. No automatic background draft upload, shared plans, booking, calendar integrations, “safe” location certification or resumed watch sessions. If FOUNDATION-02 cannot approve the record contract, implement the reader/test design and report the blocked write contract instead of inventing a parallel schema.


---

Task source: [APP-07](tasks/APP-07.md) · 10h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02

# APP-07 — Complete accessibility and locale-safe control behavior

Audit and fix shared controls across web, iOS and Android so the app is usable with keyboards, screen readers, large text, signed decimal coordinates and the selected units. Keep the initial application language English; this task does not add unreviewed translations.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Baseline and known completed work

Read components/ui.tsx, Sheet.tsx, SelectField.tsx, SeabedSelect.tsx, LocalDateHourField.tsx; lib/inputNumbers.ts, formDrafts.ts, localDateHour.ts, units.ts and existing tests. Required-field hints, disabled fields, comma decimal parsing, canonical precision through unit changes and local date/hour controls already exist. Date-duration tests already cover a half-hour clock change. Preserve them.

The November browser pass covered desktop and 390 × 844 layouts, not actual device keyboards, VoiceOver/TalkBack, 200% text or full keyboard focus management. Several formatters still explicitly use en-US. Review that as a consistency issue, not as authorization to add languages.

## Ownership

Own the shared controls and formatting helpers named above plus their tests. APP-02 owns Forms.tsx/Onboarding.tsx; APP-03 owns evidence sheets; APP-04 owns chart/result components; APP-06 owns Planner/Saved; APP-08 owns WatchScreen. Do not edit those workers' files concurrently. Publish any new optional control props and a checklist of exact caller changes for the integrator.

Keep existing props backwards compatible where possible. Do not introduce a new component framework or mass restyle the blue/black/gray theme.

## Technical requirements and steps

1. Create a control inventory: text/number field, date calendar, hour selector, single-choice dropdown, multi-choice seabed, checkbox, switch, tab, modal, icon-only action, inline error and async button. Record label, role, value, required/disabled state, focus behavior and error linkage.
2. Ensure every interactive control has an accessible name and selected/checked state appropriate to its actual behavior. Explain disabled actions adjacent to the control where the reason is not evident.
3. Modal opening must move focus into the sheet, constrain web keyboard traversal to the modal, support Escape/platform Back where cancellation is valid, and restore focus to its opener. Closing child setup forms returns to their parent; do not bypass required setup through Escape.
4. Dropdowns/calendars must support keyboard navigation and explicit selection. Multi-select must not close after choosing one seabed. Screen readers must announce current selections and errors without reading decorative icon glyphs as content.
5. Support signed coordinates, decimal comma/point and unfinished numeric drafts. Never turn an empty, '-', '.', NaN or overflow value into zero. Unit changes must preserve canonical values for untouched drafts and explicitly retain invalid drafts for correction.
6. Define one display-format policy: English text, device-local timezone, locale-aware numeric/date ordering where supported, explicit currency code where ambiguous, and consistent 12/24-hour handling. Freeze it with FOUNDATION-02. Do not perform exchange-rate conversion. Reject invalid timestamps safely instead of throwing.
7. Keep stay selection at date/hour precision. Detailed forecast intervals may include minutes when the source requires them; labels must explain the timezone and preserve UTC instants across formatting.
8. Verify layouts at 320/390/768/1024 logical-pixel widths, landscape, 200% text and visible native keyboard. Primary actions and errors must remain reachable without content overlap. Aim for at least 44 × 44 logical-pixel touch targets for essential controls.
9. Respect reduced motion and do not use colour alone for exclusions, selection or watch alerts. Fix shared primitives first; provide targeted caller patches to each owning worker.

## Acceptance criteria

- APP-07-AC01: Every inventory control exposes its accessible name, role and current state with no decorative glyph announcements.
- APP-07-AC02: Modal focus entry, containment, dismissal and restoration work on web; native Back behavior preserves required setup/confirmation rules.
- APP-07-AC03: Keyboard and screen-reader users can choose dates, hours and multiple seabeds without a pointer.
- APP-07-AC04: Invalid numeric drafts are never silently coerced; repeated unit switching preserves valid canonical values within documented conversion tolerance.
- APP-07-AC05: All date/money/unit presenters follow the frozen policy and preserve source currency and UTC instants.
- APP-07-AC06: At the listed viewport/text/keyboard settings, inputs, errors and primary actions remain reachable and do not overlap.
- APP-07-AC07: Status is understandable without colour, motion or icon recognition.
- APP-07-AC08: Actual device keyboard/screen-reader outcomes are recorded separately from browser emulation.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-07-T01 / APP-07-AC01, APP-07-AC02 | Keyboard-only web: open sheet, Tab/Shift-Tab through it, Escape, then reopen. | Focus stays inside while open and returns to opener; no hidden-page activation. |
| APP-07-T02 / APP-07-AC03, APP-07-AC08 | Select sand+mud, deselect sand, open date/hour with keyboard and VoiceOver/TalkBack. | Remaining selection announced correctly; multi-select stays open; date/hour selected explicitly; native device/OS/build evidence recorded separately. |
| APP-07-T03 / APP-07-AC04 | Enter '-', decimal comma, empty and large exponent-like strings; switch nautical/metric/imperial repeatedly. | Invalid drafts remain invalid; valid 25 nm boundary does not round beyond its allowed limit. |
| APP-07-T04 / APP-07-AC05 | Format an identical UTC stay in Europe/Warsaw and Australia/Lord_Howe around DST, with JPY/EUR/USD. | Instants unchanged, local offset/date correct, source currency unambiguous, no conversion. |
| APP-07-T05 / APP-07-AC06 | 320-wide view, 200% text, open native keyboard on last field and show validation error. | Save/cancel/error reachable; no clipped text or action behind keyboard. |
| APP-07-T06 / APP-07-AC07 | Grayscale/high-contrast screenshot and reduced-motion setting. | Excluded/unknown/selected states identified by text/symbol; no necessary motion. |
| APP-07-T07 / APP-07-AC05 | Invalid ISO or unsupported locale input to formatters. | Stable Unknown/invalid display and recoverable diagnostic; no screen crash. |

Run existing mobile typecheck/tests and export:web. Add focused helper tests to the existing lib/*.test.ts suite. Coordinate browser automation with QA-01 and device builds with WATCH-01/02; do not count screen-reader tests as passed if only inspected in source.

## Handoff and limits

Deliver inventory, format policy, shared control changes, caller checklist, test results and the device/browser matrix with untested cells explicit. Estimate 10 hours. No new languages, redesigned navigation, paid accessibility tools or broad stylistic rewrite. If an OS permission prompt prevents testing, report the exact prompt and required human action rather than auto-granting permissions.


---

Task source: [APP-08](tasks/APP-08.md) · 8h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02, APP-01, WATCH-01, WATCH-02

# APP-08 — Complete native watch readiness and user handoff states

Implement the UI handoff from a reviewed plan or manual watch setup to native monitoring, with truthful permission, positioning, audible-test and service-health states. Keep watch operation entirely on the native side.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current baseline

Read screens/WatchScreen.tsx, PlannerScreen.tsx, components/Onboarding.tsx, modules/anchor-watch/src/types.ts, bridge.ts, validation.ts and modules/anchor-watch/README.md. The watch already has native-only availability, explicit anchor/radius confirmation, test-alarm requirement, latched alerts and verified-status polling. Browser builds already refuse monitoring. Planner GPS recently gained stale-response cancellation and stronger timestamp/coordinate checks.

Do not reproduce the native service or weaken those gates. The UI still needs physical-build permission/readiness verification and a consistent cancellation-safe capture path; WatchScreen's capture currently differs from the planner's fuller validation.

## Ownership and input contract

Own WatchScreen.tsx and proposed components/WatchReadinessPanel.tsx, lib/watchReadiness.ts and tests. PlannerScreen/Onboarding/App shell are read-only; provide agreed props and wiring notes to APP-06, APP-02 and the integrator. Swift/Kotlin, bridge protocol and native alert delivery belong to WATCH-01 through WATCH-04.

Use the frozen WatchStatus/permission result protocol. Do not infer a running service from local last-watch storage or a previously armed UI flag. Planning inputs are suggestions only; a planned swing radius must not arrive already confirmed as an alarm boundary.

## Technical steps

1. Define explicit view states: checking native capability, unavailable, permissions needed, position needed, radius needed, audible test needed, ready to arm, arming, monitoring, position uncertain, alarm, interrupted and status unverified. Resolve precedence from native status; a stale successful response must not overwrite a newer alarm.
2. Present a readiness checklist tied to actual bridge results. Explain which permission is missing and offer only the platform's supported Settings handoff. A denied permission returns to an editable setup; do not loop prompts automatically.
3. Share or consistently reuse capture validation with explicit caller bounds: the native manual watch permits ±90° latitude/±180° longitude under its existing bridge contract; map-planned positions remain limited to ±85° latitude. Require finite coordinates, finite nonnegative accuracy within 15 m, timestamp age no greater than 15 s and no more than 5 s in the future, matching the current planner tolerance. Add cancel/in-flight generation guards so manual edits, map input or unmount defeat late fixes. Do not narrow native latitude support merely because the map has a smaller extent.
4. Invalidate confirmations when the relevant anchor, radius, permissions, session or test freshness changes. A test command succeeding is not proof the person heard it; require separate audible confirmation. Consume the native testAlarmAt freshness contract (currently ten minutes), 10–10,000 m radius validation and bridge timing limits; do not introduce divergent UI-only safety thresholds.
5. Label supplied plan coordinates/rode/radius as proposed. Require recording/confirming the actual anchor position after arrival. Never automatically recenter from current GPS. Changing the alarm radius keeps the anchor fixed and requires confirmation.
6. Make active/unverified watch accessible from every primary tab. Search closure, profile changes and Saved navigation must not stop it. Stop is a separate explicit action with current native outcome shown.
7. Show last native contact, last positioning update, accuracy and alarm cause using human-readable units/time. If contact expires, replace Monitoring with status unverified even if the last native snapshot said monitoring.
8. Browser/unsupported builds show requirements only, without fake position, test sound or enabled Arm controls. No AI, internet request or JavaScript timer participates in boundary detection.
9. Keep readiness diagnostics local. Handoff/test evidence uses redacted session state and build/OS metadata; precise coordinates require explicit operator agreement before inclusion in shared artifacts. Do not add telemetry or a new location-export feature in this task.

## Acceptance criteria

- APP-08-AC01: Each bridge capability/permission/service state maps to a single truthful UI state; native uncertainty/alarm takes precedence.
- APP-08-AC02: Arm remains unavailable until actual position, radius, readiness and separate audible confirmation are valid and current.
- APP-08-AC03: Capture rejects stale/invalid fixes and late responses cannot overwrite newer user input.
- APP-08-AC04: Plan suggestions and historical logs never count as confirmed position, radius, test or active monitoring.
- APP-08-AC05: Editing/navigation cannot stop or recenter native watch; radius adjustment preserves anchor and uses explicit confirmation.
- APP-08-AC06: Stale native contact displays unverified status; resumed/restarted interrupted sessions require new readiness steps.
- APP-08-AC07: Unsupported browser builds expose no enabled fake monitoring/alarm workflow.
- APP-08-AC08: Physical-device readiness and audible behavior have recorded human observations, with muted/denied limitations explicit.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-08-T01 / APP-08-AC01, APP-08-AC02 | Deny notification/location permission, return from Settings, then grant supported permissions. | Correct explanation each time; Arm only after remaining explicit readiness steps. |
| APP-08-T02 / APP-08-AC02, APP-08-AC04 | Open from a plan with proposed point/radius; run test command but do not confirm hearing it. | Inputs remain unconfirmed and Arm disabled. |
| APP-08-T03 / APP-08-AC03 | Pending GPS request, manually edit longitude, then resolve old request; separately return NaN/future/stale fixes and latitudes 89°/91°. | New manual value retained; bad fixes rejected; a valid 89° native manual-watch fix is accepted while 91° is rejected. |
| APP-08-T04 / APP-08-AC01, APP-08-AC06 | Deliver newer alarm event while an older getStatus request is pending, then resolve old monitoring reply. | Alarm remains latched; old response ignored. |
| APP-08-T05 / APP-08-AC05 | Native session active: close search, edit boat, move across tabs, change radius after confirmation. | Same native anchor/session retained; only explicit radius command sent. |
| APP-08-T06 / APP-08-AC06 | Stop native heartbeat/process, then reopen app; repeat after device reboot. | UI unverified/interrupted, never falsely Monitoring; new test/confirmations required. |
| APP-08-T07 / APP-08-AC07, APP-08-AC08 | Open browser, then installed devices with sound muted/Focus or DND. | Browser cannot arm; native UI never promises audibility that the human did not verify. |

Run mobile typecheck/tests and the anchor-watch workspace tests. Use WATCH-01/02 builds and WATCH-04's physical trial matrix for device evidence. Tests may inject bridge responses only through test entry points; no production simulator or runtime synthetic fixes.

## Delivery and stop conditions

Deliver the readiness mapper, UI, race/failure tests, integration notes and device screenshots/results. Estimate 8 hours after native binaries are available. Do not implement critical-alert entitlements, background-location bypasses, automatic reboot start or new alarm algorithms. If native status contradicts the interface, retain the conservative unverified state and report the exact sequence to the WATCH owner; never “fix” it by trusting a persisted UI flag.


---

Task source: [WATCH-01](tasks/WATCH-01.md) · 12h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02

# WATCH-01 — Compile and integrate the actual iOS watch

## User instruction

Build Anchor Buddy as an actual iOS development application and fix the native integration issues that prevent its existing anchor-watch module from compiling, loading, and returning truthful status. Produce a reproducible simulator build and a device-install procedure. Do not treat a JavaScript export, Swift syntax check, or Expo Go session as completion of this task.

**Estimate:** 10–14 worker-hours, excluding toolchain downloads and device/signing waiting. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-01 baseline and FOUNDATION-02's recorded fingerprint of the existing watch contract. Preserve `modules/anchor-watch/src/types.ts` and `modules/anchor-watch/src/validation.ts`; FOUNDATION-02 records their identity rather than redesigning the protocol. The integrator owns and approves any shared protocol change. WATCH-02 may run concurrently. WATCH-03 consumes the build result. Physical overnight acceptance belongs to WATCH-04. Final build acceptance uses the integrator-approved protocol revision and exact shared plugin/app configuration included in the compiled artifact.

## Current baseline and ownership

Read `modules/anchor-watch/README.md`, `modules/anchor-watch/src/types.ts`, `src/bridge.ts`, `src/validation.ts`, `modules/anchor-watch/ios/AnchorWatchModule.swift`, `AnchorWatch.podspec`, `modules/anchor-watch/app.plugin.js`, `apps/mobile/app.json`, and `apps/mobile/package.json`. The existing implementation uses CoreLocation, local notifications, persisted interruption state and the Expo module bridge. The podspec declares iOS 16 and Swift 5.9; determine the effective supported deployment target from the installed Expo dependency graph rather than assuming that declaration is sufficient. Previous verification produced Hermes bundles, not an Xcode binary.

You may edit `modules/anchor-watch/ios/**`, proposed `scripts/native/verify-ios.*`, and a proposed `docs/native/ios-build.md`. Generated `apps/mobile/ios/**` may be changed locally for diagnosis but must not become the durable source of configuration fixes. Do not edit Android, shared TypeScript watch contracts, `App.tsx`, dependency lockfiles, `app.json`, or the shared plugin without the integrator's ownership transfer. Supply the smallest required shared-file patch in your handoff; the integrator applies it once.

## Technical requirements and implementation steps

1. Record baseline commit, host architecture, macOS, Node/npm, full Xcode, selected SDK, CocoaPods and Ruby versions. Check that `xcode-select -p` identifies full Xcode. If the toolchain is missing, document the exact missing component; do not label the task complete.
2. From the assigned isolated checkout, install the locked dependencies with `npm ci`. Generate the iOS project through the supported Expo flow. Never run destructive prebuild cleanup against uncommitted native work; use a disposable generated directory/checkpoint.
3. Compile the complete application for an available simulator. Fix Swift/Expo API, imports, availability checks, pod resolution, linker or generated-capability errors in source/plugin configuration. Do not remove watch code or replace it with a stub to obtain a green build.
4. Inspect the generated application: local module is autolinked once; location usage descriptions and background-location mode exist once; notification delegate forwarding does not break other Expo consumers. Keep the current explicit Always/Precise permission requirement; any proposed shared protocol change requires the integrator's explicit review and approval. Do not migrate to a new location API solely because newer documentation shows it.
5. Launch the compiled application. Verify `getStatus()` returns `nativeAvailable: true` and an idle/interrupted state supported by actual process state. Reading/subscribing must never arm, move, stop, or acknowledge a watch. Verify one listener receives one event, unsubscribe works, and remounting does not create duplicate location managers.
6. Exercise denied, temporary and adequate permissions with available simulator controls. Keep alert-test success distinct from a human confirming audibility. Preserve native validation for finite coordinates, radius, freshness and confirmations; keep `interrupted` on restart instead of silently resuming a persisted armed flag.
7. Document physical-device installation using an already available signing identity. Do not create an Apple account, purchase membership, commit a signing profile/certificate, or accept new account agreements. Store build logs and device identifiers privately; commit only redacted results and reproducible commands.

## Acceptance criteria

- **WATCH-01-AC01:** A clean, locked install produces a successful full iOS simulator application build; the report identifies its commit and exact toolchain.
- **WATCH-01-AC02:** The compiled app loads the real local watch module and reports `nativeAvailable: true`; no simulator implementation is imported into runtime.
- **WATCH-01-AC03:** Generated background/location configuration and module registration are present once and survive regeneration.
- **WATCH-01-AC04:** Insufficient permission and invalid arming input fail with actionable errors, without starting native monitoring.
- **WATCH-01-AC05:** Reading status, subscribing and UI remounting do not mutate the fixed anchor/session or duplicate processing.
- **WATCH-01-AC06:** Relaunching after process termination cannot report a persisted session as monitoring without verified native activity.
- **WATCH-01-AC07:** Durable fixes live in maintained source/configuration, and no credentials or generated signing artifacts are tracked.

## Test cases

| ID | Setup and action | Expected result / AC |
| --- | --- | --- |
| WATCH-01-T01 | Fresh assigned checkout, locked install, generate and compile for a recorded simulator. | Actual `.app` produced with successful compiler/linker exit; AC01–03. |
| WATCH-01-T02 | Launch the compiled app and read status twice before arming. | Native available, idle/interrupted, unchanged anchor/session; AC02, AC05. |
| WATCH-01-T03 | Deny location or notifications, then attempt native arming with otherwise valid input. | Rejection and no running watch; permission explanation visible; AC04. |
| WATCH-01-T04 | Subscribe/unsubscribe repeatedly, navigate away/back and read status. | No duplicate events/managers and no watch-control side effects; AC05. |
| WATCH-01-T05 | Persist a genuinely armed development session, terminate and relaunch. | Interrupted/unverified status until explicit new confirmation and arming; no auto-recentre; AC06. |
| WATCH-01-T06 | Regenerate native project from maintained configuration in a second disposable build directory. | Same capabilities and module availability; no manual generated-project fix required; AC03, AC07. |

Existing commands: `npm run typecheck --workspace=@anchor-buddy/anchor-watch`, `npm test --workspace=@anchor-buddy/anchor-watch`, and `npm run ios --workspace=@anchor-buddy/mobile`. Capture the generated workspace/scheme and exact successful `xcodebuild` invocation in the report; do not invent a scheme name in advance. Any `scripts/native/verify-ios.*` command is a **new deliverable**, not an existing command.

## Handoff and stop conditions

Deliver source fixes, redacted compiler logs, generated-capability inspection, a launch screenshot, AC/test matrix and device-install steps. Mark device installation separately as not run if signing or hardware is unavailable. Escalate shared-contract changes and OS restrictions rather than weakening them. App Store distribution, critical-alert entitlement, overnight reliability claims and on-water approval are non-goals.

References checked 2026-11-11: [Expo local compilation](https://docs.expo.dev/guides/local-app-development/) distinguishes native compilation from Metro; [Apple background location](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background) documents background capability and lifecycle considerations. Recheck SDK-specific details when executing.


---

Task source: [WATCH-02](tasks/WATCH-02.md) · 12h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02

# WATCH-02 — Compile Android and verify foreground-service integration

## User instruction

Build and launch the actual Android application, fix compilation/integration failures in the existing Kotlin anchor watch, and verify that the location foreground service starts only through an explicit visible-app action. Preserve honest interruption, permission and notification behavior. A web preview or Hermes export does not satisfy this task.

**Estimate:** 10–14 worker-hours, excluding Android SDK downloads. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-01 and FOUNDATION-02. Can run alongside WATCH-01 because platform source ownership is separate. WATCH-03 and WATCH-04 consume your results.

## Baseline and permitted files

Read `modules/anchor-watch/android/build.gradle`, `android/src/main/AndroidManifest.xml`, `android/src/main/java/expo/modules/anchorwatch/{AnchorWatchModule,AnchorWatchService,WatchRuntime,WatchNotifications}.kt`, the shared `src/types.ts`/`validation.ts`, `app.plugin.js`, `apps/mobile/app.json`, and the native-watch README. The current service is deliberately `START_NOT_STICKY`, non-exported and not boot-restored. It uses GPS location callbacks and native heartbeat processing; notification channel checks gate arming. The prior environment lacked a configured Android SDK and had Java 11, which is not the documented project toolchain.

Own Android module files, proposed `scripts/native/verify-android.*`, and `docs/native/android-build.md`. Generated `apps/mobile/android/**` is disposable diagnostic output. Shared plugin, app configuration, package manifests/lockfile, TypeScript bridge and application screens stay read-only unless the integrator transfers ownership. Report required shared patches instead of conflicting with the iOS worker.

## Implementation requirements

1. Record host, JDK, SDK platform/build tools, emulator/API image, Gradle wrapper and Android Gradle Plugin versions actually used by the locked Expo project. Use the project-supported JDK/toolchain, initially JDK 17 as recorded in the README; verify instead of blindly upgrading the dependency stack.
2. Install locked dependencies and generate/compile a debug Android app. Fix Kotlin/Expo incompatibilities, manifest merging and service registration in maintained source/plugin configuration. Keep MapLibre and SQLite linked; removing native modules is not a valid fix.
3. Inspect the merged manifest. Require one non-exported location service, foreground-service/location permissions and required runtime location/notification declarations. Do not add broad background-location access, exact alarms, accessibility services, boot startup or battery-optimization exemptions as a shortcut.
4. Start a watch only from the app's explicit foreground arming action after permission and real native test-alarm checks. Check service-start exceptions and activity state at the boundary. If the activity backgrounds during permission/arming, return an actionable failure rather than claiming monitoring. Current Android background-start restrictions must be respected; document tested API levels.
5. Verify persistent service and alarm channels independently. A service notification is not proof of audible alarms. Approximate-only location, GPS disabled, notification denial or unusable alarm-channel settings must not produce a healthy watch indicator. Preserve the fixed anchor and native freshness/accuracy checks.
6. Exercise service detachment, activity recreation, JavaScript disconnect, process termination and relaunch. Monitoring can continue when only the activity/JavaScript disappears if the OS service remains alive; a killed service cannot be recovered from a stored boolean. Explicit stop must remove location listeners, heartbeat callbacks and ongoing notification.
7. Document debug APK installation and capture redacted logcat/build output. Never commit keystores, passwords, device serials, precise live tracks or generated native folders. Supply an unsigned/reproducible internal build; distribution signing is separate.

## Acceptance criteria

- **WATCH-02-AC01:** A clean supported toolchain compiles and installs an actual debug APK, with recorded commit and API levels.
- **WATCH-02-AC02:** The installed app reports native availability through the real module; no JavaScript simulator replaces it.
- **WATCH-02-AC03:** Merged manifest and service startup obey declared location-service requirements, with no exported or boot-started watch service.
- **WATCH-02-AC04:** Missing precise location, disabled GPS, denied notifications or disallowed foreground startup prevent arming and do not claim monitoring.
- **WATCH-02-AC05:** Native state continues independently of JavaScript while the actual service remains running; fixed anchor/radius do not change implicitly.
- **WATCH-02-AC06:** Service/process death is reported as interrupted on reopening; explicit stop releases callbacks/listeners and notification resources.
- **WATCH-02-AC07:** Regeneration reproduces integration fixes, with no signing secrets or private device data in tracked artifacts.

## Test cases

| ID | Setup and action | Expected result / AC |
| --- | --- | --- |
| WATCH-02-T01 | Clean checkout/toolchain; build and install on a recorded emulator. | Successful APK, module loads, idle status; AC01–03. |
| WATCH-02-T02 | Grant coarse location only, or disable GPS, then arm. | Clear failure; no service represented as healthy; AC04. |
| WATCH-02-T03 | Deny notification permission or disable alarm-channel sound; request test/arm. | Relevant readiness check fails; no fabricated audible-test completion; AC04. |
| WATCH-02-T04 | Start from visible app, then background activity and disconnect Metro. | Native service status/timestamps continue when the OS allows execution; no anchor change; AC05. |
| WATCH-02-T05 | Background the activity while an arming request is pending. | Disallowed start fails cleanly; no uncaught service-start exception or false monitoring; AC03–04. |
| WATCH-02-T06 | Force-stop and relaunch; separately arm then use Stop. | First case interrupted, second idle with resources released; neither auto-arms; AC06. |
| WATCH-02-T07 | Regenerate native project and rebuild from maintained configuration. | Same permissions/service registration and no undocumented manual patch; AC07. |

Existing commands: `npm run android --workspace=@anchor-buddy/mobile`, `npm run typecheck --workspace=@anchor-buddy/anchor-watch`, `npm test --workspace=@anchor-buddy/anchor-watch`. After generation, record the actual wrapper task (for example the generated project's `assembleDebug` task if present) and emulator-install command. A new verification script must document its assumptions and fail on missing toolchain components.

## Deliverable and blockers

Return the build artifact location, redacted logs, merged-manifest evidence, API-level matrix and AC/test results. If hardware is unavailable, simulator checks remain simulator checks. Do not weaken platform policies or label an untested OEM battery mode supported. Play Store submission, release keystores and overnight watch approval are not in scope.

References checked 2026-11-11: [Android location foreground-service requirements](https://developer.android.com/develop/background-work/services/fgs/service-types#location), [background startup restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start), and [Expo local builds](https://docs.expo.dev/guides/local-app-development/). The implementation must start its location service from a visible activity and validate the installed target SDK's rules.


---

Task source: [WATCH-03](tasks/WATCH-03.md) · 16h · P0 · prerequisites: FOUNDATION-02, WATCH-01, WATCH-02

# WATCH-03 — Execute identical watch scenarios against native engines

## User instruction

Add executable Swift and Kotlin tests for the watch's state transitions, persistence and alert latching, and compare their normalized results with the existing TypeScript reference kernel. Use controllable clocks and location inputs inside test targets only. Do not expose a production position injector, simulator toggle or remote watch-control endpoint.

**Estimate:** 14–18 worker-hours. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-02's recorded fingerprint of the existing watch contract and successful WATCH-01/WATCH-02 build paths. Preserve `modules/anchor-watch/src/types.ts` and `modules/anchor-watch/src/validation.ts`; FOUNDATION-02 records their identity rather than redesigning the protocol. Contract/test-vector design may begin before both builds finish. Final parity acceptance requires actual native runners built against the same integrator-approved protocol revision and completed WATCH-01/02 build evidence. Reserve both native module directories only after the platform build workers release them; do not edit their files concurrently.

## Baseline and file ownership

Current production engines live in `modules/anchor-watch/ios/AnchorWatchModule.swift` and `android/src/main/java/expo/modules/anchorwatch/WatchRuntime.kt`, with platform services/notifications alongside them. Tests in `modules/anchor-watch/src/{kernel,simulator,bridge}.test.ts` use the reference implementation under `src/testing/`; they do not execute CoreLocation or an Android service. `src/types.ts` defines six states and the observable status contract. Existing arming validation requires confirmations, recent test alarm, fixed coordinates and bounded radius/position accuracy.

Own proposed native test targets/source sets, `modules/anchor-watch/tests/vectors/**`, small dependency-injection seams in native engines, and proposed native test scripts. The integrator owns and approves shared TypeScript protocol changes; submit a proposed amendment with cross-platform compatibility evidence rather than editing that protocol independently. `src/testing/kernel.ts` changes require review and must not simply be altered to match a native defect. Keep UI, domain assessment and provider code read-only.

## Requirements and ordered work

1. Define a versioned, test-only scenario format: initial persisted state, wall/monotonic time, permissions, alarm-test event, explicit arm options, fixes, clock ticks, acknowledge/radius/stop events, and expected normalized state after each event. Include fixture intent and contract version. Each scenario must name the requirement it proves.
2. Separate deterministic boundary/state logic from platform adapters only as far as needed to execute it. Inject a clock, persistence fake and notification sink in test targets; production constructors always bind real implementations. Preserve platform location timestamp handling rather than pretending wall and monotonic time are interchangeable.
3. Implement three runners over the same scenario files: TypeScript reference, Swift XCTest and Kotlin JVM/instrumented tests as appropriate. Use actual native source code for decisions. Platform callback wiring remains covered by integration/device tests, not by a port of the reference kernel in a test file.
4. Normalize generated IDs and human-readable message text; compare states, active flags, anchor/radius, health, last usable fix, alert kinds/order/acknowledgment and interruption behavior. Compare finite distances with a documented tolerance, initially 0.5 m unless the frozen contract defines a stricter supported tolerance. Do not normalize away disagreement about boundary classification.
5. Cover fully inside, accuracy circle touching/overlapping boundary, fully outside, repeated boundary events, good-fix recovery before/after acknowledgment, stale/future/out-of-order fixes, wall-clock jumps, permission loss, provider loss, restart and corrupt stored state. Test radius edits and all invalid options directly through the native boundary.
6. Verify bounded logs (current target: last 100 alerts), idempotent cleanup and no implicit arming during status/subscription/reload. Include native notification-sink failure: failed test delivery must not create a valid fresh alarm-test timestamp.
7. Add a release-artifact inspection that proves test vectors/injection entry points and test-only simulation code cannot be called from the production bridge. Preserve the existing runtime-import guard and add a native equivalent where needed.

## Acceptance criteria

- **WATCH-03-AC01:** The same versioned scenario corpus executes against TypeScript, actual Swift decision code and actual Kotlin decision code.
- **WATCH-03-AC02:** All normalized safety-relevant states and alert transitions agree; tolerated numeric differences are declared and bounded.
- **WATCH-03-AC03:** A fixed confirmed anchor never changes except through a new explicit session; radius changes require confirmation and immediate reevaluation.
- **WATCH-03-AC04:** Stale/invalid fixes, permission loss and persistence corruption cannot produce healthy monitoring or auto-resume.
- **WATCH-03-AC05:** Alarm tests and latching/acknowledgment behave correctly when delivery fails or a problem is still present.
- **WATCH-03-AC06:** Production artifacts contain no callable injection/simulation API, and runtime guards continue to pass.
- **WATCH-03-AC07:** Native-test commands return nonzero on a deliberately introduced expectation mismatch and produce machine-readable results.

## Test cases

| ID | Setup/action | Expected result / AC |
| --- | --- | --- |
| WATCH-03-T01 | Confirm anchor/radius, fresh test; replay inside → overlap → fully outside. | Arming/monitoring → uncertainty → latched boundary alert consistently; AC01–02. |
| WATCH-03-T02 | Boundary alert, then acknowledge while still outside; later supply good fix. | No false healthy state while problem persists; recovery follows contract; AC02, AC05. |
| WATCH-03-T03 | Replay old/future fixes and backward/forward wall-clock jumps while monotonic time advances. | Freshness cannot be extended by wall-clock changes; invalid samples never clear alert; AC04. |
| WATCH-03-T04 | Arm, edit radius with confirmation false/true, read status repeatedly. | First rejected; second reevaluates current fix; anchor identical throughout; AC03. |
| WATCH-03-T05 | Persist active/corrupt session and recreate native runtime. | Interrupted or safely rejected state, never restored healthy monitoring; AC04. |
| WATCH-03-T06 | Notification sink throws on test; attempt arm; generate >100 alerts. | No valid test stamp from failed delivery; bounded deterministic log; AC05. |
| WATCH-03-T07 | Build release-capable app and inspect bridge symbols/import manifest; alter one vector expectation and rerun test. | No injection path in runtime; test process detects mismatch; AC06–07. |

Existing checks: `npm test --workspace=@anchor-buddy/anchor-watch`, `npm run check:runtime`. Native XCTest/Gradle runner commands and a combined parity command are **new deliverables**; derive their exact target names from WATCH-01/02 artifacts and document them. These tests do not establish actual alarm audibility or overnight scheduling.

## Handoff/non-goals

Deliver vector schema/corpus, three runners, machine-readable comparison report, production-artifact exclusion proof and regression fixes. Escalate contract disagreements to the integrator; do not average classifications or relax margins to make tests match. Do not add server/AI watch control, background-start workarounds, or claim device reliability from deterministic test results.


---

Task source: [WATCH-04](tasks/WATCH-04.md) · 10h · P0 · prerequisites: WATCH-01, WATCH-02, WATCH-03, APP-08

# WATCH-04 — Run controlled physical-device watch trials

## User instruction

Prepare and execute a reproducible physical-device acceptance campaign for the native anchor watch. Record what each device actually did while locked, backgrounded, disconnected, restricted or restarted. This is evidence gathering for an internal alpha; it is not authorization to rely on the app for vessel safety or to publish it publicly.

**Estimate:** 8–12 active worker-hours plus at least two 8-hour overnight runs per platform; calendar time is a hard dependency. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies for final integrated-device acceptance:** WATCH-01 and WATCH-02 actual installable builds, WATCH-03 state-machine acceptance, APP-08's integrated readiness/handoff UI, and approved operator/device access. Protocol preparation, device inventory and scheduling may start before those implementation dependencies complete. Freeze and record the candidate containing both native code and APP-08 UI before acceptance runs; trials of an earlier build do not validate the final handoff controls. APP-08 may reuse this protocol without depending on completion of these overnight trials. On-water execution additionally requires QA maritime-review clearance and an independent competent lookout/skipper. If any prerequisite is missing, prepare the protocol and mark execution blocked rather than inventing results.

## Baseline, ownership and inputs

Read `modules/anchor-watch/README.md`, `src/types.ts`, current native implementations, `apps/mobile/src/screens/WatchScreen.tsx`, `docs/release-checklist.md`, and WATCH-01–03 evidence. Current implementation deliberately cannot alert after process death and never restarts an armed session automatically. It checks native process/service state when the app returns; JavaScript status is not a promise that the OS will keep running.

Own proposed `docs/validation/watch-device-protocol.md`, anonymized result templates and `scripts/native/collect-watch-evidence.*` if needed. Do not modify watch algorithms or UI while testing a frozen candidate; file reproducible defects against a specific SHA. Logs containing precise location, device identifiers or personal data remain in private local artifacts. Public reports use anonymous device labels and bounded time-relative summaries.

## Execution instructions

1. Build a matrix covering one physical iPhone and one physical Android device at minimum, recording OS version, device model class, build SHA, battery health context, permissions and power settings. If resources allow, add the oldest supported OS and a second Android OEM; absent combinations remain explicitly untested.
2. Define safe land-based boundary trials first. Use a fixed reference coordinate in a controlled test area, a manually confirmed radius, measured reference points and an observer. The test must not require drifting a real vessel toward shore, shallow water or hazards. Controlled on-water validation is a separately authorized session with safe abort criteria.
3. For each run, record actual anchor/radius confirmation, permission state, native test submission and human confirmation of heard/seen alarm. Record observable status transitions, location accuracy, fix age, heartbeats and alerts. Collect battery change and temperature/charging conditions without asserting an arbitrary battery-life guarantee.
4. Execute screen lock/background, loss of network/JavaScript, poor reception, boundary crossing, accuracy-overlap, permission changes, GPS disabled, low-power/battery-saving mode, notification denial, muted channels, silent/Focus/Do Not Disturb and low volume. Never promise that silent-mode or OS restrictions can be bypassed.
5. Distinguish activity dismissal, OS process kill, force-stop, reboot and shutdown. Confirm interruption on reopening and explicit rearming requirements. An absent notification after death is an expected limitation, not a reason to implement auto-arming or remote alerts in this task.
6. Run two stationary overnight sessions per platform, each at least eight hours with an independent observer/check process. Include a locked/background run and a constrained-power/reception run. Record every gap and whether the process was still scheduled; mark missing evidence inconclusive, not passed.
7. Produce a defect list with reproduction, severity, source SHA, expected/actual states, environment and sanitized artifacts. Re-run only affected cases after a fix plus one ordinary arming/stop smoke; changing the candidate SHA invalidates relevant prior evidence.

## Acceptance criteria

- **WATCH-04-AC01:** Protocol and result template enumerate device/build/environment, action sequence, expected state, actual observation and evidence for every case.
- **WATCH-04-AC02:** Required physical iOS and Android runs are actually executed; simulator, replay and unobserved overnight time are never marked physical-device passes.
- **WATCH-04-AC03:** Explicit arming, fixed anchor, audible-test confirmation, boundary/uncertainty latching and stop behavior are observed on both platforms.
- **WATCH-04-AC04:** Network or JavaScript loss does not substitute simulated monitoring; actual native continuation or interruption is recorded.
- **WATCH-04-AC05:** Process death/reboot is honestly represented on relaunch, with no auto-arm/recentre and no claim of alarms while dead.
- **WATCH-04-AC06:** Muted/denied alerts, permission and power restrictions have documented observed results and visible product limitations.
- **WATCH-04-AC07:** Two eight-hour overnight runs per platform have complete evidence or an explicit incomplete/blocked result; unresolved monitoring-critical defects block watch alpha approval.
- **WATCH-04-AC08:** Tracked reports contain no private coordinates, credentials or device identifiers and distinguish land trials from any authorized on-water trial.

## Test cases

| ID | Setup/action | Expected observation / AC |
| --- | --- | --- |
| WATCH-04-T01 | Physical device, approved permissions, manually confirm fixed anchor/radius, hear test, arm then stop. | Real arming/fix/monitoring and complete resource cleanup; AC02–03. |
| WATCH-04-T02 | While genuinely monitoring, lock screen and disable internet/Metro; cross a safe land-test boundary with an observer. | Native local processing/alert observed, or concrete defect; anchor unchanged; AC03–04. |
| WATCH-04-T03 | Obstruct reception or supply actual poor-GPS conditions without changing anchor. | Health/freshness issue appears while process runs; no fabricated good fix; AC03, AC06. |
| WATCH-04-T04 | Change notification/sound, Focus/DND, GPS and location permissions one at a time. | Record actual alert suppression/readiness/interruption and matching visible limitations; AC06. |
| WATCH-04-T05 | Force-stop/kill, reboot, then relaunch after each event. | No resumed monitoring from stored armed flag; new explicit test/arm required; AC05. |
| WATCH-04-T06 | Two eight-hour locked runs per platform under recorded normal/constrained settings. | Timestamped evidence, battery summary, gaps and alarms; any missing critical record is inconclusive; AC07. |
| WATCH-04-T07 | Review public report against raw private evidence. | Traceability without precise coordinates/identifiers; only actually performed trials claimed; AC01, AC08. |

Use build/install commands proven in WATCH-01/02. A log collector, if introduced, is a new command and must default to local redacted output with explicit export. Do not send reports to third parties or schedule paid on-water work automatically. Return a clear pass/fail/blocked matrix to the integrator and QA release owner.


---

Task source: [OPS-01](tasks/OPS-01.md) · 12h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02

# OPS-01 — Bound API work and protect request privacy

## User instruction

Harden the existing public-data API so unauthenticated requests cannot cause unbounded compute, upstream traffic, memory use or sensitive logging. Keep core app use account-free. Preserve all existing real-data, review, provenance and fixed-host proxy boundaries; do not add a generic proxy or a remotely writable chart-publishing endpoint.

**Estimate:** 10–12 worker-hours. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-01 baseline and FOUNDATION-02 error/schema contracts. Coordinate interface names with OPS-02, which owns app-wide upstream scheduling; this task owns inbound HTTP protection, not provider-fetch coordination.

## Baseline and scope

Read `apps/api/src/server.ts`, `src/index.ts`, `src/packs.ts`, `src/providers/map-proxy.ts`, `src/providers/http.ts`, `src/providers/geocode.ts`, tests, `.env.example` and `LIVE_DATA.md`. Existing protection includes a 256 KiB body limit, exact CORS origin matching, provider host allowlists, bounded upstream bodies, search-option limits and disabled request logging with limited redaction. CORS is a browser-origin policy, not authentication; direct native/CLI clients omit Origin. Existing `/health` reports process/service capabilities, not a database-backed release guarantee.

Own `apps/api/src/server.ts`, proposed request-policy/privacy helpers, `apps/api/test/security*.test.ts`, and a proposed `apps/api/SECURITY_OPERATIONS.md`. Reserve `server.ts` for this worker during implementation; other API tasks submit route-registration patches to the integrator. `providers/http.ts`, `disk-cache.ts`, native code, domain algorithms, production secrets, `.env.example` and `infra/**` are read-only unless ownership is transferred. Submit environment/documentation amendments for one coordinated merge.

## Implementation steps

1. Inventory each existing route's method, input limits, outbound work, cacheability and sensitivity. Preserve route methods and successful response contracts. Separate liveness from readiness if the ops contract needs both; unknown provider coverage is not a reason to return fabricated data or a blanket healthy safety status.
2. Add configurable inbound rate/concurrency limits for discovery, geocoding, map-resource fetches, expensive search and large pack assets. Choose documented development defaults and production configuration; use route classes rather than a single limit that makes normal map downloads unusable. Bound pending queues and return structured `429`/`503` with a usable retry indication. Implement tests with fake time, not real sleeps.
3. Enforce validated maximum string lengths, dates/radii/options, request decompression/body bounds where applicable, maximum asset size and request timeouts. Reject invalid input before calling providers or loading large packs. Preserve deterministic exclusion/insufficient-evidence outcomes for valid but unsupported data.
4. Keep client cancellation effective: abandoned requests must not allocate unlimited work or leave orphaned long-lived buffers. Do not cancel a deduplicated upstream operation still needed by other clients; coordinate this contract with OPS-02.
5. Review logging/error serialization. Neither URLs/query strings containing addresses/coordinates nor boat dimensions, anchor tracks, credentials, authorization/cookies, tokens or raw upstream bodies may enter ordinary production logs. Log request IDs, route templates, durations, status, provider identifiers and coarse failure codes. Any diagnostic opt-in must remain local, explicit and redacted by default.
6. Validate exact trusted origins in production and trusted-proxy handling. Do not trust arbitrary forwarded-IP headers. Do not require a browser Origin from native clients, and do not turn permissive CORS into a substitute for protecting a future operator action.
7. Add a negative test inventory for path traversal, encoded separators, arbitrary/credential-bearing proxy URLs, redirects, malformed JSON, unknown routes, large bodies and response leakage. Use dummy canary strings, not real secrets. Current packs remain immutable and operator publication stays outside the public API.

## Acceptance criteria

- **OPS-01-AC01:** Every existing public route has documented input/work limits, and invalid input is rejected before costly work.
- **OPS-01-AC02:** Configured burst/concurrency/queue limits produce deterministic structured failures; normal bounded map downloads still work.
- **OPS-01-AC03:** Direct native clients remain usable without mandatory accounts or Origin headers; untrusted browser origins are rejected.
- **OPS-01-AC04:** Proxy/asset/path input cannot access arbitrary destinations, local files or credentials-bearing URLs.
- **OPS-01-AC05:** Captured ordinary logs/error bodies contain none of the privacy/credential canaries injected by tests.
- **OPS-01-AC06:** Cancellation/timeouts release request resources and do not corrupt another client's shared request or cache.
- **OPS-01-AC07:** Reviewed-pack gates and synthetic-data rejection remain enforced; no public mutation route appears.

## Test cases

| ID | Setup/action | Expected result / AC |
| --- | --- | --- |
| OPS-01-T01 | Send valid requests for each route, then malformed/oversized equivalents while instrumenting provider calls. | Valid contracts preserved; invalid calls produce bounded 4xx and zero upstream work; AC01. |
| OPS-01-T02 | Fake-clock burst exceeds a configured route bucket and queue; advance clock. | Excess calls receive retry-aware errors, later calls recover, active count remains bounded; AC02. |
| OPS-01-T03 | Call from exact allowed Origin, hostile Origin, no Origin and spoofed forwarded headers. | Correct browser policy; native access preserved; spoof cannot bypass limits; AC03. |
| OPS-01-T04 | Submit encoded traversal, localhost/cloud-metadata/arbitrary hosts, redirect and credential URL variants to proxy/assets. | Rejected before external/local access; AC04. |
| OPS-01-T05 | Inject canary query, coordinates, vessel details, auth header and upstream error payload; capture logger/error output. | Only allowed metadata emitted, no canary leakage; AC05. |
| OPS-01-T06 | Two clients share work; cancel one, timeout a separate request and check queue/memory counters. | Other result survives, abandoned resources bounded and released; AC06. |
| OPS-01-T07 | Request synthetic/unreviewed static packs and enumerate registered methods. | Existing rejection preserved; no unauthenticated publishing endpoint; AC07. |

Existing commands: `npm run test --workspace=@anchor-buddy/api`, `npm run typecheck --workspace=@anchor-buddy/api`, `npm run check:runtime`. Add focused test files to the existing test glob; any load-test runner is a proposed new command and must target local stubs, never public services.

## Handoff and boundaries

Deliver policy table, implementation, tests, redacted example logs and production configuration requirements. Do not change tariff/safety decisions, introduce mandatory end-user login, run unsolicited internet load tests, or silently weaken limits after a test fails. External deployment/publishing remains OPS-03/integrator work. Report any unavoidable response-schema change before implementing it.


---

Task source: [OPS-02](tasks/OPS-02.md) · 16h · P0 · prerequisites: FOUNDATION-02, DATA-01

# OPS-02 — Coordinate provider budgets and caches across API replicas

## User instruction

Implement shared coordination for public-provider request budgets, cooldowns and duplicate requests so running two API instances does not double traffic or violate provider policies. Preserve original evidence timestamps and explicit unavailable states. Keep a simple bounded development mode, but make a multi-instance deployment fail safely if its shared coordinator is unavailable.

**Estimate:** 14–18 worker-hours. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-02 version/error/configuration contracts; DATA-01 capability/policy registry. Coordinate inbound-versus-upstream ownership with OPS-01. OPS-03 must mount/configure your chosen storage and apply your migration, but this task must not depend on OPS-03's finished deployment.

Review and publish the early interface handoff for DATA-08's per-region run/lease store: stable region/run identity, owner token, bounded expiry, server-time semantics, crash recovery and conditional publication. DATA-08 owns that run-state/lease implementation and its tests; OPS-02 reviews coordination compatibility without taking over refresh logic. OPS-03 owns deployment, invocation and migration rollout; reserve any additional migration number through the integrator rather than reusing `002-provider-coordination.sql`. Final OPS-02 acceptance requires the approved interface contract, not completed DATA-08 implementation. DATA-08's final concurrency/publication acceptance consumes the completed OPS-02 contract and budget implementation; this handoff must not create a reverse dependency cycle.

## Baseline and exclusive ownership

Read `apps/api/src/providers/http.ts`, `disk-cache.ts`, `geocode.ts`, `live-factory.ts`, `discovery.ts`, `map-proxy.ts`, `apps/api/src/database.ts`, `apps/api/LIVE_DATA.md` and `infra/001-schema.sql`. `GovernmentHttp` currently provides in-process queueing, deduplication and cooldown; `JsonDiskCache` has bounded integrity-checked disk records and original dates. Neither proves an app-wide budget across hosts. PostgreSQL is already an optional operator service; no Redis dependency exists.

Own proposed `apps/api/src/providers/coordination/**`, the coordination seams in `http.ts`/`live-factory.ts`, dedicated tests, and proposed `infra/migrations/002-provider-coordination.sql` only. OPS-01 owns `server.ts`; OPS-03 owns Compose/deployment. Preserve disk-cache format unless FOUNDATION-02 approves a migration. Do not simultaneously edit `discovery.ts` with a DATA worker; implement against its existing transport contract.

## Technical instructions

1. Use a backend-neutral coordination interface for acquiring a provider budget slot/lease, reading shared cooldown, deduplicating canonical requests and publishing a bounded result. Provide an in-memory implementation for one-process development and PostgreSQL-backed implementation for replicas. Do not add a new infrastructure service without integrator agreement.
2. Define versioned keys from provider identity, adapter/version, endpoint and canonical parameters. Include credential/entitlement scope identifiers where relevant without storing a secret in the key. Never share protected responses across users/contracts. Coordinate truncation rules with the provider adapter: request normalization must not silently claim the returned point is at another precise location.
3. Use short database transactions and server time to reserve next permitted starts; do not hold database locks during HTTP requests. Leases have bounded expiry and ownership tokens; only their owner can publish/release. A crashed worker leaves a slot/cooldown safe to recover without a burst.
4. Enforce DATA-01's policy values. Public Nominatim remains submitted-search only, at most one request/second across the application, with caching and no autocomplete/systematic scanning. OpenFreeMap requests keep the app's existing stricter per-area byte/tile limits and no more than four active upstream requests under the relevant configured budget. MET requery/caching obligations must not be turned into extended forecast validity.
5. Share `Retry-After` and error cooldowns, honor no-store, bound stored response bytes/count/age, and validate integrity/contract before use. A cache hit never changes retrieval/source/expiry dates. Distinguish a new successful empty response from failure: only the former may replace a previous record with empty results.
6. On coordinator failure in shared mode, return explicit provider unavailable/busy status and preserve only permitted dated cache evidence. Do not fall back to an independent unlimited local limiter or silently rotate to another public mirror.
7. Build a two-process local integration harness with a counting stub provider and an isolated PostgreSQL schema/database. Make timing assertions around recorded upstream start times, not fragile wall-clock sleeps. Document cleanup that cannot drop a user's unrelated database.

## Acceptance criteria

- **OPS-02-AC01:** Two independent API processes share one configured provider budget and cannot exceed its start/concurrency policy.
- **OPS-02-AC02:** Equivalent concurrent requests produce one upstream operation where policy permits deduplication; keys cannot cross entitlement scopes.
- **OPS-02-AC03:** Worker crash, expired lease and shared cooldown recovery do not produce request bursts or permanently blocked queues.
- **OPS-02-AC04:** Cached data retains original provenance and expiry, rejects corruption and honors no-store/size limits.
- **OPS-02-AC05:** Shared-coordinator outage fails safely without local-budget or mirror bypass.
- **OPS-02-AC06:** Submitted geocoding and bounded map downloading continue to work under compliant traffic; no autocomplete/bulk feature is introduced.
- **OPS-02-AC07:** Migration and dev/shared configuration are documented, namespaced and reversible without deleting source evidence.

## Test cases

| ID | Setup/action | Expected result / AC |
| --- | --- | --- |
| OPS-02-T01 | Two processes request distinct geocodes concurrently against a counting stub. | Global request starts are separated by configured policy; no per-process doubling; AC01, AC06. |
| OPS-02-T02 | Send identical normalized request from both processes; repeat with different entitlement scope. | One shared fetch for identical scope, separate protected entries for distinct scope; AC02. |
| OPS-02-T03 | Kill lease owner mid-request; advance test clock/lease expiry and retry. | Bounded recovery without duplicate publication or burst; AC03. |
| OPS-02-T04 | Stub returns 429 with Retry-After, then 200/empty, no-store and oversized/corrupt records. | Shared cooldown; correct empty replacement; no-store not reused; invalid record rejected; AC03–04. |
| OPS-02-T05 | Shut down coordination database while both API processes run. | Explicit partial/unavailable provider status, no uncontrolled upstream fallback; AC05. |
| OPS-02-T06 | Read the same cached forecast after process restart and after expiry. | Retrieval/expiry unchanged; expired data cannot acquire fresh validity; AC04. |
| OPS-02-T07 | Apply migration twice to isolated test DB, run bounded map download, then rollback coordinator schema only. | Idempotent supported setup, bounded traffic and no source-pack loss; AC06–07. |

Existing validation: API tests/typecheck and `npm run check`. The two-process PostgreSQL integration command is a **new deliverable**; document prerequisites and isolation. Public endpoints must not be used for load or failover tests.

## Handoff/references

Return interface/schema, migration, recorded stub-request timelines, configuration matrix and outage procedure. Escalate ambiguous provider rights instead of interpreting credentials as permission. Policies checked 2026-11-11: [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) is an app-wide limited submitted-search service; [OpenFreeMap](https://openfreemap.org/tos/) defines offline bounds; [MET Norway](https://api.met.no/doc/TermsOfService) requires identification and responsible caching. Recheck the recorded DATA-01 policy version before live deployment.


---

Task source: [OPS-03](tasks/OPS-03.md) · 14h · P0 · prerequisites: FOUNDATION-01, OPS-01, OPS-02, DATA-03

# OPS-03 — Prove portable deployment, backup and rollback

## User instruction

Make the container stack reproducibly operable as a controlled internal alpha: API, optional PostGIS/coordinator, immutable regional packs and bounded live caches. Demonstrate startup, restricted operation, backup/restore and rollback on a disposable local or already authorized staging environment. Do not deploy publicly, purchase infrastructure or claim a cloud account exists.

**Estimate:** 12–16 worker-hours. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-01, OPS-01 request/health contracts, OPS-02 coordination migration/configuration and DATA-03 pack layout. Container preparation can start after interface freeze; final validation waits for those inputs. DATA-08 owns source-refresh job logic; you own running/configuring it and recovering deployment state.

## Baseline and ownership

Read `infra/compose.yaml`, `Dockerfile.api`, `Dockerfile.ingest`, `001-schema.sql`, `infra/README.md`, `apps/api/src/index.ts`, `database.ts`, `.env.example`, `apps/api/src/packs.ts`, `workers/ingest/anchor_ingest/postgis.py` and ingestion publication docs. Current Compose runs PostGIS 17/3.5, a Node 24 API, and an optional GDAL ingestion container; packs are read-only in the API. It is not proof of production operations. API startup currently does not make the optional database a universal prerequisite. The live cache needs deliberate persistent mounting, not an untracked container layer.

Own `infra/**` except OPS-02's assigned migration and any DATA-owned refresh implementation, proposed `scripts/ops/**`, and `docs/operations/**`. Do not edit provider/domain/mobile implementations. Coordinate `.env.example`, Docker dependency files and GitHub workflows with OPS-04/integrator. Use placeholders only in tracked configuration.

## Required implementation

1. Define deployment modes: single-process development, bounded internal shared deployment, and offline/read-only pack service. State required versus optional dependencies. Supply pinned version/digest provenance and health/readiness checks that reflect the selected mode without equating provider availability with nautical safety.
2. Persist packs, bounded live cache and required database/coordinator state in named volumes or documented object-store adapters. Preserve immutable region/version keys and atomically change only the reviewed current-version pointer. API has read-only pack access; ingestion/publishing is an operator action with a separate identity/mount.
3. Harden service defaults: run suitable images as non-root, restrict writable paths, omit public database ports, drop unnecessary capabilities, and expose only intended API/ingress ports. Use trusted HTTPS at the deployment boundary. Do not disable certificate verification to make phone testing work.
4. Add a migration runner with version tracking and an explicit lock. Initial database bootstrap is not a substitute for upgrades. Fail startup/readiness safely when the selected shared mode requires a missing/incompatible migration; keep development mode documented. Do not put passwords in commands, build arguments, images or logs.
5. Implement backup and restore instructions/scripts for database metadata and immutable pack/current-pointer state. Include source manifests/hashes and software schema versions. Test restore into fresh isolated volumes and compare identities/hashes; copying files without restoring a working service is not sufficient.
6. Implement deployment rollback without overwriting old packs or rewriting their dates. Revert the app image/current pointer to a compatible version, retain forward-created immutable data, and detect incompatible schema rollback before it corrupts state. Keep a failed staged download/publication from replacing the previous complete pack.
7. Exercise bounded disk-full, database unavailable, cache corruption, ingestion failure, expired sources and restart behavior. Surface actionable operational health without exposing user coordinates/credentials. Include explicit storage quotas and cleanup ownership.

## Acceptance criteria

- **OPS-03-AC01:** A documented clean setup starts the chosen internal-alpha mode from locked source/images and reports mode-appropriate liveness/readiness.
- **OPS-03-AC02:** API cannot mutate published packs; database and operator publication are not unintentionally exposed.
- **OPS-03-AC03:** Required data/cache state survives container recreation without refreshing evidence timestamps.
- **OPS-03-AC04:** Versioned migrations apply predictably and concurrent/missing/incompatible migration states fail safely.
- **OPS-03-AC05:** A fresh isolated restore serves the same verified region/version/hash and correct metadata as the backup.
- **OPS-03-AC06:** Rollback and failed publication leave the prior complete compatible release available; old immutable versions remain intact.
- **OPS-03-AC07:** Outage/disk/corruption cases have bounded, truthful outcomes and redacted operational evidence.
- **OPS-03-AC08:** Deployment instructions contain no actual secrets, paid-account assumptions or public-release authorization.

## Test cases

| ID | Setup/action | Expected result / AC |
| --- | --- | --- |
| OPS-03-T01 | New isolated Compose project/volumes, supply local secrets privately, build/start and call health/readiness. | Documented service set healthy for selected mode; no required hidden manual patch; AC01. |
| OPS-03-T02 | Attempt pack write from API identity; inspect exposed ports and database access. | Write denied; no public database/operator port; AC02. |
| OPS-03-T03 | Cache dated real evidence, recreate API containers and reload it. | Original retrieval/expiry and immutable pack identity preserved; AC03. |
| OPS-03-T04 | Apply migration twice/concurrently, then start shared mode with missing schema. | Idempotent version handling/lock; explicit refusal or unready state when required; AC04. |
| OPS-03-T05 | Back up, restore into fresh named volumes, verify manifests/rows and serve a known real pack. | Matching identities/hashes and valid app responses; AC05. |
| OPS-03-T06 | Inject failed publication, switch to new compatible image/version, then rollback. | Prior complete version remains usable; no partial pointer or timestamp rewrite; AC06. |
| OPS-03-T07 | Stop DB, fill bounded scratch volume, corrupt cache and restart worker independently. | Controlled degraded/unready states, old complete packs retained, no secret leakage; AC07–08. |

Existing starting commands: `docker compose -f infra/compose.yaml config`, `docker compose -f infra/compose.yaml build`, and `docker compose -f infra/compose.yaml up`. Run with a unique disposable project name and no real production volumes. New migration/backup/restore/rollback commands are deliverables; each must support explicit target identity and refuse ambiguous destructive targets.

## Handoff and non-goals

Deliver redacted deployment manifest, successful restore/rollback transcript, hashes, runbook and failure matrix. Provide actual CPU/memory/storage observations for the tested workload without claiming production capacity. Production cloud provisioning, public DNS exposure, signing/payment setup, legal/provider acceptance and source maritime approval are outside this task. If staging access is unavailable, complete local proof and mark staging verification blocked.


---

Task source: [OPS-04](tasks/OPS-04.md) · 12h · P1 · prerequisites: FOUNDATION-01

# OPS-04 — Remediate dependencies and make verification reproducible

## User instruction

Audit the current locked dependency tree, remediate supported security issues, and extend CI so it distinguishes TypeScript/Hermes checks from actual native compilation and tests. Produce evidence tied to the candidate commit. Never make the pipeline green by deleting runtime checks, ignoring unknown failures or blindly forcing incompatible upgrades.

**Estimate:** 10–14 worker-hours. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-01 for baseline. Dependency audit and ordinary CI preparation are independent of WATCH-01/02. Native CI jobs consume their proven build commands later; WATCH-01/02 must not depend on this task's completed CI, avoiding a cycle.

## Current state and writable scope

Read root `package.json`/`package-lock.json`, workspace manifests, `.github/workflows/check.yml`, `scripts/check-runtime.mjs`, runtime/offline tests, `infra/Dockerfile.*`, and `docs/release-checklist.md`. Current CI pins Node 24/Python 3.12, runs `npm ci`, `npm run check`, web export and iOS/Android Hermes exports. Those last exports do not compile Swift/Kotlin. Earlier reports mention transitive advisories; rerun the audit against the actual current lockfile rather than copying old counts or assuming fixes exist.

Own `.github/workflows/**`, proposed `scripts/ci/**`, a dependency/security report and approved dependency manifest/lockfile changes. Root/workspace manifests and lockfile form a serialized integration gate: obtain exclusive ownership before editing, and coordinate with any worker needing a new package. Platform build workers own native source; OPS-03 owns Docker operational configuration, so supply reviewed image/package updates rather than overlapping edits.

## Instructions and requirements

1. Record Node/npm/Python versions, lockfile digest and baseline check output. Run current dependency audit and map each advisory to installed version, introducing chain, runtime/dev exposure, reachable code and fixed compatible version if one exists. Keep public evidence links, severity and date; do not claim an entire app secure because a scanner finds nothing.
2. Prefer the smallest supported upgrade within the Expo/React Native/MapLibre toolchain constraints. For a breaking change, prepare the concrete compatibility impact and coordinate the change window instead of applying `npm audit fix --force`. A dependency override requires evidence of compatible API/runtime behavior and reviewer approval recorded by the integrator.
3. Validate each dependency change with the affected unit/type checks, web export, both native JS exports and any actual native build affected. Preserve the test-only factory/simulator import boundary. No provider/account credentials, personal coordinates or live upstream calls are required by ordinary CI.
4. Split CI evidence into named jobs: deterministic/runtime checks, web build, native JavaScript export, actual iOS compilation, actual Android compilation, and native parity tests when WATCH-03 is ready. Use platform runners with documented toolchain versions and cache keys derived from lockfiles/configuration. Do not add a secret-bearing job to untrusted pull-request execution.
5. Native CI uses WATCH-01/02's reproduced unsigned/simulator/emulator paths. If a runner/toolchain is not provisioned, mark that verification explicitly pending; do not create a green no-op job. Device trials remain manual evidence from WATCH-04, never a CI checkbox fulfilled by emulation.
6. Add bounded timeouts, concurrency cancellation for superseded commits, artifact retention and redaction. Artifacts identify commit, commands, toolchain and result. Secret scanning should cover tracked/new text and build packages without printing discovered secrets. Scan source/bundles for runtime synthetic factory and injection leakage.
7. Define how unresolved advisories are reported: advisory ID, actual affected path, mitigation, owner, expiry/recheck date and blocking decision. Critical/high reachable runtime problems require explicit release-owner disposition; the worker cannot silently waive them. Pin supply-chain actions/images to a reviewed immutable revision where operationally supported and document update ownership.

## Acceptance criteria

- **OPS-04-AC01:** Dependency report reflects a fresh audit of the locked baseline, including dependency chains and supported remediation decisions.
- **OPS-04-AC02:** Applied upgrades are reproducible with `npm ci` and preserve required app/API/domain/watch behavior and test-only boundaries.
- **OPS-04-AC03:** CI labels and results distinguish Hermes exports from full native compilation, native unit tests and physical-device validation.
- **OPS-04-AC04:** Available native CI jobs execute real build/test commands; missing infrastructure appears blocked/pending instead of falsely passed.
- **OPS-04-AC05:** Ordinary pull-request CI has least required permissions, no required provider/signing secrets and bounded execution/artifact retention.
- **OPS-04-AC06:** Artifacts/report identify commit/toolchain and contain no credential canaries/private location samples; runtime synthetic leakage fails verification.
- **OPS-04-AC07:** Every unresolved advisory has an explicit owner/decision/recheck date; no suppression or incompatible force-upgrade hides the finding.

## Test cases

| ID | Setup/action | Expected result / AC |
| --- | --- | --- |
| OPS-04-T01 | Fresh checkout; locked install; fresh audit. | Reproducible dependency paths and dated findings, no stale copied counts; AC01. |
| OPS-04-T02 | Apply supported upgrade, reinstall from scratch and run relevant suites/exports. | No lock drift, passing behavior checks or documented blocker; AC02. |
| OPS-04-T03 | Read CI output after actual iOS/Android build jobs and JS export jobs. | Separate unmistakable evidence; compiler execution visible for native jobs; AC03–04. |
| OPS-04-T04 | Run ordinary PR pipeline without provider/signing secrets, including a proposed untrusted-fork context. | Deterministic jobs work without secrets or excessive token permissions; AC05. |
| OPS-04-T05 | Introduce a temporary forbidden runtime import/secret canary in an isolated test branch. | Verification fails without echoing the secret; remove the temporary change afterward; AC06. |
| OPS-04-T06 | Simulate unavailable native runner/toolchain and a deliberately failing test. | Pending/blocked or failed state, never a green skipped substitute; AC04. |
| OPS-04-T07 | Review unresolved advisory entries and artifact metadata. | Every issue has accountable disposition; every artifact maps to SHA/toolchain; AC06–07. |

Existing commands: `npm ci`, `npm audit --json`, `npm run check`, `npm run export:web --workspace=@anchor-buddy/mobile`; from `apps/mobile`, `npx expo export --platform ios --platform android --output-dir dist-native`. Native build/test commands must come from WATCH-01–03 rather than assumed project target names. New CI scripts must document inputs and nonzero failure behavior.

## Handoff/non-goals

Deliver lockfile change rationale, audit report, workflow changes, successful job links/logs if CI execution is available, and a matrix of passed/blocked checks. Do not push to GitHub, publish packages, buy hosted runners or introduce external telemetry merely to verify this plan; the integrator controls repository writes/deployment. Release authorization and maritime acceptance belong to QA, not a dependency scanner.


---

Task source: [QA-01](tasks/QA-01.md) · 12h · P0 · prerequisites: FOUNDATION-01, APP-01

# QA-01 — Automate the browser user journey

Implement a repeatable browser end-to-end suite that exercises the actual exported Anchor Buddy UI and API boundary. Turn the manual controls audit into regression coverage without introducing a synthetic runtime workspace or requiring public providers to be online during every test run.

## Baseline and ownership

Read `docs/controls-audit-2026-11-11.md`, `apps/mobile/src/App.tsx`, components/screens, `apps/api/test`, `scripts/check-runtime.mjs`, `scripts/web-offline-worker.js` and existing workspace scripts. There are domain/API/mobile helper tests and manual browser evidence, but no repository-owned comprehensive Playwright journey suite.

Own proposed `tests/e2e/`, `playwright.config.ts`, a bounded local test-server/replay harness, and E2E report configuration. Root package scripts/lockfile changes require the integrator lock; OPS-04 owns workflow wiring. APP-01 owns shell state; send missing accessible-label/test-ID requests to APP-07 instead of editing App.tsx. QA-02 owns offline fault cases and reuses this harness.

## Technical instructions

1. Add a pinned compatible Playwright test dependency and scripts such as proposed `test:e2e` and `test:e2e:live`; clearly document that these do not exist until implemented. Use controlled ports, readiness checks and owned process teardown. Do not kill unrelated local servers or reuse another worker's logged-in browser.
2. Use the exported app for offline-shell-compatible behavior. Run a local API with injectable provider transports in the test process, not a production HTTP endpoint that enables test data. Replay small permitted real-source responses with original provenance and an explicit fixed assessment clock where required. Analytical synthetic passing scenarios stay in domain tests or a separately excluded test harness; never relabel invented data as real to get a green UI result.
3. Isolate browser storage and test profiles per case. Use accessible locators; avoid arbitrary sleeps, CSS order, manually mutated React state or replacing the calculation results. Wait for user-visible completion/error states.
4. Cover blank onboarding → vessel/defaults → tour → empty Explore → submitted region search → filters/sort/map/list → details → pin/plan → saved results → close/reopen → Settings. Assert both the successful state and the previous data that must not remain visible after cancellation/invalid input.
5. Include validation for missing required vessel fields, zero bow height, multiple seabeds, neutral reset, invalid coordinates, radius boundaries, day/overnight dates, elapsed saved stays, profile-guidance invalidation and unit round-trips. Assert matching count/order in map/list and that manual pins are separate from filtered counts.
6. Verify truthful unknown/unavailable cases: source outage, absent tariffs/depths, unsupported native watch and disabled AI. No production browser alarm simulator or fake permission success is allowed.
7. Run Chromium desktop and a 390 × 844 touch-oriented viewport as blocking CI. Add WebKit/Firefox smoke where supported and record exceptions explicitly. Use deterministic timezone/locale variants for relevant cases; include Warsaw, a half-hour zone and a DST transition without setting the host clock.
8. Capture failure screenshot, trace, browser errors and relevant sanitized API response identifiers. Keep real credentials, private anchors/profiles and unrestricted HAR bodies out of artifacts. A live-smoke mode may call real services only on explicit invocation with strict provider budgets; it is separate from deterministic CI.

## Acceptance criteria

- **QA-01-AC01:** One documented command starts owned servers, runs tests and exits reliably on success/failure.
- **QA-01-AC02:** The complete listed user journey passes in desktop and narrow viewport through visible controls.
- **QA-01-AC03:** Invalid, cancel, back, stale and missing-data paths have explicit assertions; no hidden-state mutation makes them pass.
- **QA-01-AC04:** Tests run without external provider availability and preserve the no-synthetic-runtime boundary.
- **QA-01-AC05:** State isolation prevents one case's profile/search/cache from affecting another.
- **QA-01-AC06:** Failed tests produce sanitized actionable artifacts; unexpected console/page errors fail the suite.
- **QA-01-AC07:** Real-service smoke is opt-in, budgeted and reports unavailable evidence rather than falling back to fixtures.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| Q01-T01 | Empty isolated storage; enter QA vessel, 24-hour default and sand+mud; finish tour. | Empty Explore; explicit configured values persist on reload; AC02,05. |
| Q01-T02 | Submit 26 nm live radius, blank/invalid coordinate, then correct to supported area. | Form remains open for invalid data; no old map silently selected; valid submit shows results; AC03. |
| Q01-T03 | Filter marina, price sort, choose manual pin, switch map/list, save and reopen. | Same filtered result order/count; pin stored separately and restored; AC02–03. |
| Q01-T04 | Reopen an elapsed snapshot then cancel proposed dates. | Existing active search/filters unchanged, no search in the past; AC03. |
| Q01-T05 | Return real-source empty/failed provider responses; open details/watch/AI state. | Unknown evidence, native watch unavailable, assistant disabled; no invented values; AC04. |
| Q01-T06 | Run two test cases simultaneously with different boat names/storage. | No cross-test values or server teardown collision; AC01,05. |
| Q01-T07 | Deliberately fail an assertion and emit an unexpected page error in the test harness. | Suite fails with redacted trace/screenshot and precise failing control; AC06. |
| Q01-T08 | Run the explicitly opt-in live smoke with an approved bounded request budget, then exercise unavailable/rate-limited service responses. | Record actual provider/source dates and request count; unavailable data stays unavailable, no fixture fallback or invented result, and ordinary offline CI does not require live service access; AC07. |

Run existing `npm run check`, web export and the newly implemented E2E commands. Deliver a coverage-to-AC matrix, example failure artifact and CI integration instructions for OPS-04. Estimated effort: **12 worker-hours**. Stop on a production-only test-data bypass or unverifiable provider fixture rights. References: [Playwright web servers](https://playwright.dev/docs/test-webserver), [network testing](https://playwright.dev/docs/network); service-worker-controlled requests require special care and must not be presumed intercepted by a page route.


---

Task source: [QA-02](tasks/QA-02.md) · 10h · P0 · prerequisites: QA-01, APP-05

# QA-02 — Test offline and storage failure behavior end to end

Prove that downloaded maps, analysis, forecasts and the application shell remain consistent during interrupted downloads, updates, corruption, storage pressure and actual network loss. Test graceful failure as carefully as successful caching.

## Baseline and scope

Read `apps/mobile/src/lib/worldMapsCore.ts`, `worldMaps.web.ts`, `worldMaps.ts`, `packInstall.ts`, `packFiles*`, `offlineShell.web.ts`, `useConnectivity*`, `useEvidenceRefresh.ts`, `scripts/web-offline-worker.js`, `scripts/web-offline.test.mjs` and `docs/world-maps.md`. Progressive map downloads, hashes, size limits and helper fault tests already exist. The controls audit used manual offline preference; it did not disconnect a physical radio.

Own offline scenarios under the QA-01 E2E harness, a proposed `docs/validation/offline-matrix.md`, and native test instructions/artifacts. APP-05 owns cache implementation and OPS-03 deployment storage; file defects against those owners instead of making unrelated changes. Do not change production network permissions or clear user browser storage.

## Instructions

1. Create a deterministic test resource server serving a small permitted map area/recorded assets with manifest hashes. Inject disconnection, partial content, delayed replies, wrong MIME, hash mismatch and HTTP failures at chosen resources. Preserve source attribution and distinguish these test artifacts from live-data claims.
2. Keep the real service worker enabled for app-shell tests. Use browser network-offline mode or a controlled server/proxy failure to prove no provider requests succeed; the app's offline switch alone is insufficient. Use separate tests with service workers blocked only when testing route interception, never as proof of offline startup.
3. Interrupt before bootstrap/fonts, after a coarse zoom completes and during a fine zoom. Reopen after process/page restart. Verify only integrity-checked complete zoom levels are exposed as usable and resuming does not count incomplete bytes as complete tiles.
4. Install version A, begin B, corrupt/fail B and restart. A must remain the active complete pack. Repeat with app-shell update, unsupported schema, mismatched region/style identity and expired forecast data. An old complete shell may remain while old tabs are open; document and verify the intended update UX from APP-05.
5. Test API outage separately from basemap outage and actual total network loss. Cached geometry/places remain visible with original dates; successful empty provider responses remove old records; failed provider responses do not acquire new freshness dates. Reconnection performs bounded reassessment without resetting the watch or creating duplicate requests.
6. Inject storage quota/write failure and cache eviction. Preserve active complete assets when possible, show recoverable instructions, and never report a successful save if persistence failed. Validate per-area limits and app-wide budgets from the current implementation contract.
7. Cover overlapping areas, Unicode/CJK labels, antimeridian/latitude validation, partial-area opening, resume/cancel/delete confirmation, no-account offline profile editing and unknown prices. Test expired cached evidence still renders as historical/context but cannot produce a fresh passing assessment.
8. Run a small physical iOS/Android subset when builds/devices are available: airplane mode, restart, storage failure simulation where feasible and reconnect. Mark those rows blocked when unavailable; do not replace them with web emulation.

## Acceptance criteria

- **QA-02-AC01:** Cached app shell and a previously completed map area open with actual browser network disabled.
- **QA-02-AC02:** Interrupted/corrupt B never replaces complete A; only verified resources count as usable.
- **QA-02-AC03:** Original evidence dates and expiry survive download, cache read, outage and restart.
- **QA-02-AC04:** Quota/eviction/write failures remain recoverable and cannot show a false save/complete state.
- **QA-02-AC05:** Reconnection refreshes once within the configured cooldown, updates assessment and preserves unrelated local state/watch session.
- **QA-02-AC06:** Regional coverage gaps, unsupported inputs and label resources remain truthful; no fallback synthetic map/data is supplied.
- **QA-02-AC07:** Browser, simulator and physical-device evidence are reported separately with exact build/platform versions.

## Test cases

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| Q02-T01 | Complete small area online, close/reopen exported app with browser network offline. | Cached shell/map/labels available; uncached area explicitly unavailable; AC01,06. |
| Q02-T02 | Interrupt B at each bootstrap/coarse/fine stage, then restart/resume. | A intact; progress truthful; usable zoom never exceeds verified resources; AC02. |
| Q02-T03 | Return wrong SHA, HTML instead of JS/tile, oversized body or unsupported schema. | New activation rejected with actionable error; old active version retained; AC02,04. |
| Q02-T04 | Advance explicit test clock beyond forecast validity while offline. | Cached values retain timestamps; fresh suitability cannot pass; AC03. |
| Q02-T05 | Fail the next storage write and separately evict one cached resource. | No success toast/complete claim; recovery or redownload offered; AC04. |
| Q02-T06 | Alternate online/offline hints and provider failures during active search. | Bounded refresh, no request storm, old failed evidence not re-dated; AC03,05. |
| Q02-T07 | Open a Japanese map after restart offline; exercise native airplane-mode subset. | CJK labels render from downloaded fonts; native rows have actual evidence or blocked status; AC06–07. |

Run existing mobile/offline tests and QA-01's new targeted offline command; record exact command names after implementation. Deliver fault injection configuration, before/after active hashes, request counts, screenshots and platform matrix. Estimated effort: **10 worker-hours**, excluding device scheduling. Never clear or corrupt a user's real saved maps to conduct these tests; use isolated disposable test stores.


---

Task source: [QA-03](tasks/QA-03.md) · 10h · P0 · prerequisites: DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, SAFE-01, SAFE-02, SAFE-03

# QA-03 — Prepare and execute the pilot maritime review

Prepare a complete, reproducible review dossier for a small Key West pilot region and route it to the project's designated qualified reviewer. Record actual findings and approvals with exact data/version scope. If a reviewer or on-water trial is unavailable, deliver the dossier and identify the blocked acceptance criteria; do not declare the region reviewed.

## Baseline and boundaries

Read `workers/ingest/REAL_ENC_SMOKE.md`, `docs/release-checklist.md`, domain status definitions and the DATA task outputs. Real cell US5FL4DR has been extracted and assembled; that is not a complete or approved anchoring dataset. Europe/Asia public maps, centre forecasts and scientific context remain useful discovery functionality, not a promise of full safety coverage.

Own proposed `docs/validation/pilot-review/` and reviewer-facing artifact manifests, annotations and machine-readable review decision records. Data workers own actual source transformations; the integrator owns review ingestion/publication. Never change source evidence, coverage flags or validation status merely to obtain a passing review report. No native-watch code changes belong here. WATCH-04 separately owns stationary/overnight device monitoring trials.

## Instructions

Prepare the dossier structure and source inventory early. Final reviewer submission requires DATA-04/05 station/whole-stay evidence and SAFE-01/02/03 geometry/equipment/cost implementations as well as the listed chart/rule/place inputs. Bind the decision to their final hashes; do not obtain approval on an obsolete intermediate engine and carry it forward automatically. An unapproved input is an explicit finding, never an implicit approval.

1. Pin the pilot region bounds, all component versions/hashes, engine SHA, source dates/rights and supported vessel/equipment profiles. Map every included layer to its provenance and transformation. Show all omissions, chart seams, unsupported objects, uncertainty and unknown permission/station/habitat areas.
2. Build review materials from unsimplified analysis geometry with a separately rendered visual overlay. Include original source references, depth datum/unit mappings, survey quality, point/line hazards, restriction jurisdictions/effective dates, sanctuary/day-use buoy treatment, station relationships and full-circle footprints. A screenshot is not analysis evidence.
3. Supply representative candidate cases chosen to reveal boundaries: interior candidate, shallow edge, tiny obstacle, grass/habitat overlap, cable/channel crossing, chart seam, low-water night, wind reversal, rising-water rode, departure contingency, reef buoy, berth limit and closure. Include excluded and insufficient cases, not only apparently favorable examples.
4. For each case, produce inputs, expected invariants, actual deterministic reasons and the exact missing evidence preventing approval. Ask the reviewer to identify incorrect exclusions as well as false passes. An LLM may organize this dossier but cannot substitute for the qualified reviewer.
5. Prepare controlled on-water validation instructions for a competent human operator using independently adequate charts, weather information and watch arrangements. The app is supplemental decision support. No unattended vessel, hazardous exposure, intentionally dragged anchor or risky weather test is required. Stop the real-world trial on any unsafe condition or mismatch with independent observations.
6. Record reviewer identity/qualification verification through the project owner, date, reviewed scope, conditions, defects and signed/approved artifact hash according to the agreed operator process. Keep private contact details/signatures outside the public repository; publish only authorized attestations or role identifiers.
7. Classify findings by false-safe risk, missing evidence, operational restriction, cost accuracy and usability. Assign an owner and retest evidence. Changed source/engine/geometry invalidates the affected approval scope until re-reviewed.
8. Prepare communication drafts if needed, but do not contact reviewers, book a vessel, purchase access or submit personal data without the project owner's explicit authorization.

## Acceptance criteria

- **QA-03-AC01:** The dossier is reproducible from pinned inputs and includes every material omission and unsupported coverage area.
- **QA-03-AC02:** Each case exposes complete footprint/whole-stay reasoning and separates display data from analytical evidence.
- **QA-03-AC03:** An identified qualified reviewer actually reviews the defined pilot and records decisions; an agent-authored checklist alone cannot satisfy this AC.
- **QA-03-AC04:** Every false-safe or unresolved critical finding blocks recommendation publication and has an assigned correction/retest owner.
- **QA-03-AC05:** Any required on-water trial is completed by competent humans under the documented independent safety arrangements, with observations recorded.
- **QA-03-AC06:** Approval scope references exact hashes/versions and is invalidated by relevant changes.
- **QA-03-AC07:** Private reviewer/device/vessel records are not committed publicly; unavailable human approval is explicitly blocked.

## Test cases / review exercises

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| Q03-T01 | Independent reviewer rebuilds a dossier case from its manifest. | Same input hashes and reasons; omissions visible; AC01–02. |
| Q03-T02 | Inspect tiny hazard/habitat/seam cases under a large swing circle. | Exclusion or insufficient evidence explained; no clearance derived from rendered tiles; AC02,04. |
| Q03-T03 | Inspect day-use buoy and rule effective-date boundaries. | No overnight recommendation under applicable prohibition; unresolved jurisdiction blocks approval; AC03–04. |
| Q03-T04 | Change one approved chart component or engine revision after review. | Attestation no longer authorizes affected output; AC06. |
| Q03-T05 | Execute controlled real-world observations; compare depth/location/conditions independently. | Discrepancies logged and unsafe/mismatched trial stopped; no self-certified success; AC05. |
| Q03-T06 | Reviewer unavailable, rights unresolved or no safe trial window. | Dossier delivered, affected ACs blocked, publication gate closed; AC07. |
| Q03-T07 | Inspect public report/artifacts for private names, signatures, boat tracks and contacts. | Only explicitly authorized/redacted evidence included; AC07. |

Run the existing checks for the exact engine/data revision and DATA-03 verification commands. Deliver a review matrix with passed/failed/blocked for every AC, issue list and hash-bound decision records. Estimated effort: **10 worker-hours for preparation/coordination**, plus separately scheduled reviewer and human trial time. Engineering completion is not maritime approval.


---

Task source: [QA-04](tasks/QA-04.md) · 10h · P0 · prerequisites: FOUNDATION-01, FOUNDATION-02

# QA-04 — Integrate and evaluate the two-week internal alpha

Own integration of the delegated tasks and produce a truthful final go/no-go for a controlled internal alpha. Start the integration ledger on day one; run final acceptance on days nine and ten. A complete no-go report is a valid task deliverable, but it is never permission to ship an unvalidated feature.

## Inputs and ownership

Read this plan's README, all task metadata, baseline SHA, shared contracts, task handoffs and `docs/release-checklist.md`. This task has only foundation tasks as hard prerequisites so the integrator can report incomplete lanes instead of waiting forever. Final acceptance requires evidence from the named lanes below, whether passed, failed or blocked.

Own proposed `docs/validation/sprint-2026-11-25/`, the integration branch and conflict resolution with author review. You alone serialize App.tsx/shared schema/engine/workflow wiring after their initial owners finish. Do not independently rewrite another worker's business rules to resolve a merge. No production deployment, public release, payment, account creation or irreversible Git operation is authorized by this ticket.

## Instructions

1. Maintain a ledger for all 34 tasks: branch/SHA, dependencies, files leased, implementation state, each AC result, review status, commands/artifacts, external gate and remaining defects. Review implementation and tests; 'worker says done' is not acceptance evidence.
2. Merge in dependency order into an isolated integration branch. Preserve compatibility migrations, no-synthetic boundaries and active native-watch separation. Run narrow affected checks on each merge; run the full check at the day-two/day-five/day-eight/final integration gates.
3. Require independent review for shared schemas, geometry, tide/datums, rules, money arithmetic, native lifecycle, secrets and publication authorization. Simpler UI work may use checklist review plus E2E. Resolve semantic conflicts with the owning workers and reviewer before merging.
4. On the final revision run `npm ci`, `npm run check`, web export, current E2E/offline/parity commands, native build commands and container smoke/restore checks that were actually implemented. Do not quote the planning-time 237 count as a fresh result. Record actual versions, durations and exits.
5. Assemble evidence from DATA-08 regional/source smoke, SAFE-04 parity, APP-07 accessibility, APP-08 native handoff, WATCH-01/02 builds, WATCH-03 native tests, WATCH-04 device trials, OPS-01/02 resource/privacy budgets, OPS-03 deployment/restore and OPS-04 dependency/CI remediation. Human maritime/on-water evidence comes from QA-03. Absence is blocked, not waived.
6. Classify issues: blocker = false safety pass, incorrect live watch status, data loss, credential exposure or bypassed review; major = broken required journey, unsupported native build, unreliable offline recovery or unusable accessibility path; minor = bounded cosmetic/nonblocking defect. A reproducible blocker prevents the affected alpha capability from being enabled.
7. Publish a capability matrix: available for internal discovery, available only as dated context, gated/unavailable analytical recommendations, native watch platform validation status, and unsupported regions/providers. Keep unavailable features disabled in the tested artifact and explain the boundary in the app/docs.
8. Produce a release-candidate artifact manifest and rollback instructions. A 'go' applies only to the precisely listed internal capabilities/build/data versions. Do not mark public-release checklist items complete without their actual evidence. List carryover work in priority order with reproduction steps and an owner.

## Acceptance criteria

- **QA-04-AC01:** All tasks and ACs have passed/failed/blocked/not-run status, evidence and ownership; no silent omissions.
- **QA-04-AC02:** Integrated code comes from the baseline plus reviewed task commits, with shared-file conflicts reconciled explicitly.
- **QA-04-AC03:** Fresh final checks/build results are linked to the exact candidate revision and data hashes.
- **QA-04-AC04:** No unresolved blocker is hidden by changing fixtures, disabling tests or relabeling synthetic/unreviewed evidence.
- **QA-04-AC05:** Go/no-go distinguishes internal discovery/context from reviewed anchoring recommendations and native watch readiness.
- **QA-04-AC06:** Required external approvals absent at day ten remain blocked; the report never claims a two-week guaranteed public release.
- **QA-04-AC07:** Rollback/carryover instructions are actionable and no unauthorized public deployment or messaging occurred.

## Test cases / acceptance exercises

| ID | Setup / action | Expected result / AC |
| --- | --- | --- |
| Q04-T01 | Build a clean checkout of the final integration SHA; run documented checks. | Reproducible artifacts and actual results, no dependency on worker machines; AC02–03. |
| Q04-T02 | Insert a deliberately failed/blocked safety AC into the ledger during review. | Capability cannot be marked go; critical gate visible; AC01,04–06. |
| Q04-T03 | Compare source/data hashes across screenshots, test reports, binary and pack manifest. | All match candidate or are marked stale and rerun; AC03. |
| Q04-T04 | Reviewer/device access absent but discovery E2E passes. | Internal discovery decision may proceed; recommendations/watch remain separately gated; AC05–06. |
| Q04-T05 | Exercise rollback in the test environment using OPS-03 instructions. | Previous complete app/data restored without changing historical timestamps or auto-arming; AC07. |
| Q04-T06 | Audit repository, artifacts and CI logs for secret/private data and test bypasses. | No unauthorized exposure; any finding blocks affected delivery; AC04,07. |

Deliver the ledger, final AC matrix, command log summary, artifact hashes, decision and carryover list. Estimated effort: **10 worker-hours of explicit integration/acceptance**, in addition to normal daily coordination and peer review budget in the schedule. If the schedule slips, issue a bounded no-go/partial-capability report rather than silently dropping required tests.
