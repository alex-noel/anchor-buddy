# Vessel configuration

Baseline `e40e985` with the Q03 Field and Q04 Sheet contracts. The vessel form groups identity, dimensions and equipment, and offers air draft in a separate optional section. The dimensions group shows the applicable length and mass units. The equipment group still requires scope guidance reviewed for the vessel and equipment.

## Acceptance evidence

| Criterion                      | Mounted result                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid submission             | At 390 × 844, saving with a missing anchor design focused the selector and exposed its inline error while retaining the measured rode length. After choosing a design, saving uncovered the collapsed invalid air draft and focused it.                                                                                   |
| Required and optional inputs   | The phone journey filled every required numeric field, including a measured zero bow roller height. Clearing the optional air draft allowed Save. Before and after captures cover 390 × 844 and 1280 × 900. Actual 200% Chromium tab zoom at 640 × 450 CSS pixels confirmed the optional input and Save remain reachable. |
| Units and equipment            | The form showed feet and pounds for imperial input. Vessel dimensions, equipment selection, zero bow roller height and unset optional air draft retained their displayed values across reload. The canonical conversion and equipment invalidation paths are unchanged.                                                   |
| Shared close and save behavior | Both Q04 sheet tests also passed after grouping, including Keep editing, Discard and retry after a rejected settings write.                                                                                                                                                                                               |

Verification passed with `npm run typecheck --workspace=@anchor-buddy/mobile` and `npm run test:e2e -- profile.spec.ts sheet.spec.ts` (3 tests). Browser captures and viewport data are under `.artifacts/quality-q12/`, including `before-390x844-form.png`, `after-390x844-form.png`, `before-1280x900-form.png`, `after-1280x900-form.png` and `zoom-640x450-optional.png`.

The mounted checks used isolated Chromium contexts and test-entered measurements. Native device behavior remains unverified.
