# Q16 map loading and recovery

Started from shared baseline `e40e985` with the integrator’s in-progress shell changes. Both Chart variants now show initial loading, interrupted map detail and renderer failures. Explore can open the result list from a map failure. Status and actions sit outside the drawable map, toolbar and selection card. Retrying rebuilds the renderer at its last camera position while the search, selected place and manual pin stay in the workspace.

Web recovery matches successful source content or the specific previously failed tile. An idle event alone can include failed requests, so it cannot clear a live source warning. A retry or restored WebGL context clears the previous warning after a new successful render, while preserving any failures reported by the new renderer. Native uses the MapLibre bridge’s style and failure callbacks and its fully rendered map callback. The bridge does not expose per-tile failure or recovery events.

Offline notices use the verified world-map style metadata or a completed installed chart cache. Availability is scoped to saved areas. The basemap remains a display layer, and the change does not promote source evidence or change its dates.

## Verification

- `node --import tsx --test apps/mobile/src/lib/{chartLoad,mapStyle,resultPresentation}.test.ts` passed 13 focused tests. A render, unrelated tile and idle-equivalent state leave a failed tile visible until its own successful content event. Renderer recovery requires a new attempt and render.
- `npm run typecheck --workspace @anchor-buddy/mobile`, `npm run test --workspace @anchor-buddy/mobile` and `git diff --check` passed. The mobile suite ran 158 tests.
- `npm run test:e2e -- chart.spec.ts` passed both production-entry tests on macOS 15.7.7 arm64, Playwright 1.65.0 and Chromium 158.0.8127.18 at a 390 × 844 CSS pixel viewport. The recovery test uses actual WebGL context loss, a controlled HTTP 503 TileJSON response and a successful retry. It checks pointer selection, a placed pin, retained horizontal camera offset after a drag, the list fallback and the offline message with no confirmed downloads.
- `npm exec --workspace=@anchor-buddy/mobile -- playwright test --config=e2e/download-harness/playwright.config.ts --grep 'download stages show'` passed 1 test. A controlled download uses the real cache verification path, then Saved → Open map reports confirmed basemap availability with Offline planning enabled.
- Initial mounted inspection uncovered overlap in the constrained phone map region. The integrated App layout now scrolls the phone map toolbar, chart and selected-place card in order, with recovery controls outside the canvas. The mounted test compares their bounding boxes and verifies that map controls remain present. The failure, recovered and saved-basemap fixtures are captured in `.artifacts/quality-q16/`.

No state migration is needed. Full native acceptance remains open until toolchains and devices are available under Q36/Q37.
