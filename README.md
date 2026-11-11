# Anchor Buddy

Anchor Buddy is a React Native anchoring planner for iOS and Android, with a browser development preview and an exported web build. It combines a vessel profile, a timed search, conservative depth/rode/footprint checks, place and price comparisons, an anchoring workflow, and a native supplemental anchor watch.

**This repository is a development implementation, not a released nautical product. Explore starts empty, with no assumed nautical coverage.** The running app and API accept only explicitly non-synthetic source data. No sample workspace, fixture chart, demonstration equipment guidance or browser watch simulator is shipped. Missing or unavailable evidence stays unknown. Synthetic factories and replay tools exist only behind test-only entry points and cannot be imported by the mobile build.

New boat profiles start blank. Profiles saved by older builds must be checked and confirmed; any demonstration scope guidance is removed. Older search snapshots without provenance keep their search preferences but hide historical result values until reassessed.

## What is implemented

| Area                      | Delivered behavior                                                                                                                                                                                                 | Release limitation                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner                   | Initial setup/tour, empty Explore, submitted place-name/map search, multiple seabed preferences, map/list results, filters, saved searches and nested anchor plans                                                 | Public-source places can lack depth, overnight permission, vessel limits, prices and availability                                                       |
| Assessment                | Shared deterministic TypeScript engine, whole-stay checks, conservative depth bounds, complete footprint exclusions, explicit missing evidence, itemized tariffs and deeper alternatives                           | Real passing recommendations require reviewed nautical coverage, station relationships, equipment guidance and field validation                         |
| Offline data              | Local profiles, dated search snapshots, regional places/weather caches and staged size/SHA-256-checked reviewed pack installation                                                                                  | No reviewed nautical pack is supplied; saving evidence never extends forecast or notice validity                                                        |
| Map display and downloads | MapLibre Native/GL, worldwide OpenFreeMap maps, Europe/Asia coastal presets, progressively usable offline areas, cached-map fallback and local-language labels                                                     | Display maps are not nautical analysis. GEBCO bathymetry and OpenSeaMap marks are online context layers; native rendering still needs device validation |
| Anchor watch              | Swift/CoreLocation and Kotlin location foreground-service implementations, local alerts, explicit arming, fixed anchor, accuracy/freshness checks and interruption state                                           | Source is implemented and autolinking checked; full native builds, overnight device trials and on-water validation remain outstanding                   |
| Backend and ingestion     | Fastify API, submitted geocoding, worldwide place/weather adapters, European EMODnet context and regional waves, NWS grids/alerts, guarded CO-OPS, NOAA ENC/GDAL ingestion, immutable packs and PostGIS containers | Public providers can fail or lack coverage. Extraction/discovery alone cannot establish holding, restrictions, station mappings or tariffs              |
| ChatGPT                   | Capability boundary and disabled assistant endpoint                                                                                                                                                                | Commercial partner approval and approved mobile authorization are unavailable; no working subscription sign-in is shipped                               |

Booking, payments and turn-by-turn navigation are outside this implementation. Search distance is straight-line distance. A “passes configured checks” result is not a guarantee of safety.

## Run the development preview

Use Node.js 24 and npm. Python 3.11+ is required for ingestion tests. Run from the repository root. Core features and public-data development requests need no user account, database or API credentials.

Install dependencies once, then start the API:

```sh
npm ci
npm run api
```

In a second terminal, from the same project directory:

```sh
npm run web
```

Open the address printed by Expo, normally `http://localhost:8081`. Keep both processes running for live location searches, area discovery and browser map downloads. The web scripts prepare the local MapLibre worker assets. Initial setup requires your actual vessel dimensions and configures search defaults; Explore has no results until you submit a search.

Without the API, use previously downloaded maps and source evidence. Missing data is never replaced with invented places. The browser reports that anchor watch requires the native iOS/Android app; it cannot simulate monitoring or an alarm.

The default API address is `http://localhost:3001`; [the API README](apps/api/README.md) lists routes and behavior. Export environment settings from [the API example](apps/api/.env.example) through the shell or deployment environment; the server does not automatically load `.env` files. If a restricted environment blocks the `tsx watch` IPC socket, use `npm start --workspace=@anchor-buddy/api` without the watcher.

Configure the API address under **Settings → Data connection**, or set `EXPO_PUBLIC_API_URL` before starting Expo. Android Emulator can use `http://10.0.2.2:3001`. A physical device needs a reachable trusted HTTPS development endpoint; `localhost` on the phone refers to the phone. Remote provider addresses must use HTTPS.

