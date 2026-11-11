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
