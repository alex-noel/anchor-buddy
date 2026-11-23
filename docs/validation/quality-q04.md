# Sheet focus, close behavior and save actions

The baseline capture used `4b049a3` with Q02 and Q08. The implementation also consumes Q03’s Field API from `cd9ce4d`. Browser evidence uses isolated Chromium contexts with form values entered for the test.

Search, search defaults and vessel sheets compare the current draft with its opening values. Closing an unchanged or reverted draft exits immediately. Closing an edited draft offers Keep editing and Discard inside the same Modal. Keep editing restores the prior control and draft. The header and form action footer stay outside the body scroll area. Pending saves lock the body and close actions while retaining the mounted draft.

## Mounted verification

Chromium 158 on macOS 15.7.7 arm64. Browser checks ran at 390 × 844 and 390 × 380 CSS pixels. A separate capture used real Chromium tab zoom at factor 2, yielding 640 × 450 CSS pixels from a 1280 × 900 browser viewport.

| Acceptance criterion       | Evidence                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Untouched and edited close | At 390 × 844, reverting the field to its opening value let Escape close immediately. An edited field opened the named discard prompt and focused Keep editing. Keeping restored the input and focus. Discard removed the draft. A browser journey also covers discarding an edited search before submitting a new one. |
| Reachable actions          | In the initial 390 × 380 browser viewport, Save occupied y=307–356 CSS px. It remained reachable after validation and scrolling to edit equipment. At 200% zoom it occupied y=365–414 of 450 CSS px. Before the change the initial Save began at y=1108 in both narrow captures.                                       |
| Pending and failed commit  | The short-viewport test injected a rejected settings write and dispatched Escape during that write. The sheet stayed open with its draft, displayed the failure, and saved the same draft on retry. The form stays mounted while locked.                                                                               |
| Simple close and focus     | Opening App tour from Settings announces the named dialog and enters at Close dialog. Shift+Tab wraps to the final action, Escape closes immediately, and focus returns to the Settings trigger. Background tabs are excluded from the browser accessibility snapshot while a Sheet is open.                           |

### Q03 mounted field evidence

Submitting an empty vessel profile moved focus to Vessel name, set `aria-invalid`, and linked a visible inline error to that textbox’s accessible description. Correcting the name cleared its invalid state. An unmapped anchor design error remained visible in the form summary. The same inline-error and footer behavior was inspected at narrow width and real browser zoom.

## Commands and captures

- `npm run typecheck --workspace=@anchor-buddy/mobile`
- `npm run test:e2e` with the two new sheet interactions and existing journeys
- `npm run test --workspace=@anchor-buddy/mobile` with 124 passing tests
- `npm run check:runtime` with 7 passing guard tests and 99 checked modules

Before and after captures, accessibility snapshots and button bounds are under `.artifacts/quality-q04/`, including `before-390x380-form.png`, `after-390x380-form.png`, `after-390x844-discard.png` and `zoom-640x450-form.png`.

The native Modal and keyboard avoidance remain in use. Native software keyboard, Back and spoken screen-reader behavior require device validation. No persistence format or storage identity changed.
