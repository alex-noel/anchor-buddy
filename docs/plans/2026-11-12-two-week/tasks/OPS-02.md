---
id: OPS-02
title: "Coordinate provider budgets and caches across API replicas"
priority: P0
estimate_hours: 16
dependencies: [FOUNDATION-02, DATA-01]
lane: ops
expert_review: true
external_gate: "Local PostgreSQL integration-test capability; operator-approved provider policy configuration for live use."
---

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
