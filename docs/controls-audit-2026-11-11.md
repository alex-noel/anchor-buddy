# Controls and journey audit — 2026-11-11

This pass followed the journey from first launch through search, selection, planning, saved results, downloads and offline use. Account creation remains deferred. Runtime data came from public services; no synthetic place, depth, weather or watch responses were introduced for browser verification. The manually entered `Controls QA boat` is a local test profile, not a claim about a real vessel.

## Questions used to challenge the controls

| Question | Finding and implemented behavior |
| --- | --- |
| Can a new user supply their actual boat without inheriting example dimensions? | Onboarding requires a confirmed profile and defaults. Zero bow height survives editing, blank names are rejected, and field labels identify required values. |
| Do selector choices describe real choices? | Anchor designs include scoop, plough, claw, fluke, fisherman, grapnel, mushroom and other/unknown. English is read-only until more translations exist. Choosing an anchor design cannot manufacture reviewed scope guidance. |
| What happens when the boat or equipment changes? | Existing scope guidance is invalidated when its relevant inputs change; discarded plans and watch setup suggestions are cleared. A running native session is not stopped by editing a profile. |
| Where does the default stay duration come from? | It is now editable in Search defaults. Arrival changes preserve duration, past departures are rejected, and day-stop wording explains that actual dates still determine overnight restrictions. |
| Can invalid coordinates or radii quietly select another area? | Invalid drafts hide the old map selection and show validation. Live searches enforce 0.25–25 nm before closing the form. Invalid manual pins fail without a render crash. |
| Do unit changes alter the underlying search? | Untouched rounded fields retain their canonical values. Region labels, download radii and the web map scale follow the selected units. Chart source-depth labels explicitly retain metres. |
| Can seabed preferences express multiple acceptable grounds? | Sand, mud, rock, gravel, clay, silt, shell, grass, mixed and unknown remain individually selectable. Reset clears preferences instead of silently selecting sand. Habitat and equipment requirements remain separate. |
| Do map/list counts represent the chosen filters? | A manually selected pin remains separately inspectable and is not counted as a filtered place result. The map explains its first-50 display limit; the list provides all results. |
| Can users discover how to choose a pin? | Explore has an explicit Choose pin / Cancel pin mode. Planner accepts a tap or coordinates. Map selection is not presented as a verified approach. |
| Can a source refresh invalidate an open detail sheet? | Removed or relocated documented places now show a recoverable selection message instead of throwing. The selected position is never silently moved to a refreshed record. |
| Does editing the stay discard the chosen anchor point? | Planner passes its edited coordinates and rode into search editing. Reassessment preserves the chosen point. Saved searches retain manual pins separately from their result snapshots. |
| What happens when an old saved stay has ended? | Reopening proposes fresh dates for explicit review. Cancelling that draft does not apply its filters or area metadata to an existing search. |
| Can a delayed GPS request replace a newer manual choice? | Planner checks fix age, timestamp, finite coordinates and accuracy. Manual/map changes, cancellation and unmount invalidate pending capture requests. Loading/cancel controls expose the pending state. |
| Is the entire stay forecast accessible? | Detail and regional-data panels offer expansion beyond their initial interval count. Regional forecasts show interval start/end times and the device-local timezone convention. |
| Does an empty settings page pretend to have downloaded evidence? | Empty regions no longer show placeholder validity/version or a save action. Empty catalogues, offline controls and unsupported provider coverage are explicit. |
| Can setup review trap an already configured user? | Reopened onboarding has Back to Settings and retains valid configuration. Initial setup still requires the actual mandatory steps. |
| Are cached assets easy to manage without accidental deletion? | Saved items have named deletion confirmation sheets. Completed maps offer Download updated copy. Deleting active regional evidence clears the in-memory view as well; active/unverified watch context blocks that deletion. |
| Does a saved map open in its own area? | Saved map and saved analysis previews use their stored bounds. Close map preview returns to an empty Explore screen. |
| Can the browser imply it is monitoring? | It displays Native watch unavailable, has no fake alarm workflow, and the tour explains the native-build requirement. The planner offers watch requirements without requiring pretend arrival checks. |

## Browser observations

Verified using the exported app at `http://127.0.0.1:8082/`, backed by the local API, at desktop size and a 390 × 844 viewport:

- Fresh onboarding: actual-value entry, anchor-design choices, zero bow height, 24-hour default stay, sand + mud preferences, setup completion and tour.
- Split preset: a 26 nm search is rejected while the form stays open; 15 nm succeeds. Public services returned 180 place records and 27 forecast intervals. Missing depth bounds, fees, permissions and safety coverage stayed unknown.
- Reset filters clears seabeds; price sorting, anchor-only results (8), marina-only results (40), and map/list details behave consistently. These counts describe this dated source response, not a permanent catalogue.
- A mapped anchorage opens the planner. Edited coordinates and 40 m planned rode survive editing search limits. A manual pin is saved and restored separately from the 40 marina results.
- Save → close → empty Explore → reopen restores preferences and reassesses. Delete opens a confirmation; Keep it preserves the item. No saved user asset was deleted for testing.
- Reopened setup can return to Settings. Metric preferences affect distances, download radius, preset labels, forecast wind units and map scale.
- Hiroshima: downloaded a 1 km area, paused mid-transfer, resumed and completed all 17 tiles (27.4 MB including map assets/fonts). Available regional evidence was saved separately. The place service was unavailable; 27 real wind forecast intervals were available. No substitute places were supplied.
- Offline planning opens the downloaded Japan map, including labels/attribution, and preserves the forecast's expiry. The scale shows metres. Source refresh is disabled with an explanation while offline mode is selected.
- Show all 27 intervals exposes the final departure-contingency hours. Browser anchor watch displays Native watch unavailable. No console errors were observed in the final app tab.
- Exported browser updates retain the current complete shell while a tab is open; closing the old tab allows the verified new shell to activate. Cached maps and profiles survive that update. Metro development builds do not install this shell worker.

Screenshots were retained outside the repository in `/tmp/anchor-buddy-controls-artifacts/`; downloaded map data stays in browser storage. Offline verification here used the app's offline-planning mode, not a physical device or a disconnected radio.

## Automated and ingestion checks

- Full workspace check passed: runtime-data boundary, TypeScript, API, mobile, domain, watch bridge/kernel and Python ingestion checks.
- Final totals: **237 passing tests** — 5 runtime guard, 47 API, 80 mobile/offline, 63 domain, 18 watch and 24 ingestion. The full check initially had 79 mobile tests; the final coordinate-boundary regression and mobile typecheck/test run added the 80th.
- Web export and iOS/Android JavaScript/Hermes bundle export passed. These are not Xcode/Gradle builds or physical-device alarm validation.
- React review covered stable hook order, request cancellation, explicit control state, usable labels and shared sheet behavior. Whitespace validation passed.
- Actual NOAA Key West cell `US5FL4DR` completed download → GDAL extraction → verified SQLite → unreviewed assessment assembly: 288 depth areas, 40 polygon hazards and 77 marks. See [real ENC verification](../workers/ingest/REAL_ENC_SMOKE.md) for source versions, hashes, omitted objects and review limits.

## Remaining release boundaries

The ENC assembler does not create missing habitat/restriction coverage, survey quality, tide relationships or weather footprints. Its output remains unreviewed and cannot silently become a suitable anchorage recommendation. Public map context and centre-point forecasts remain distinct from full-footprint safety evidence. Provider credentials, approved commercial AI access, qualified maritime review and controlled on-water/device watch trials remain outstanding.
