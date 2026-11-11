---
id: DATA-01
title: "Provider capabilities, coverage and permitted use"
priority: P0
estimate_hours: 6
dependencies: [FOUNDATION-01, FOUNDATION-02]
lane: data
expert_review: false
external_gate: "Provider rights that cannot be established from official terms remain unknown until operator review."
---

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
