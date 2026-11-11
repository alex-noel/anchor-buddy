---
id: FOUNDATION-01
title: "Capture a reproducible baseline and establish worker branches"
priority: P0
estimate_hours: 6
dependencies: []
lane: foundation
expert_review: false
external_gate: null
---

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
