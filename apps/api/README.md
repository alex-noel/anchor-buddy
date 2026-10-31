# Anchor Buddy API

Run from the repository root:

```sh
npm install
npm start --workspace @anchor-buddy/api
npm test --workspace @anchor-buddy/api
npm run typecheck --workspace @anchor-buddy/api
```

Node 24 is the supported runtime. The default port is `3001`. Environment values are documented in `.env.example`; the app does not automatically read `.env` files. Export values through your shell or deployment configuration. No account or external credentials are needed for the synthetic demonstration.

The web preview is allowed from exact localhost/127.0.0.1 origins on ports 8081 and 8082. Override `CORS_ALLOWED_ORIGINS` with a comma-separated deployment allowlist. CORS permits known GET/POST routes and Content-Type preflights; credentials and arbitrary origins are not enabled.

| Endpoint                                         | Behavior                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `GET /health`                                    | Process status and assistant/release gates                                                                |
| `GET /v1/providers`                              | Public capability, attribution, offline and authentication metadata                                       |
| `GET /v1/regions`                                | Published pack identifiers plus explicitly synthetic demo                                                 |
| `GET /v1/demo`                                   | Synthetic pack, vessel and default search for UI development                                              |
| `POST /v1/search`                                | `{regionId, version?, vessel, search, options?}`; returns shared-domain `SearchResult`                    |
| `POST /v1/estimate`                              | Same request plus `placeId`; itemized estimate with separate availability                                 |
| `GET /v1/regions/:id/manifest?version=...`       | Versioned artifact manifest; omitted version resolves current pointer                                     |
| `GET /v1/regions/:id/:version/assets/:name`      | Manifest-listed asset, checked against size and SHA-256 before serving                                    |
| `GET /v1/weather?latitude=24.55&longitude=-81.8` | Real NWS `forecastGridData` plus active alerts, source timestamps and missing-parameter list              |
| `POST /v1/tides`                                 | Reviewed station mapping lookup, metric/GMT CO-OPS predictions; disabled by absence of validated mappings |
| `POST /v1/assistant`                             | `503 PARTNER_ACCESS_PENDING`; no separately billed API fallback                                           |

Use `regionId: "florida-keys-demo"` to exercise search. Other regions require a published pack with a domain `RegionPack` assessment artifact, a reviewed status and all release gates. Client-provided raw packs are not accepted by search. The request structures are exported by `@anchor-buddy/domain`. Limits are 30 nautical miles, seven days, at least 100-metre generation spacing and at most 2,000 generated candidates per request. Distances are straight-line distances, not routes.

The weather route preserves each grid interval, original unit and `null`; it never turns missing waves, swell or current into calm conditions. It is an ingestion/inspection endpoint. A forecast must be assembled into the domain snapshot with independently reviewed tide/current relationships and coverage before it can produce real assessments. CO-OPS astronomical predictions are not weather-driven total water levels. There are deliberately no default “nearest station” mappings.

Provider requests have HTTPS host allowlists, redirect rejection, bounded caching, timeouts and serial throttling. Requests to one URL share an in-flight fetch. A failed refresh does not serve stale data as fresh. Do not log authorization headers or credentials. No AI credentials are accepted or stored by this server.

The core tests check API/local-engine parity, invalid input limits, synthetic labeling, checksum corruption, path traversal, review gating, missing marine parameters, provider cache expiry and datum/station mismatch. Tests use offline fixtures and Fastify injection without binding a network socket. Production deployment still needs ingress rate limits, monitoring, local maritime review and physical-device/on-water validation.

Authoritative implementation references: [NWS API](https://www.weather.gov/documentation/services-web-api), [CO-OPS API](https://api.tidesandcurrents.noaa.gov/api/prod/), [NOAA ENC catalog](https://charts.noaa.gov/ENCs/ENCs.shtml).
