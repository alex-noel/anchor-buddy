---
id: SAFE-04
title: "Prove assessment parity across API, browser and native Hermes runtimes"
priority: P0
estimate_hours: 10
dependencies: [SAFE-01, SAFE-02, SAFE-03, WATCH-01, WATCH-02]
lane: safety
expert_review: true
external_gate: "Runnable iOS and Android test builds are required for native parity completion."
---

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
