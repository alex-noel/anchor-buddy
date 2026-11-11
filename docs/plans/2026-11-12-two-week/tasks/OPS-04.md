---
id: OPS-04
title: "Remediate dependencies and make verification reproducible"
priority: P1
estimate_hours: 12
dependencies: [FOUNDATION-01]
lane: ops
expert_review: true
external_gate: "Native CI verification needs suitable runners and WATCH-01/02/03 command evidence; no new account or paid runner purchase."
---

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
