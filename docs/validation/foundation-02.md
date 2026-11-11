# FOUNDATION-02 validation handoff

Task / title: FOUNDATION-02 — Freeze versioned evidence, persistence and integration contracts.

Baseline / prerequisites: FOUNDATION-01 `fe29e076b937efab4a96b8db38cd5e7283b6c41d`. Final change SHA: the scoped commit introducing this report (also supplied in the worker handoff).

Task status: **done**. The independent integrator approved the interface/ownership contract on 11 November 2026 after reviewing worker commit `28b15c8ea487db92cc16ab4a23c42c1f4ab256ad` and running the integrated checks at `b9c5261bcc5814781a5467cd455e9a6d593f6e2d` (250 tests passed). This is not a maritime review or capability release.

## Implemented behavior and ownership

Added optional pack/source contract fields and shared evidence, component, review, hazard, guidance, tariff and local-record types. Added executable common validators, unsupported-version results and recoverable commit helpers. Corrected the tide semantics comment without changing engine arithmetic. Existing live synthetic rejection and the three assessment outcomes remain unchanged.

The legacy engine now explicitly rejects any nonempty primitive array any v2/snapshot-bearing pack, and sources carrying v2 evidence envelopes. This prevents a new exchange payload being silently ignored by an old algorithm. The standalone common validators do not activate data or grant release approval; DATA-03/SAFE-01 integration must replace the relevant capability gate under the integrator's review. Empty equipment/tariff registries remain valid/unavailable states.

Reserved files changed: `packages/domain/src/types.ts`, `validation.ts`, `index.ts`, new `contracts.ts`, new `packages/domain/test/contracts.test.ts`, `docs/contracts/v2.md`, this report. No API, engine, screens, persistence adapters or native protocol implementation files were edited.

Contract revision: `docs/contracts/v2.md`. Root integrator independently reviewed drafts and requested fixes for malformed nested inputs/callbacks, full-stay review validity, layer/component-kind consistency, prototype hash lookups and historical-source-test coupling. Those fixes and regression tests are included. Final interface approval is recorded by the integrator after commit review, not fabricated here.

## Acceptance criteria

| AC ID              | Status  | Evidence                                                                                                                                                                                      | Remaining action / owner                                                                                |
| ------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| FOUNDATION-02-AC01 | PASS    | V2 field catalogue gives every new field's type/unit/null/version/owner; exact conversion contract; F02-T07/T08                                                                               | Downstream UI call sites adopt exact factors in APP-02/07; not a foundation field-definition gap        |
| FOUNDATION-02-AC02 | PASS    | Existing real ENC assembly accepted unchanged; existing discovery API suite; F02-T05 preserves coordinates, original money/date and source record on failure; existing seabed helper retained | APP-02 implements durable platform migration against hooks                                              |
| FOUNDATION-02-AC03 | PASS    | F02-T02 unsupported-version gate preserves prior selection; missing envelope provenance rejects; malformed migration/callback regressions never commit                                        | Consumers must call validated activation adapters before state changes                                  |
| FOUNDATION-02-AC04 | PASS    | F02-T03 rejects point/scientific/display context as analytical coverage; component-kind/layer mismatch and full-stay freshness/review bounds reject                                           | DATA-03 supplies actual spatial/source checks and reviewed components                                   |
| FOUNDATION-02-AC05 | PASS    | F02-T04 recomputed byte hash mismatch, old binding after content update, expired/future review; own-key hash regression                                                                       | Actual byte-size/hash I/O and all release approvals remain DATA-03/API integration duties               |
| FOUNDATION-02-AC06 | PASS    | F02-T06 plus existing domain/API/runtime tests; all assessment regression outcomes retained; no fixture exported                                                                              | None within foundation scope                                                                            |
| FOUNDATION-02-AC07 | PASS | Independent integrator approved owner/interface table, reviewed final validation gates and reproduced 250 integrated tests; plan graph remains valid | Downstream amendments remain integrator-controlled |

## Test cases and reproducible evidence

All new test code/examples are explicitly test-only. Test identities, URLs, component bytes, guidance ratios and review records in `contracts.test.ts` are invented analytical fixtures, not runtime data or approvals. The legacy ENC compatibility exercise below uses the pre-existing actual operator artifact, never a relabelled synthetic pack.

