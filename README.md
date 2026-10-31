# Anchor Buddy

Anchor Buddy is a React Native anchoring planner for iOS and Android, with a browser development preview. It combines a vessel profile, a timed search, conservative depth/rode/footprint checks, place and price comparisons, an anchoring workflow, and a native supplemental anchor watch.

**This repository is a development implementation, not a released nautical product. The bundled Florida Keys region is entirely synthetic. Its depths, hazards, weather, tides, places, prices and permissions are invented. Do not use its results for navigation, anchoring or docking.** A geographical basemap does not make the overlaid demo evidence real.

## What is implemented

| Area                  | Delivered behavior                                                                                                                                                                       | Release limitation                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner               | Initial setup/tour, empty Explore, saved searches, map/list views, vessel/search defaults, place/seabed/fee filters, sorting, result details and nested anchor plans                     | The bundled region and equipment guidance are demonstrations; approaches and berth availability remain separate                                |
| Assessment            | Shared deterministic TypeScript engine, whole-stay checks, conservative depth bounds, complete footprint exclusions, explicit missing evidence, itemized tariffs and deeper alternatives | Requires reviewed region, station relationships, equipment guidance and field validation before live recommendations                           |
| Offline data          | Local profiles and dated snapshots; staged, size/SHA-256-checked pack installation that retains the previous active pack on failure                                                      | No real reviewed regional pack is supplied; forecasts and notices still expire offline                                                         |
| Charts                | MapLibre Native/GL; optional depth, seabed and marks layers; map-based search centre/radius; analysis geometry separate from display                                                     | Public context basemaps are not nautical charts. Native tile caching requires an approved, licensed pack/style; web saves analysis assets only |
| Anchor watch          | Swift/CoreLocation and Kotlin location foreground-service implementations; local alerts, explicit arming, fixed anchor, accuracy/freshness checks and interruption state                 | Source is implemented and autolinking checked; full native builds, overnight device trials and on-water validation remain outstanding          |
| Backend and ingestion | Fastify API; NWS grid/alert adapter; guarded CO-OPS adapter; NOAA ENC/GDAL ingestion; immutable packs; PostGIS indexing and container stack                                              | ENC extraction alone cannot establish safe holding, complete restrictions, station mappings, tariffs or forecast coverage                      |
| ChatGPT               | Capability boundary and disabled assistant endpoint                                                                                                                                      | Commercial partner approval and approved mobile authorization are unavailable; no working subscription sign-in is shipped                      |

Booking, payments and turn-by-turn navigation are outside this implementation. Search distance is straight-line distance. A “passes configured checks” result is not a guarantee of safety.

## Run the development preview

Use Node.js 24 and npm. Python 3.11+ is required for ingestion tests. The core demo does not require an account, database or API credentials.

```sh
npm ci
npm run web
```

Open the address printed by Expo, normally `http://localhost:8081`. The web scripts prepare the local MapLibre worker assets. The bundled sample works without starting the backend. Open **Anchor watch** in the header to explicitly enable its simulator; it does not monitor a vessel or produce a real native alarm.

To run the API in another terminal:

```sh
npm run api
```

The default API address is `http://localhost:3001`; [the API README](apps/api/README.md) lists routes and behavior. Export environment settings from [the API example](apps/api/.env.example) through the shell or deployment environment; the server does not automatically load `.env` files. If a restricted environment blocks the `tsx watch` IPC socket, use `npm start --workspace=@anchor-buddy/api` without the watcher.

Configure the API address under **Settings → Data connection**, or set `EXPO_PUBLIC_API_URL` before starting Expo. Android Emulator can use `http://10.0.2.2:3001`. A physical device needs a reachable trusted HTTPS development endpoint; `localhost` on the phone refers to the phone. Remote provider addresses must use HTTPS.

## Local app walkthrough

