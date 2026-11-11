# Live-only data and end-to-end validation

Validation date: 2026-11-11. These are development checks, not a maritime approval or an on-water trial. Provider counts below are observations, not fixed expectations for future searches.

## Runtime data boundary

- Mobile and API entry points no longer import a sample region, sample vessel or watch simulator. A dependency-graph check runs as part of `npm run check` and rejects runtime imports of testing/fixture modules, including platform-specific and workspace exports.
- API discovery, disk restoration, mobile cache restoration and reviewed-pack installation require explicitly non-synthetic source provenance. Mixed, synthetic and unclassified evidence is rejected. Ingestion cannot build, index, publish or serve synthetic packs.
- Deterministic fixtures remain in test-only modules so clearance, hazards, tide changes and alarm logic can be exercised reproducibly. They are absent from the exported application bundles.
- Boat measurements start blank and must be confirmed. Previous profiles require confirmation after upgrading. Unsupported web/native builds cannot simulate an active anchor watch.
- Historical saved searches without the new provenance marker retain their names and search preferences, but hide old result values until reassessment.

## Browser journeys

Tested the exported app at `http://127.0.0.1:8082` with the local API on port 3001, in isolated browser storage. The vessel dimensions entered were QA inputs, not evidence about an actual vessel. No provider responses were replaced with test fixtures during these journeys.

| Journey                         | Observed result                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh launch and onboarding     | Explore started empty. Vessel dimensions and anchor selection were blank. Invalid submission was blocked; comma-decimal length input worked. Sand and mud could both be selected and persisted. Tour could be skipped.                                                                                                                                                |
| Search area and stay            | Unselected area blocked submission. Split preset populated the map, radius and region. Human-readable arrival-hour selection worked. Cancelling a new search did not create results.                                                                                                                                                                                  |
| Real European discovery         | Split returned 180 community place records and 172 filtered results. A fresh geocoded Bergen search returned 25 place records, eight marks and 21 real wind/wave intervals. Missing gusts and currents remained unknown.                                                                                                                                              |
| Provider gaps                   | The older Split wind cache could not establish valid expiry and was withheld during the provider retry interval. The UI exposed missing weather; no generated forecast was substituted.                                                                                                                                                                               |
| Filters, sorting and views      | Map/list switching worked. Marinas filtered to 40 Split results. Estimated-price sorting worked; confirmed-free filtering returned zero rather than treating unknown fees as free. Reset restored the results.                                                                                                                                                        |
| Place details                   | ACI Marina Split showed its real OSM source and operator contact, with unknown prices, depths, access and berth availability. Dock/marina/mooring details no longer show anchoring-only rode/swing cards.                                                                                                                                                             |
| Save, close and reopen          | Saved a named 172-result search, closed it to empty Explore, viewed its historical snapshot and reopened it for reassessment.                                                                                                                                                                                                                                         |
| Download and offline            | Downloaded a selected three-nautical-mile Split display area: 37 vector tiles through zoom 13, fonts and attribution, 22.7 MB. Disabled networking, reloaded the exported app from its service worker, opened the saved map and reassessed the saved search using cached evidence. An uncached API request failed as expected. Original evidence dates were retained. |
| Narrow layout and preferences   | At 390 px, document width remained 390 px. Map/list controls and bottom tabs remained accessible. Metric units, the seabed layer toggle and manual offline preference survived reload. Network failure did not overwrite the manual preference.                                                                                                                       |
| Selected pin and planner        | A map-selected position opened details and the planner with missing nautical evidence preserved. Unresolved rode/swing geometry now displays unknown and draws no purported full swing circle. Entering more rode than the vessel carries produced an exclusion. Arrival checks gated continuing to watch setup.                                                      |
| Browser watch                   | Header and planner entry both showed native watch unavailable. No browser arming, alarm simulation or fabricated position fixes were offered.                                                                                                                                                                                                                         |
| Upgrade and deletion            | An older browser workspace required vessel confirmation while retaining its downloaded Hiroshima map and cached regions. A legacy saved snapshot hid its result values and required reassessment. Deleting the QA saved map removed its map cache.                                                                                                                    |
| Sources without a selected area | Refresh action became “Choose search area” and opened an unselected search form instead of requesting placeholder coordinates.                                                                                                                                                                                                                                        |

During offline emulation, Chromium sometimes retained an online connectivity hint. The request-failure path still retained cached data and rendered the saved basemap, with an explicit online-detail error. Reconnection and expiry scheduling also have automated coverage.

## Reproducible checks

```sh
npm run check
npm run export:web --workspace=@anchor-buddy/mobile
node --import tsx apps/api/test/cache-e2e.ts
```

The last command requires existing real discovery cache records under the configured live cache directory. It copies those records to a temporary directory, starts an isolated API and makes zero upstream requests. The observed run covered Split (91 and 180 assessments), Bergen (25 assessments), Singapore (11 assessments from 13 nearby places), unknown rode/footprints, server restart, offline fallback, original source dates, unknown fees, expiry and the removed demo route. It does not silently create substitute records when the real cache is absent.

TypeScript and all 214 automated tests passed: five runtime-boundary checks, 47 API tests, 67 mobile tests, 63 domain tests, 18 watch tests and 14 Python ingestion tests. Web export and iOS/Android JavaScript/Hermes exports succeeded. Runtime graph checks and scans of bytecode/source maps found no fixture or simulator imports/data. JavaScript exports are not native builds.

## Remaining validation

- This machine lacks full Xcode, CocoaPods and the Android SDK. Native compilation, installation, native map-cache rendering and permission/background-service behavior remain unverified here.
- Physical-device overnight trials remain required: screen lock, poor positioning, actual drift, battery saving, notification settings, permission revocation, process termination and reboot.
- Real place/forecast data does not supply complete nautical depth, habitat, jurisdiction, tariff or berth-availability evidence. These searches correctly remain insufficient evidence. Reviewed regional analysis packs and qualified local maritime/on-water review remain release prerequisites.
- Approved ChatGPT partner access is unavailable, so the assistant remains disabled. Its future sign-in and allowance flows could not be tested.

See also [earlier Europe/Asia progressive-cache validation](validation-2026-11-11.md) and the [release checklist](release-checklist.md).