| Test ID                         | Command / action                                                                                                                                          | Expected                                                                           | Actual                                                                                                                                                                                                         | Input / version                                                                                              | Artifact                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| F02-T01                         | Parse pre-existing local `enc-pilot/assembled/assessment.json` with `validateLiveRegionPack`, compare JSON before/after; run existing API discovery tests | Legacy real unreviewed input accepted with identical values                        | PASS: zero errors, unreviewed, schema absent/legacy 1, one real source, unchanged JSON. Existing API test “real-source discovery packs pass schema but never safety checks with missing chart evidence” passes | ENC bytes SHA-256 `19d04f35f1cd7622277e960dbb30e807fda4fe5912bf3b7c575b524c9e11c2e7`; baseline + this change | Local operator artifact retained outside git; summary below |
| F02-T02                         | Domain `contracts.test.ts` unsupported schema/activation test                                                                                             | Unsupported result and prior selected pack retained                                | PASS; v2/new primitive gates also enforced                                                                                                                                                                     | Baseline + this change                                                                                       | Domain suite                                                |
| F02-T03                         | Domain evidence-role/coverage test                                                                                                                        | Point forecast, DTM sample and display role cannot establish analytical coverage   | PASS; malformed geometry/source IDs/rights provenance reject                                                                                                                                                   | Test-only component bytes                                                                                    | Domain suite                                                |
| F02-T04                         | Domain snapshot binding test                                                                                                                              | Changed bytes or component identity invalidate old review                          | PASS; future/expired reviews and inherited observed hash keys reject                                                                                                                                           | Test-only SHA-256 bytes and review IDs                                                                       | Domain suite                                                |
| F02-T05                         | Monorepo integration with existing mobile `readSavedSearches`, domain seabed migration and injected failing commit                                        | Original recoverable input untouched; old values hidden; no write on invalid input | PASS; no watch interface used                                                                                                                                                                                  | Test-only search, exact EUR 1.005 legacy value retained only in original                                     | Domain suite                                                |
| F02-T06                         | Domain live boundary tests                                                                                                                                | Synthetic and missing classification rejected                                      | PASS; existing runtime import/export guard passes                                                                                                                                                              | Isolated test-only fixture                                                                                   | Domain/runtime suites                                       |
| F02-T07                         | Real domain engine with test-only nominal tide 0.6–1.2 and uncertainty 0.1                                                                                | Effective water levels 0.5–1.3 once; depth 5.5–8.3, clearance 4.0, rode 66         | PASS                                                                                                                                                                                                           | Existing engine unchanged; test-only equipment data                                                          | Domain suite                                                |
| F02-T08                         | Monorepo `parseUnitDraft` with exact ft/m factor; plan builder `--check`; final owner review                                                              | Exact untouched canonical values, edited tolerance, acyclic named ownership        | Arithmetic/DAG PASS; final independent owner signoff NOT_RUN                                                                                                                                                   | Baseline plan, source unit definition 0.3048 m/ft                                                            | Domain suite and plan-builder output below                  |
| Additional boundary regressions | Malformed/null nested snapshots/migrations, callback exceptions, unknown or expired freshness, wrong component/layer, review expiring mid-interval        | Structured rejection; never throw into render/activation, never call commit        | PASS                                                                                                                                                                                                           | Isolated test inputs                                                                                         | Domain suite                                                |

The ENC read-only check executed from the isolated worktree using Node with `--import tsx --input-type=module`: read `../../enc-pilot/assembled/assessment.json`, parse, call `validateLiveRegionPack`, assert errors are empty and `JSON.stringify` remains identical, compute SHA-256 of original bytes. No data or approval flags were modified. Reproduction requires the same local operator artifact; it is deliberately not copied into the repository.

## Required existing checks

Final checks after all code review corrections:

```text
npm run typecheck
PASS: API, mobile, domain and anchor-watch TypeScript checks.

npm run test --workspace=@anchor-buddy/domain
PASS: 74 tests, 0 failed, 0 skipped.

npm run test --workspace=@anchor-buddy/api
PASS: 47 tests, 0 failed, 0 skipped.

npm run check:runtime
PASS: 5 guard tests; 87 repository modules checked across web/native/API entries.

python3 docs/plans/2026-11-12-two-week/build_plan.py --check
PASS: 34 tasks, 249 mapped ACs, 231 tests, 341 base hours;
dependency graph and local Markdown links valid.

git diff --check
PASS.
```

The plan DAG and watch source fingerprints are one-time foundation audit evidence, not permanent domain unit tests coupled to historical planning folders or native source-file comments.

`shasum -a 256 modules/anchor-watch/src/types.ts modules/anchor-watch/src/validation.ts` matches the baseline protocol record:

```text
types.ts       a59422de21a7861d13ae77efb36155ebbe3e1af5959bd84a717d302baa066077
validation.ts  afdb6cde3bec6e7f4bbbae8be52003811eaa37136c0aa81ef95896e8418a2561
```

No new package command was introduced; domain tests use the existing test glob. Full output remains in local temporary check logs; this report contains redacted results and reproducible commands without personal absolute paths.

## Live-source, native and operational boundaries

Live-source requests: none. The ENC exercise reads existing real bytes; API tests use controlled transport responses and do not establish current provider availability/rights. Native builds/device trials: not run or claimed in FOUNDATION-02; protocol files are unchanged. The baseline's separate binary/export evidence is not substituted for native device tests here.

Secret/privacy review: no credentials, private profiles, boat tracks, reviewer contacts or signatures added. Public examples use reserved `example.test` addresses and explicit test-only identities. No account creation, mail, push, purchase or deployment occurred.

Rollback/recovery: revert the scoped contract commit before downstream consumers merge; no storage keys/data were rewritten. Commit helpers retain originals on unsupported versions, validation and write failures. Later atomic repositories must preserve those guarantees.

Known limits and gates: v2/primitive runtime activation intentionally unavailable pending DATA-03/SAFE-01 integration; equipment/tariff and specific settings/plan payload validators are downstream-owned. Schema validity cannot authenticate a reviewer, prove source reuse rights, establish full-footprint coverage or enable real recommendations. No maritime approval is supplied.

Integration notes: no central API/App wiring patch is required for this foundation; downstream workers consume exports from `@anchor-buddy/domain`. SAFE-01 and DATA-03 must request the integrator's sequential validation/engine activation amendment, never remove version fields to bypass the temporary gates. APP-02/07 must use exact factors at existing UI call sites; current `3.28084` / `1.15078` approximations do not satisfy the frozen edited-value tolerance, although untouched drafts remain exact. This pre-existing issue was sent to the integrator rather than edited outside ownership.