1. **Initial setup:** choose display units, configure the vessel and anchor equipment, and save search defaults. Complete or skip the app tour. Reopen setup or the tour from **Settings → Help**.
2. **Explore:** starts with no active search. Choose **Plan a stay** or **New search**. Tap the map to set the centre, adjust its radius, choose local dates/hours, and review depth, seabed and operating limits before searching.
3. **Compare results:** use **Quick filters** and **Advanced filters & sorting**. Map/list controls share the same row. Open **Layers** on the map to switch depth, seabed and marks; display choices do not remove evidence from assessment checks.
4. **Plan an anchoring stay:** open a result, review its evidence, then choose its plan action. Adjust the drop point and deployed rode, review the complete footprint, and complete arrival checks. Anchor planning is a step reached from a result, not a primary tab.
5. **Test the watch:** continue from the plan or open the persistent **Anchor watch** header control. In the browser, enable the simulator, confirm the position/radius and checklist, check readiness, run the simulated alarm test and start it. Test drift, return inside, poor accuracy and interruption. Navigation or closing a search does not stop or recenter a watch; use **Stop watch** explicitly.
6. **Save and close:** choose **Save results**, name the snapshot, then **Close search** to return to empty Explore. Open **Saved** to inspect the historical snapshot or **Open & reassess** using current vessel/data. Update elapsed stay dates before planning again.
7. **Settings and offline:** edit the vessel, search defaults, units, language and map defaults in **Settings**. English is the supported language. Save analysis offline, enable offline planning and reload. Saved regional analysis appears in **Saved**; map tiles require a separately approved native download.

The primary tabs are **Explore**, **Saved** and **Settings**. The watch remains a persistent header control so an ongoing session can be reached from any tab. Its monitoring status is verified independently of the selected search or anchor plan.

## Build the native app

**Use an Expo development build, not Expo Go.** MapLibre Native and the local anchor-watch module require compiled native code.

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

Build the explicitly synthetic ingestion fixture with:

```sh
docker compose -f infra/compose.yaml --profile tools run --rm ingest build fixtures/recipe.json --root /data/packs
```

See [container setup](infra/README.md) and [regional ingestion](workers/ingest/README.md) for selected ENC downloads, GDAL extraction, official spatial imports, PostGIS indexing and operator publication. No real NOAA charts, complete sanctuary/USCG constraints, validated local station mappings or real marina tariffs are bundled. The published assessment snapshot is a separate reviewed artifact; raw source ingestion does not automatically create a releasable region.

Saving a current area stores analysis evidence and its dates. It does not bulk-download OpenStreetMap public tiles. Approved native offline charts are a separate cache with explicit entitlement checks. Retaining a pack does not extend a forecast's validity or include newly issued notices.

## Verify changes

```sh
npm run check
npm run export:web --workspace=@anchor-buddy/mobile
npm audit
```

`npm run check` runs workspace TypeScript checks, domain/API/mobile/watch tests, and Python ingestion tests. Automated fixtures cover conservative assessments, tariff rules, invalid inputs, interrupted/corrupt pack installs, API parity and watch state transitions. Browser export verifies bundling; reference watch tests do not run CoreLocation or an Android service. See the [release checklist](docs/release-checklist.md) for native, maritime and on-water evidence that automated tests cannot supply.

Web and iOS/Android JavaScript/Hermes exports, Swift syntax parsing and Expo autolinking have been exercised during development. These checks do not establish native binary compilation or real device monitoring. Record fresh test results for each change rather than treating a past test count as release evidence. The walkthrough above covers the current app flow; native overnight/device acceptance remains outstanding.

Dependency audit currently reports advisories in transitive **zod** and **deepmerge** dependencies. No compatible patched resolution was identified in the current dependency set during implementation. This is an open dependency/release issue, not a clean security audit; reassess the dependency paths and available releases before distribution. Do not force incompatible overrides merely to suppress audit output.

## AI, privacy and project map

Core planning and watch calculations do not depend on AI. `/v1/assistant` returns `503 PARTNER_ACCESS_PENDING`. Approved ChatGPT subscription authorization is not implemented or enabled; the app does not collect ChatGPT passwords or provide a separately billed API-key fallback. Future paid providers need implemented adapters and separately verified analytical/offline rights before credentials can enable anything.

Boat profiles, preferences, saved regional evidence and watch history are local. Native watch evaluation has no network dependency. Online basemap/provider requests still reveal their requested location to the relevant service; there is no production telemetry or account system supplied here.

- [Mobile app](apps/mobile): Expo/React Native UI and local storage.
- [Domain engine](packages/domain/README.md): shared types, validation, geometry, tariffs and assessments.
- [Native anchor watch](modules/anchor-watch/README.md): bridge, Swift/Kotlin engines, simulator and device test protocol.
- [API](apps/api/README.md), [ingestion worker](workers/ingest/README.md) and [infrastructure](infra/README.md).
- [Architecture](docs/architecture.md) and [release gates](docs/release-checklist.md).
