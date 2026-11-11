# Europe/Asia expansion: development validation

These checks validate development behavior, not nautical suitability or release readiness.

- The exported browser app completed onboarding and retained multiple seabed preferences. Choosing the Split preset submitted its coordinates, radius, name and timezone. A real 15 nm search returned 180 community place records and 21 forecast intervals; the UI showed 172 matching results with missing evidence preserved. These are observations from 2026-11-11, not fixed assertions about current data.
- Sources displayed a real European DTM sample and HHI's 1985 mud classification at the requested point, including original sign, LAT reference, scale, retrieval/expiry, attribution and limitations. These values were not added to nautical depth, holding or coverage arrays.
- A selected Hiroshima area downloaded 11 vector tiles through zoom 10 plus its fonts (27.1 MB). With networking disabled, the saved map opened and displayed Japanese labels. The exported app also reloaded from its service worker; an uncached API request failed while the app still loaded. Cached maps rendered even when the browser's connectivity hint incorrectly remained online.
- At a 390 px viewport the document remained 390 px wide, with the map/list control, horizontally scrollable quick filters and bottom tabs accessible. Automatic offline mode did not change the saved manual-offline preference.
- A separate real Tokyo Bay cache test interrupted a download after coarse zoom 3 became usable, then resumed through zoom 4. Verified resources and 103 font ranges survived interruption. Unit coverage includes corrupt resources, incomplete glyph ranges, coarse readiness, legacy label policies and bounded transfers.
- API live checks returned real Split and Singapore places/marks/forecasts. A separate Bergen Oceanforecast request returned regional significant-wave data. Detailed source counts, provenance and provider limits are recorded in [live data documentation](../apps/api/LIVE_DATA.md).

TypeScript and all 190 automated tests passed (43 API, 64 mobile, 56 domain, 16 watch, 11 Python ingestion). Web export and iOS/Android JavaScript/Hermes exports also passed. Native exports do not establish native compilation, file rendering or physical-device background-watch behavior. Those remain in the [release checklist](release-checklist.md).

A source scan found no credentials, private filesystem paths, personal metadata or downloaded tile/font/image blobs in changed source. Runtime caches and generated exports remain ignored by Git. The small, attributed Geofabrik routing outline is metadata for selecting a provider, not a bundled chart.
