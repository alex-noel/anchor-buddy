# Anchor Buddy API

Run from the repository root:

```sh
npm install
npm start --workspace @anchor-buddy/api
npm test --workspace @anchor-buddy/api
npm run typecheck --workspace @anchor-buddy/api
```

Node 24 is the supported runtime. The default port is `3001`. Environment values are documented in `.env.example`; the app does not automatically read `.env` files. Export values through your shell or deployment configuration. Core use requires no account. The catalog starts empty until real packs are published; real-source discovery is available separately. There are no runtime demonstration datasets or fallback places.

The web preview is allowed from exact localhost/127.0.0.1 origins on ports 8081 and 8082. Override `CORS_ALLOWED_ORIGINS` with a comma-separated deployment allowlist. CORS permits known GET/POST routes and Content-Type preflights; credentials and arbitrary origins are not enabled.

| Endpoint                                         | Behavior                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `GET /health`                                    | Process status and assistant/release gates                                                                |
| `GET /v1/providers`                              | Public capability, attribution, offline and authentication metadata                                       |
| `GET /v1/regions`                                | Published real-source pack identifiers; empty when none are installed                                     |
| `POST /v1/regions/discover`                      | Bounded worldwide real-source discovery; partial/unreviewed RegionPack and individual provider statuses   |
| `GET /v1/geocode?q=Marseille`                    | Explicitly submitted place-name search; cached and throttled Nominatim adapter                            |
| `GET /v1/maps/resource?url=...`                  | Fixed OpenFreeMap-host proxy for user-selected offline map downloads; no arbitrary URL forwarding         |
| `POST /v1/search`                                | `{regionId, version?, vessel, search, options?}`; returns shared-domain `SearchResult`                    |
| `POST /v1/estimate`                              | Same request plus `placeId`; itemized estimate with separate availability                                 |
| `GET /v1/regions/:id/manifest?version=...`       | Versioned artifact manifest; omitted version resolves current pointer                                     |
| `GET /v1/regions/:id/:version/assets/:name`      | Manifest-listed asset, checked against size and SHA-256 before serving                                    |
| `GET /v1/weather?latitude=24.55&longitude=-81.8` | Real NWS `forecastGridData` plus active alerts, source timestamps and missing-parameter list              |
| `POST /v1/tides`                                 | Reviewed station mapping lookup, metric/GMT CO-OPS predictions; disabled by absence of validated mappings |
| `POST /v1/assistant`                             | `503 PARTNER_ACCESS_PENDING`; no separately billed API fallback                                           |

Use the `pack.id` and `pack.version` returned by real discovery to search that snapshot. Published regions require a domain `RegionPack` assessment artifact, reviewed status and all release gates. Recent server-created live discovery snapshots are also accepted, retaining their unreviewed status and missing critical evidence. They cannot yield a passing recommendation. Client-provided raw packs are not accepted by search. Legacy synthetic packs and any pack containing a source without explicit `synthetic:false` are rejected, including manifests, downloads and estimates. The removed `/v1/demo` endpoint returns 404. Demonstration equipment guidance is also rejected; absent reviewed guidance remains unknown. The request structures are exported by `@anchor-buddy/domain`. Assessment API limits are 30 nautical miles, seven days, at least 100-metre generation spacing and at most 2,000 generated candidates per request. Discovery permits stays up to 30 days but never invents forecasts beyond the actual provider horizon. Distances are straight-line distances, not routes.

See [live data connections and policies](LIVE_DATA.md) for real global weather/places, source licenses, response contracts, development limits, commercial deployment configuration and the read-only smoke script. Live data does not fill missing reviewed chart, habitat, permission, tariff or station evidence.

The weather route preserves each grid interval, original unit and `null`; it never turns missing waves, swell or current into calm conditions. It is an ingestion/inspection endpoint. A forecast must be assembled into the domain snapshot with independently reviewed tide/current relationships and coverage before it can produce real assessments. CO-OPS astronomical predictions are not weather-driven total water levels. There are deliberately no default “nearest station” mappings.

Provider requests have HTTPS host allowlists, redirect rejection, bounded caching, timeouts and serial throttling. Requests to one URL share an in-flight fetch. A failed refresh does not serve stale data as fresh. Do not log authorization headers or credentials. No AI credentials are accepted or stored by this server.

The core tests check API/local-engine parity, invalid input limits, rejection of synthetic/mixed-source packs, checksum corruption, path traversal, review gating, missing marine parameters, provider cache expiry and datum/station mismatch. Tests use offline fixtures and Fastify injection without binding a network socket. Production deployment still needs ingress rate limits, monitoring, local maritime review and physical-device/on-water validation.

After deliberately discovering a real area, run `node --import tsx apps/api/test/cache-e2e.ts` from the repository root. This separate integration check copies the existing real snapshot cache into a temporary directory, starts local HTTP servers, checks discovery/search/unknown-price estimates, recreates the server to verify disk restoration, and advances its test clock to exercise expired evidence. Provider failure is controlled without supplying invented data or making upstream calls. The original cache is unchanged. `E2E_CACHE_ROOT` can select another existing snapshot directory. Vessel dimensions in this test are explicitly isolated request fixtures, not a real boat declaration.

Authoritative implementation references: [NWS API](https://www.weather.gov/documentation/services-web-api), [CO-OPS API](https://api.tidesandcurrents.noaa.gov/api/prod/), [NOAA ENC catalog](https://charts.noaa.gov/ENCs/ENCs.shtml).
