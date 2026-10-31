# Public release checklist

No public nautical release is certified by this repository. The bundled region is synthetic, partner AI access is unavailable, and real regional data, full native builds, physical-device overnight trials and qualified maritime/on-water validation remain outstanding. A completed automated test suite is development evidence only.

Record the exact source snapshot, commit/build identifier, reviewer, date, device/OS and outcome for each applicable gate. Store evidence outside the app's synthetic fixtures. Do not mark a gate complete solely because a configuration field accepts `true`.

## Regional evidence and maritime review

- [ ] Select actual Florida Keys ENC cells, verify exchange-set hashes, editions and complete update sequences, and retain catalog/source provenance.
- [ ] Validate unsimplified topology, tiny hazards, holes, chart boundaries and datum metadata; confirm display assets cannot enter analysis calculations.
- [ ] Establish positive coverage for bathymetry, hazards, habitat, restrictions, weather, tides and currents over each permitted search footprint and entire stay/contingency. Missing polygons or soundings alone are not coverage evidence.
- [ ] Resolve effective sanctuary/federal/state/local restrictions and spatial safety notices with jurisdiction, dates and documented authority. Include notices needing manual spatial interpretation.
- [ ] Validate location-specific weather/current coverage, tide-station relationships, matching datum conversions and bounded weather-driven water-level uncertainty. Do not substitute the nearest station or astronomical tide alone.
- [ ] Review vessel/equipment-specific scope guidance and holding compatibility; verify length/beam/draft/displacement/air-draft and mooring/berth constraints where relevant.
- [ ] Verify actual marina, dock and buoy records, overnight/day-use permissions, access windows, closures and availability semantics. Exclude Florida Keys day-use reef buoys from overnight recommendations.
- [ ] Verify operator tariff currency, length/type/beam rules, seasonal periods, minimum charges, taxes and extras against dated authoritative publications. Unknown prices remain unknown.
- [ ] Obtain qualified local maritime/geospatial review of generated positions, full footprints, depth fallback and evidence limits. Conduct controlled on-water validation with an independent competent watch.
- [ ] Supply a valid assembled assessment artifact and evidence for all required `maritime`, `coverage`, `geometry`, `stationMappings` and `onWaterValidation` gates, including reviewer/date. A synthetic region can never be promoted into real evidence by relabelling it.

## Builds, watch behavior and mobile validation

