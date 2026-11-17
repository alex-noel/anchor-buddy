# Responsive layouts and accessible journeys

Q38 browser verification uses the integrated working checkout based on `3f792ac987525db1034d339c07373fe63826f97a`. Production changes were supplied by the integrator while the matrix was developed. The final export includes the narrow Explore shared scroll layout and larger narrow/Planner chart allocation. This task adds `apps/mobile/e2e/responsive.spec.ts` and this evidence record.

## Browser matrix

Playwright-bundled Chromium runs on macOS 15.7.7 against the production Expo web export served on loopback port 18082. Browser routing blocks external requests. The intercepted test response contains one long-named anchorage, one long-named partial provider and no depth, seabed, weather or availability evidence. The record remains unreviewed and its price, holding and availability remain unknown. Map source requests fail deliberately, exercising the unavailable-detail warning and list fallback. These captures describe controlled fixtures.

| Case | Measured CSS viewport | Browser zoom | Result |
| --- | --- | --- | --- |
| Narrow | 320 × 844 | 100% | Pass |
| Phone | 390 × 844 | 100% | Pass |
| Tablet | 768 × 900 | 100% | Pass |
| Desktop | 1280 × 900 | 100% | Pass |
| Desktop large text | 640 × 450 within a measured 1280 × 900 host window and configured viewport | 200%, `devicePixelRatio` 2 | Pass |

The large-text test creates an isolated temporary MV3 extension, calls `chrome.tabs.setZoom(tab.id, 2)` and reads back `chrome.tabs.getZoom(tab.id)`. It asserts the resulting effective viewport. Each case records screenshots, document/body width, ancestor scroll bounds and an accessibility-tree snapshot. The extension profile is removed after the run.

The journey covers setup, invalid vessel input, keyboard select, empty Explore, search, keyboard calendar, long selected-area name, long result name, filters hiding results, result-filter reset, missing-evidence details, referenced sources, partial area coverage, unavailable map detail, pointer marker selection, selected-map card, save dialog, Saved, Settings connection failure, Planner warnings/actions and browser watch requirements.

## Acceptance

1. **Pass for the covered browser states.** Document and body widths stay within the measured viewport. Primary and close actions scroll into view and remain actionable. Direct pointer selection opens the long-name result and map marker. Long labels, warnings and selected-map cards were visually inspected.
2. **Pass for browser keyboard and semantics.** Dialogs focus Close on opening. Tab and Shift+Tab wrap between the search close and primary action. Escape returns focus to the opener. Closing details returns focus to the result. The select preserves combobox focus, exposes its active descendant and commits with Enter. Calendar Arrow Right moves focus, selected state is exposed, and Escape restores the unchanged date trigger. Required-input failure focuses the invalid field and provides its accessible error description. Setup disabled state, selected map/list state, selected marker state and the Settings error alert are asserted. Spoken screen-reader announcements remain a separate device/manual gate.
3. **Pass for the covered fixtures.** Full long names, partial-provider text, unknown evidence and source dates remain readable. Failed-map warnings, expanded attribution, markers and the selected-card action remain reachable after scrolling.
4. **Blocked on native builds/devices.** Dynamic Type, Android font scale, VoiceOver, TalkBack and native software-keyboard behavior require native builds and physical-device or simulator runs. The browser watch state reports native watch unavailable. Browser evidence does not complete native watch-dialog or spoken assistive-technology acceptance.

## Findings resolved during integration

The initial 320 × 844 layout left a 70-pixel results scroller below the fixed search/filter/source bands. Its 246-pixel long-name card had an unreachable pointer-click centre. The integrator moved narrow active Explore content into one vertical scroller. The final result card can be shown completely and opens by direct pointer click.

The initial failed-source chart allocation left a 202-pixel canvas under legend and warning content. Expanded attribution covered the centre marker. The integrator increased the narrow chart allocation to 440 pixels and adjusted Planner allocation. The final matrix selects the marker directly while attribution remains expanded.

## Commands and evidence

- `npm run typecheck --workspace @anchor-buddy/mobile` passed.
- `npm run test:e2e --workspace @anchor-buddy/mobile -- responsive.spec.ts -g 'CSS pixels' --reporter=line` passed 4/4 in 35.1 seconds.
- `npm run test:e2e --workspace @anchor-buddy/mobile -- responsive.spec.ts -g '200 percent' --reporter=line` passed 1/1 in 12.9 seconds.
- `npm run test:e2e --workspace @anchor-buddy/mobile -- responsive.spec.ts --reporter=line` passed 5/5 in 47.1 seconds. It recorded 20 states per case, totaling 100 screenshots and viewport records. The document and body widths exactly matched each effective viewport in all 100 records.
- A final zoom-only run passed 1/1 in 12.3 seconds and recorded `outerWidth` 1280, `outerHeight` 900, zoom factor 2 and effective viewport 640 × 450.
- Preserved final screenshots, bounds, accessibility snapshots and viewport records are under `.artifacts/quality-q38/final-matrix/`. The corresponding runner log is `.artifacts/quality-q38/final-matrix.log`. `.artifacts/quality-q38/measurements.json` summarizes all cases. The measured-window JSON and repeated zoom captures are under `.artifacts/quality-q38/measured-zoom/`.

The test performs local browser/storage work only. It changes no storage schema or runtime feature flag. Reverting the two new files removes the matrix and evidence record. Independent integration review and the native accessibility gates remain required before Q38 can be counted fully verified.
