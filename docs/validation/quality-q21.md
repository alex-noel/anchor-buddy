# Q21 whole-stay forecast overview

Implementation started from shared checkpoint `970ae5f` with the integrator’s concurrent App changes. `Details` receives an immutable `ForecastStay` derived from the exact request used for the selected assessment. The integrator wired `assessedSearch = detailSearch ?? activeSearch` into reassessment, the overview and the next plan action. Opening area sources from the detail captures that stay before the detail closes. A normal area preview without a search supplies no stay.

Arrival and departure preserve their original stored timestamp strings. Contingency end uses elapsed hours after the exact departure instant. The default display timezone is the device’s IANA zone, matching date entry under Q14. Callers may provide a display timezone without changing instants. No migration or canonical calculation changes are involved.

## Acceptance evidence

| Criterion | Evidence |
| --- | --- |
| Timezone, stay and contingency are distinct | `ForecastOverview` labels its IANA timezone, requested stay and departure contingency separately. Helper tests cover explicit-offset DST dates and fractional contingency hours. |
| Peaks preserve gaps and nulls | Current peaks exclude null/non-finite observations and expired or unconfirmed rows. Temporal availability clips to original source and snapshot date bounds. Interval overlap is merged by the existing domain interval helper. Missing metric spans remain named even when other metrics span the window. |
| Point context remains bounded | Details summarizes the existing `assessment.weather` only. The area view uses the loaded region rows and explicitly states that live forecasts describe the search centre. These presentation functions establish no spatial or suitability evidence. |
| Full inspection remains accessible | Both sheets retain the interval expansion controls. Every expanded row has its full date range, current values, missing-value notice, expiry/freshness state and existing warnings. The area sheet includes the referenced forecast source links and original retrieval/expiry dates. Detail source records remain under Sources & freshness. |
| Exact selected search and no-stay preview | App source review confirms the same `assessedSearch` feeds the domain reassessment and immutable stay. The mounted detail fixture checks its explicit New York stay instants. The preview test passes no stay and sees only the available range, gaps, retained intervals and source dates. |

## Commands and mounted inspection

- `node --import tsx --test apps/mobile/src/lib/forecastPresentation.test.ts` passed 9 tests for timezone and immutable timestamps, gaps/overlap, nulls, current expiry, future/missing dates, classified-source unknown freshness, expiry before departure, preview range and all unit systems.
- `npm run typecheck --workspace @anchor-buddy/mobile` passed.
- `npm run test --workspace @anchor-buddy/mobile` passed 173 tests at the integrated working checkpoint.
- `npm exec --workspace=@anchor-buddy/mobile -- playwright test --config=e2e/watch-harness/playwright.config.ts forecast.cases.ts` passed 2 mounted tests. Details was checked at 390 × 900 and 1280 × 900 CSS pixels. Preview used 390 × 844. Tests confirm the official warning after the initial 24 rows remains reachable, the no-stay view makes no requested-stay claim, and existing forecast data stays visible during a retry. Browser page errors were empty.
- `git diff --check` passed.

Mounted checks used explicit synthetic component fixtures in the isolated test bundle on macOS 15.7.7 arm64, Playwright 1.65.0 and Chromium 158.0.8127.18. They provide UI evidence for the component behavior. App request wiring was reviewed in source. Captures are retained under `.artifacts/quality-q21/forecast-detail-390.png`, `forecast-detail-1280.png` and `forecast-preview-390.png`.

The RegionalDataSheet changes also expose the integrator-requested optional connection summary, retry help and retry-disabled presentation props for Q30. Refresh commands and cooldown decisions remain with App.

Independent integrator review remains required before acceptance. Native builds and physical-device behavior have their separate Q36/Q37 gates.