- [ ] Build and install the native app on supported iOS and Android physical devices using Expo development/release builds; Expo Go is unsupported.
- [ ] Configure full Xcode/iOS SDK/CocoaPods and signing. The implementation machine had only Command Line Tools; Swift syntax parsing and autolinking do not establish iOS compilation.
- [ ] Configure Android SDK/NDK and the JDK supported by Expo SDK 58. Current Expo guidance uses JDK 17; Java 11 on the implementation machine is insufficient. Follow [Expo's setup guide](https://docs.expo.dev/get-started/set-up-your-environment/).
- [ ] Compare identical assessment inputs/data versions on actual iOS, Android and server runtimes; check timezones, DST, floating-point boundaries and unsupported/malformed data. Node replay alone is not cross-runtime testing.
- [ ] Verify arming preconditions, real audible test, actual anchor recording, initial acquisition, stale/out-of-order/poor fixes, uncertainty overlap, boundary breach, latching, acknowledgment and confirmed radius edits with no recentering.
- [ ] Run physical-device overnight trials with screen lock, app backgrounding, internet disconnected, poor GPS, low battery, battery-saving modes and JavaScript disconnected. Record native heartbeat and audible/visible alarm delivery.
- [ ] Test foreground-service startup/restrictions, GPS/notification permission revocation, notification channel/sound changes, Focus/Do Not Disturb/silent mode, reduced volume, app suspension, process kill, force quit, shutdown and reboot.
- [ ] Confirm reopening verifies the live native runtime and marks ended sessions interrupted. A persistent armed flag must never display “Monitoring.” No notification may be promised after the process/device has stopped.
- [ ] Verify location/notification privacy disclosures, store-policy declarations and background-service behavior. Do not imply a critical-alert entitlement or guaranteed audibility.
- [ ] Review the full [native watch trial protocol](../modules/anchor-watch/README.md) and retain independent watch coverage during field tests.

## Offline, map and application acceptance

- [ ] Exercise initial setup, the replayable tour, empty Explore, search submission/closing, saved snapshots and reopening/reassessment. Confirm failed local writes do not mark unsaved setup complete.
- [ ] Exercise map/list selection parity, units, vessel and search defaults, map-selected centre/radius, local-time stay inputs, custom pins, seabed preference, optional layers, all filters/sorts, unknown fees, excluded/insufficient results and distinct approach/availability information.
- [ ] Verify result → plan → watch → plan preserves the adjusted position and rode. Confirm watch status remains accessible from all tabs, initial setup cannot block an existing watch, and closing a search never stops or recentres native monitoring.
- [ ] Test expired forecasts, forecast/tide interval gaps, mismatched or missing datums, spatially inapplicable station/grid evidence, uncertain rules, restricted footprints and insufficient deployed/usable rode.
- [ ] Verify interrupted, corrupt, identity-mismatched and oversized asset downloads preserve the previous active pack; check activation after restart and assessment after replacement.
- [ ] Confirm saved analysis remains usable without network while expired evidence stays visibly expired. Reconnection requires installing refreshed evidence rather than resetting timestamps.
- [ ] Test permitted native offline chart downloads/resume and resource/style identity; verify licensing, attributions and asset integrity. Do not bulk-download public OSM tiles. Web analysis caching is not native offline chart support.
- [ ] Exercise narrow screens, tablets, map gestures, accessible labels, large text, keyboard interaction and readable warnings. Verify sample provenance remains accessible in setup, assessment/source details and Settings, and the simulator remains explicitly distinguished from real monitoring throughout its watch flow.

## Deployment, dependencies and operations

- [ ] Run `npm run check`, web export, platform builds and physical-device acceptance against the release commit; retain results. Repeat checks after changes affecting their coverage.
- [ ] Reassess `npm audit`. Implementation-time audit reports transitive **zod** and **deepmerge** advisories, with no compatible patched resolution identified in the current dependency set. Determine reachable impact and an appropriate supported upgrade/remediation before distribution; do not describe the dependency tree as security-clean.
- [ ] Build/run the API, PostGIS and ingestion containers in the target environment; validate schema initialization, pack mounting, least-privilege credentials and version-scoped database imports. Local Compose files are not proof of deployed operation.
- [ ] Configure HTTPS ingress, request/rate/resource limits, trusted origins, operator publication authentication, credential handling, backups/restores, immutable/versioned object storage and deployment rollback.
- [ ] Establish source-refresh and expiry monitoring, provider outage behavior, ingestion failure alerts and responsible ownership for notices/rules/tariffs. Retain provenance and prevent stale data from being served as fresh.
- [ ] Verify metadata and precise-location privacy, device storage behavior, support processes, incident response and product wording with appropriate reviewers. The app remains decision support and a supplemental watch.

## Optional AI release gate

- [ ] Obtain approved commercial ChatGPT subscription partner access and verify the supported mobile browser authorization/token-storage flow before enabling any assistant feature.
- [ ] Implement only authorized capabilities. Never collect ChatGPT passwords, copy subscription cookies, or add a separately billed API-key fallback.
- [ ] Test denied/revoked authorization, unavailable service and exhausted allowance; deterministic planning and native monitoring must remain operational.
- [ ] Verify assistant output preserves source facts, unknowns and exclusions, cannot invent prices/depths, and has no tool capable of arming, stopping, acknowledging or recentering the watch.

Until that integration is implemented and approved, keep `/v1/assistant` returning `PARTNER_ACCESS_PENDING` and present the assistant as unavailable.
