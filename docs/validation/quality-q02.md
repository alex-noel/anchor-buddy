# Shared controls and keyboard selection

Baseline `48eb8fbd43f138773ee48536ca364d4505fb2f4a`, including Q01 and Q06. Captures use the mounted app in the shared checkout, with an isolated local export and browser profile. All form values in the captures were entered for the test.

Shared buttons, chips, checkboxes, text inputs and selects have explicit minimum hit areas and a visible browser focus outline. Feather icons keep their visual placement and are hidden from accessible names. App tour step buttons retain 4 px progress marks inside individual hit areas.

On the web, SelectField exposes a select-only combobox and a listbox. Enter, Space and the arrow keys open the list. Arrows, Home, End and typing highlight options while the committed value stays visible. Enter or Space confirms, Escape closes only the list, and Tab leaves the control with the previous value. The highlighted option scrolls into view while browser focus stays on the combobox. Disabled selects suppress touch and keyboard actions and expose their disabled state. Native still uses its existing touch selection pattern. [W3C select-only combobox guidance](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)

## Mounted evidence

Chromium 158.0.8127.18 on macOS 15.7.7 arm64. The narrow context also used touchscreen emulation to activate the option. For the 200% check, a temporary extension set and read real Chromium tab zoom in a fresh profile. A 1280 × 900 browser viewport at zoom factor 2 yielded an effective viewport of 640 × 450 CSS px.

| Acceptance criterion       | Result                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hit area and spacing       | Pass in the browser. Measured button, chip, checkbox, text input, select trigger and option targets each met 44 × 44 CSS px at 390 × 844, 1280 × 900 and 640 × 450. At 390 px the open options list ends at y=878 and the next select begins at y=961. The prior layout let one field overlap the list and allowed help to spill into adjacent controls. |
| Keyboard operation         | Pass in Chromium. The interaction test checks keyboard entry, expansion, navigation and type-ahead, confirmation, Escape without dismissal of the underlying sheet, Tab without a selection change, and predictable focus.                                                                                                                               |
| Accessible names and state | Pass in the mounted Chromium accessibility tree. Button names have no glyphs, Nautical is pressed, Continue to app tour is disabled before setup is complete, and SelectField exposes its name, value, expansion and selected option. The browser tree was inspected without a standalone screen reader, so spoken output remains unverified.            |
| Tour targets               | Pass in the browser. All five targets are 62 × 44 at 390 px, 120 × 44 at 1280 px and approximately 102 × 44 at real 200% zoom, with 8 px between targets in each case. Keyboard focus is outlined.                                                                                                                                                       |

Local capture files under `.artifacts/quality-q02/` include `before-select-390.png`, `after-select-390.png`, `before-tour-1280.png`, `after-tour-1280.png`, and `zoom-select-1280.png`. The `*-targets-*.json` and `*-tour-*.json` files record CSS viewport, hit boxes and accessibility snapshots.

## Verification

Final checks ran on a temporary copy of the assigned baseline with the Q02 changes applied.

- `npm run typecheck --workspace=@anchor-buddy/mobile` passed.
- `npm run test:e2e` passed all 3 tests, including the new select interaction test.
- `npm run test --workspace=@anchor-buddy/mobile` passed all 91 tests.
- `npm run check:runtime` passed all 7 guard tests and checked 91 modules.

Existing persisted values and component call sites remain compatible. The browser smoke tests do not establish native device or assistive-technology behavior.
