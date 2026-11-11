---
id: DATA-08
title: "Refresh and publish versioned evidence with regional live checks"
priority: P0
estimate_hours: 8
dependencies: [FOUNDATION-01, FOUNDATION-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, OPS-02]
lane: data
expert_review: true
external_gate: "Publication to a live reviewed catalogue remains blocked until all required source rights and genuine maritime/on-water attestations are present."
---

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