With the API running, live area discovery requests worldwide community boating places and navigation marks from OpenStreetMap, global wind forecasts from MET Norway, and NWS grids/active alerts in US coverage. The live discovery radius is limited to **25 nautical miles**. Source availability is not guaranteed. Live checks retrieved real places around Split and Singapore; configured endpoints and per-provider status remain visible. European EMODnet DTM/substrate point samples are scientific context only, and MET Oceanforecast waves are requested within its regional coverage. Cached responses retain original retrieval/expiry dates during provider outages. **Area data & coverage** shows individual provider results and failures; the app does not substitute sample places. A live discovery snapshot cannot establish safe anchoring without independently reviewed depths, hazards, permissions, tides and other critical evidence. Public data access requires no user account. Optional Open-Meteo waves remain disabled until the operator explicitly configures a permitted non-commercial, commercial or self-hosted deployment.

Read [live source setup and policies](apps/api/LIVE_DATA.md) before deployment. Production place lookup needs an explicitly configured Overpass endpoint. **The public Nominatim geocoder permits only submitted searches, never autocomplete or systematic queries, with attribution, caching and a maximum of one request per second across the whole app.** The gateway enforces spacing within one process; scaling requires a shared limiter or another configured provider. Its public-service use is a deliberate developer choice governed by [Nominatim’s policy](https://operations.osmfoundation.org/policies/nominatim/).

## Local app walkthrough

1. **Initial setup:** choose display units, configure the vessel and anchor equipment, and save search defaults. Complete or skip the app tour. Reopen setup or the tour from **Settings → Help**.
2. **Explore:** starts with no active search. Choose **New search**, select a European or Asian coastal preset, enter a town/harbour/address and press **Find location**, or tap the map to choose the centre. Presets are starting areas, not anchoring positions or coverage guarantees. Adjust the radius, local dates/hours, depth and operating limits. Select multiple preferred seabeds with the visible checkboxes; **All seabeds — no preference** removes this preference without relaxing safety checks. Live discovery supports up to 25 nm; reviewed/downloaded-data searches support up to 50 nm where coverage exists.
3. **Compare results:** use **Quick filters** and **Advanced filters & sorting**. Map/list controls share the same row. Open **Layers** to switch depth, seabed and marks. GEBCO depth imagery, EMODnet European substrate and OpenSeaMap marks provide display context; anchoring seabed suitability remains unknown without reviewed evidence. Sources & coverage shows dated point samples separately from nautical analysis. Layer visibility never removes assessment checks.
4. **Plan an anchoring stay:** open a result, review its evidence, then choose its plan action. Adjust the drop point and deployed rode, review the complete footprint, and complete arrival checks. Anchor planning is a step reached from a result, not a primary tab.
5. **Test the watch:** open the persistent **Anchor watch** header control. The browser explicitly reports that native monitoring is unavailable. In an iOS/Android development build, record the actual anchor position, explicitly confirm the alarm radius, complete readiness checks and the audible test, then arm it. Navigation and closing a search never stop or recenter an active native watch. Full physical-device trials remain required.
6. **Save and close:** choose **Save results**, name the snapshot, then **Close search** to return to empty Explore. Open **Saved** to inspect the historical snapshot or **Open & reassess** using current vessel/data. Update elapsed stay dates before planning again.
7. **Download a map:** use **Download map area** in Saved, the Explore map download control, or Settings. Select the area and detail, then download. Saved lists complete/partial maps, tile progress and storage size. Open a partial map after its coarse tiles and label fonts are ready, resume finer detail, or delete it. Cached areas remain behind live maps as a fallback when requests fail. Optional places/weather downloads use separate coverage and retain their original dates; they do not turn display tiles into reviewed nautical evidence.
8. **Settings and offline:** edit the vessel, search defaults, units, language and map defaults in Settings; English is supported initially. Connection loss automatically uses downloaded maps and available evidence caches. Enable offline planning to prefer them even while connected. Active live searches refresh on reconnect and when their evidence expires; separately reviewed packs still require their own published updates. Saved separates display maps, cached regional data and analysis snapshots. Verify offline reload with the exported web build below; Metro development still needs its server.

The primary tabs are **Explore**, **Saved** and **Settings**. The watch remains a persistent header control so an ongoing session can be reached from any tab. Its monitoring status is verified independently of the selected search or anchor plan.

## Test an exported web build offline

```sh
npm run export:web --workspace=@anchor-buddy/mobile
python3 -m http.server 8082 --bind 127.0.0.1 --directory apps/mobile/dist
```

Open `http://127.0.0.1:8082` online first. The export step includes an integrity-checked service worker for the app shell; selected map downloads also store their tiles and label resources. Download a small area, enable offline planning, then test a reload without network access. Browser storage must remain available and must not be cleared or evicted. Keep the API running while making browser map downloads.

This service worker applies only to **exported builds served over HTTPS or localhost**, not `npm run web`/Metro. Updating the exported app waits for previous tabs to close so shell and worker resources stay together. See [worldwide maps and offline downloads](docs/world-maps.md) for cache limits, source attribution, integrity checks and platform differences. A cached app shell does not make the browser watch a native background service.

## Build the native app

**Use an Expo development build, not Expo Go.** MapLibre Native, connectivity detection and the local anchor-watch module require compiled native code. Rebuild an existing development client after pulling native dependency changes.

```sh
npm run ios --workspace=@anchor-buddy/mobile
npm run android --workspace=@anchor-buddy/mobile
```

Run the appropriate platform command after configuring its toolchain. These commands generate/build the native projects and install the development app. Later JavaScript development can use `npm start`; rebuild after changing native code, plugins or permissions.

For iOS, install full Xcode, its supported iOS SDK and CocoaPods on macOS; physical-device builds also need signing. For Android, configure Android Studio, the SDK/NDK required by Expo SDK 58, and a supported JDK. Expo's SDK 58 build infrastructure and current setup guide use **JDK 17**; the implementation machine's Java 11 is insufficient. Follow [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/) and [local native builds](https://docs.expo.dev/guides/local-app-development/).

The implementation environment had Xcode Command Line Tools but no full Xcode/iOS SDK, no configured Android SDK and Java 11. Swift syntax parsing and Expo autolinking are not native compilation or device validation. Native builds remain a release gate.

## Backend containers and regional data

The local stack includes the API, PostgreSQL/PostGIS and an operator ingestion image. Set a local development database password, then run:

```sh
export POSTGRES_PASSWORD='replace-with-a-local-development-password'
docker compose -f infra/compose.yaml up --build
```

Build a regional snapshot from your actual, attributed ingestion recipe:

```sh
docker compose -f infra/compose.yaml --profile tools run --rm ingest build /data/incoming/recipe.json --root /data/packs
```

See [container setup](infra/README.md) and [regional ingestion](workers/ingest/README.md) for selected ENC downloads, GDAL extraction, official spatial imports, PostGIS indexing and operator publication. No real NOAA charts, complete sanctuary/USCG constraints, validated local station mappings or real marina tariffs are bundled. The published assessment snapshot is a separate reviewed artifact; raw source ingestion does not automatically create a releasable region.

Saving an area's analysis retains evidence and its original dates. Explicit worldwide basemap downloads use OpenFreeMap with bounded area/detail, attribution and resource integrity checks; they do not bulk-download OpenStreetMap's public raster tiles. Reviewed provider charts remain a separate cache with explicit entitlement checks. Neither a display map nor a retained analysis pack extends forecast validity or includes newly issued notices. See [map downloads](docs/world-maps.md).

## Verify changes

```sh
npm run check
npm run export:web --workspace=@anchor-buddy/mobile
npm audit
```

`npm run check` runs workspace TypeScript checks, domain/API/mobile/watch tests, and Python ingestion tests. Automated fixtures cover conservative assessments, tariff rules, invalid inputs, interrupted/corrupt pack installs, API parity and watch state transitions. Browser export verifies bundling; reference watch tests do not run CoreLocation or an Android service. See the [release checklist](docs/release-checklist.md) for native, maritime and on-water evidence that automated tests cannot supply.

Web and iOS/Android JavaScript/Hermes exports, Swift syntax parsing and Expo autolinking have been exercised during development. These checks do not establish native binary compilation or real device monitoring. Record fresh test results for each change rather than treating a past test count as release evidence. The walkthrough above covers the current app flow; native overnight/device acceptance remains outstanding.

During the initial implementation on **2026-10-30**, the dependency audit reported advisories in transitive **zod** and **deepmerge** dependencies, and no compatible patched resolution was identified then. This historical result is not a current security assessment. Rerun `npm audit`, reassess reachable dependency paths and use supported remediation before distribution; do not force incompatible overrides merely to suppress audit output.

## AI, privacy and project map

Core planning and watch calculations do not depend on AI. `/v1/assistant` returns `503 PARTNER_ACCESS_PENDING`. Approved ChatGPT subscription authorization is not implemented or enabled; the app does not collect ChatGPT passwords or provide a separately billed API-key fallback. Future paid providers need implemented adapters and separately verified analytical/offline rights before credentials can enable anything.

Boat profiles, preferences, saved regional evidence and watch history are local. Native watch evaluation has no network dependency. Online basemap/provider requests still reveal their requested location to the relevant service; there is no production telemetry or account system supplied here.

- [Mobile app](apps/mobile): Expo/React Native UI and local storage.
- [Domain engine](packages/domain/README.md): shared types, validation, geometry, tariffs and assessments.
- [Native anchor watch](modules/anchor-watch/README.md): bridge, Swift/Kotlin engines, test-only replay tools and device test protocol.
- [API](apps/api/README.md), [ingestion worker](workers/ingest/README.md) and [infrastructure](infra/README.md).
- [Worldwide maps and offline downloads](docs/world-maps.md), [architecture](docs/architecture.md) and [release gates](docs/release-checklist.md).
- [Live-only data and end-to-end validation](docs/live-only-e2e-2026-11-11.md): observed browser journeys, automated checks and remaining device trials.
