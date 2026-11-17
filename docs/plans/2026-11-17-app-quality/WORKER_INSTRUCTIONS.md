# Worker instructions for the app quality plan

Implement one assigned Q task against the integrator's current baseline and merged prerequisite commits. Read its brief first, then only the relevant files. Consult the applicable sections of the existing [v2 contracts](../../contracts/v2.md) when changing persistence, units, money, evidence or watch interfaces; visual-only work does not require reading the whole contract. Do not load the whole task book or old backlog into every worker context.

## Copyable assignment

```text
Implement docs/plans/2026-11-17-app-quality/tasks/QNN.md.
Baseline: <reviewed SHA>.
Merged prerequisites: <IDs and SHAs, or none>.
Reserved files: <explicit paths; include any new test/helper files>.
Read WORKER_INSTRUCTIONS.md and the task brief. Confirm the described gap still
exists. Implement only its scope and acceptance criteria. Preserve unrelated
user changes. Run the focused checks and report exact commands/results.
If a prerequisite or contract is missing, report the smallest concrete blocker.
Do not fabricate passing evidence, broaden scope, or implement adjacent tasks.
Return the diff summary, acceptance mapping, verification evidence and remaining
gates. Stop after this task for independent review.
```

## Working boundary

- The user's later assignment provides execution authorization. This plan itself is not an instruction to launch 40 workers now.
- Keep each task to one reviewable change. Branch names, if needed, use `codex/quality-qNN`. Worktree setup and file leases belong to the integrator; never modify another worker's checkout or discard user changes.
- Confirm the source finding on the current baseline. If it is already fixed, provide evidence and propose closing the task; do not rewrite working code to match old wording.
- Treat listed files as starting points and ownership bounds, not permission for an unrelated refactor. Request an integrator lease before touching additional shared files. The same file cannot be owned by two live tasks.
- Reuse current controller, request generations, storage contracts, pack integrity checks and test-only factories. Preserve storage prefixes/database identity and old readable records.
- Read the applicable existing repository skills/instructions when implementing. For changed React components, apply the configured React review guidance as relevant.
- UI changes preserve canonical values, unknown evidence, source attribution, safety checks and active watch independence. No approval bits, source dates or actual anchor position are invented or silently changed.
- Test fixtures stay in test-only entry points or runner interception. A runtime synthetic-data toggle is outside scope. Browser watch remains unavailable.
- Do not weaken native arming, fixed-anchor, freshness or interruption logic to make UI/tests pass. UI success requires an authoritative outcome.
- No remote message, deployment, publication, purchase or credential setup is part of these tasks. Local builds and reversible edits follow the user's authorized assignment and environment permissions.

## Keep delegation economical

Routine tasks get one cost-efficient implementation pass and a focused review. Engineering tasks start with a fixed interface/schema; use a stronger reviewer for persistence, cancellation, money/units, coverage language and watch transitions. Specialist tasks are assigned only when the toolchain/evidence is available or the goal is an honest preflight.

If two focused attempts fail on the same architectural or native issue, stop repeated guesses and send the smallest reproduction to the integrator. Do not spend a premium model on every visual edit; do not use a cheap worker to invent missing maritime or device evidence.

For browser large-text checks, use actual 200% browser zoom and record the effective CSS viewport; screenshot enlargement is not a text-size test. Native acceptance uses OS Dynamic Type/font-scale settings and records the setting separately.

For visual-only changes, typecheck plus before/after mounted inspection is normally sufficient. Write behavior tests where a real failure/transition needs protection, not tests that mirror styles or implementation. Run affected workspace tests once after the change; the integrator owns the full merged check. A new failure, changed code or uncovered concern justifies another run.

## Completion handoff

Return:

1. Task ID, baseline, commit/diff and changed files.
2. Each acceptance criterion marked pass, fail or blocked with evidence.
3. Exact focused commands and outcomes; measured viewport/device/OS for UI/device checks.
4. Before/after captures for visible changes, with fixture versus real-source context stated.
5. Migration/rollback impact, unresolved external gates and any proposed follow-up outside scope.

`done` means every required task acceptance criterion is evidenced and independently reviewed. `blocked` means the remaining prerequisite or external requirement is explicit; it does not mean the requested behavior is implemented. Engineering can be reported as implemented while device approval remains pending, but the overall task cannot be silently counted as fully verified.
