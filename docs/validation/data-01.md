# DATA-01 provider capabilities and permitted use

Baseline `fe29e076b937efab4a96b8db38cd5e7283b6c41d`. Contract and task worktree base `ed48e6508538b8ccbb24fd24c0e2e5b4e74063b7`. The engineering contract is FOUNDATION-02 V2. Task status is `in_review` pending integration of the reserved API route and its HTTP test.

The resolver returns 14 stable provider IDs and 18 product entries. It separates implementation, activation, routing, observed response status and data rights. The register identifies which policy statements were verified and which rights still need source or operator evidence. Capability lookup uses server configuration and area routing without a provider request.

Changed files are `apps/api/src/providers/contracts.ts`, `apps/api/src/providers/capabilities.ts`, `apps/api/test/capabilities.test.ts`, `docs/data/provider-register.md` and this report. Shared domain schema and provider fetchers are outside this task's reservation. The integrator owns `apps/api/src/server.ts`.

| Criterion | Status | Evidence and remaining action |
| --- | --- | --- |
| DATA-01-AC01 | PASS | Startup validates one legacy descriptor per stable provider ID, each linked to one or more unique products. T01 checks mapping completeness and the register names existing adapters and pending curation. |
| DATA-01-AC02 | PASS | T03 proves serialized registry and validation errors omit test credential, alternate endpoint, entitlement and reviewer fields. Check the integrated HTTP route once wired. |
| DATA-01-AC03 | PASS | T01 and T04 separate display, offline and analysis rights. Missing provenance cannot be asserted as permission. |
| DATA-01-AC04 | PASS | T02 resolves both EMODnet products outside the regional extent and invokes the real adapter with a transport spy. The count stays zero. |
| DATA-01-AC05 | PASS | T01 and the deployment test confirm optional unconfigured products stay disabled and core adapters stay available in configuration. Existing discovery suite passes. |
| DATA-01-AC06 | PASS | T04 rejects missing policy, date and attribution, invalid URLs and enum values, and duplicate or missing identity. T05 proves byte-identical JSON when descriptor order is reversed. |
| DATA-01-AC07 | PASS | The dated [provider register](../data/provider-register.md) links primary policy sources and records product-specific unresolved rights. |

| Test | Command or action | Expected and actual | Evidence |
| --- | --- | --- | --- |
| DATA-01-T01 | `npm run test --workspace=@anchor-buddy/api` | Split exposes global wind and regional context, while paid, AI and reviewed-chart defaults are disabled. Passed. | `apps/api/test/capabilities.test.ts` |
| DATA-01-T02 | Same API suite with actual EMODnet adapter and controlled spy | Both products resolve outside extent and make zero requests. Passed. | `apps/api/test/capabilities.test.ts` |
| DATA-01-T03 | Same API suite with synthetic credential and private fields | Only normalized credential presence reaches public JSON. Error text omits the malformed credential-bearing URL. Passed. | `apps/api/test/capabilities.test.ts` |
| DATA-01-T04 | Same API suite with malformed descriptor inputs | Invalid rights and descriptors fail with provider ID and field class. Passed. | `apps/api/test/capabilities.test.ts` |
| DATA-01-T05 | Same API suite with reversed products and controlled status observations | Canonical outputs match and distinguish partial, unavailable and disabled. Passed. | `apps/api/test/capabilities.test.ts` |
| DATA-01-T06 | Review linked primary product and terms pages on 11 November 2026 | Scope, attribution, review date and unresolved rights are inspectable. Passed. | `docs/data/provider-register.md` |

On Node `24.22.3` and npm `11.19.1`, `npm ci`, `npm run typecheck --workspace=@anchor-buddy/api`, `npm run test --workspace=@anchor-buddy/api` and `npm run check:runtime` exited zero. The API suite passed 55 tests including eight new tests. The runtime suite passed seven tests and checked 87 repository modules. A separate runtime graph scan starting at the new capability module checked 18 modules with no violations. The source scan passed. Provider tests used controlled responses and a transport spy. Policy evidence came from official published pages, independent of live data availability. No chart, live query, device or account evidence was needed for the registry.

## API integration

The reserved route can wire the public report as follows, using the existing Fastify application and error conventions.

```ts
import {
  capabilityDeploymentFromEnvironment,
  parseProviderCapabilityArea,
  resolveProviderCapabilities,
} from './providers/capabilities.js';

const capabilityDeployment = capabilityDeploymentFromEnvironment(process.env);

app.get('/v1/providers', async (request, reply) => {
  const selection = parseProviderCapabilityArea(request.query);
  if (selection.status === 'invalid') {
    return reply.code(400).send({ error: 'INVALID_PROVIDER_AREA' });
  }
  return resolveProviderCapabilities(capabilityDeployment, selection.area);
});
```

Test the previous `providers` projection and new product report using `app.inject` with no area, Split and an invalid query. Verify the HTTP response omits any configured secrets and endpoint overrides. `/health` should continue to describe liveness and existing feature gates. `/v1/regions` should continue to describe installed pack versions. A future exact product observation can be passed to the resolver if it belongs to the requested area. The existing combined EMODnet discovery status cannot identify which subproduct failed, so use the discovery response for current source evidence.

The reported rights describe product use under the stated policy conditions. Existing device cache and discovery behavior still follows its own adapter paths. Unresolved items include exact EMODnet originator terms, selected Overpass service terms, custom geocoder or wave service terms, derived chart and tile rights, and source-specific official place and tariff records. Public review status cannot supply those entitlements or maritime approval.

The custom wave endpoint regression exercises a real adapter with a transport spy. A valid non-commercial HTTPS override makes one request and returns a partial result. Capability resolution reports the configuration as available, preserves the observed partial result, and keeps display, storage and analysis rights unknown for the custom host. The hosted free rights remain scoped to the documented official endpoint.
