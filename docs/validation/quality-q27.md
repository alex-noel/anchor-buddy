# Q27 validation: map-download stages and usable progress

## Scope

The download sheet now separates map tiles and required fonts from optional places/weather data. It only displays a tile percentage when the engine supplies a positive denominator, names that percentage as a fraction of tiles, and distinguishes tile completion from fonts/readiness checks. Partial-map copy says the map can open only when `usableZoom` is supplied by the engine. Map completion and evidence completion/failure are represented independently. Screen-reader progress is limited to preparation, phase/readiness changes, completion/failure, or a 10-point tile-progress threshold.

The download engine, integrity rules, map source attribution, and saved-map actions were not changed.

## Verification

- `npm test --workspace=@anchor-buddy/mobile` — passed, 133 tests.
- `npm run typecheck --workspace=@anchor-buddy/mobile` — blocked by a concurrent `SavedScreen.tsx` edit: `tabIndex` is not accepted on its React Native `Text` element (line 111 at check time). No diagnostic referenced Q27 files.
- Controlled UI scenarios are authored in `apps/mobile/e2e/download-harness/map-download.spec.ts` for preparation → coarse partial → pause → resume → completion and map-complete/evidence-failure. The intended viewport is 390 × 844 CSS pixels.
- `npx playwright test --config=e2e/download-harness/playwright.config.ts` — Expo web export completed, but the mounted harness could not start its isolated server: the environment returned `listen EPERM` for `127.0.0.1:18083`. Therefore the mounted scenarios and screenshot inspection remain unverified here.

Harness fixtures are test-only: empty vector tiles and an empty regional pack are used to exercise controlled state transitions; they do not create positive navigational/evidence data in the production app.

## Remaining review

Integrator should run the mounted harness in an environment permitting its isolated port, inspect both captures at 390 × 844, and review the shared sheet interactions. No physical-device evidence is claimed.

Integrator fixed the transition from preparation to map-transfer phase and ran the mounted controlled scenarios successfully (2/2 at 390×844). Real exported-shell worker is enabled for these download tests because it is a download prerequisite. Verified coarse partial readiness, pause/resume/completion, and complete-map plus failed-evidence separation. Test-only file renamed `map-download.cases.ts` with a dedicated config so normal E2E does not collect its alternate-server cases. No nautical-evidence validity rule changed.
