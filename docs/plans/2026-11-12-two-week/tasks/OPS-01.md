---
id: OPS-01
title: "Bound API work and protect request privacy"
priority: P0
estimate_hours: 12
dependencies: [FOUNDATION-01, FOUNDATION-02]
lane: ops
expert_review: true
external_gate: null
---

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
