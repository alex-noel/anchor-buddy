---
id: APP-07
title: "Complete accessibility and locale-safe control behavior"
priority: P0
estimate_hours: 10
dependencies: [FOUNDATION-01, FOUNDATION-02]
lane: app
expert_review: false
external_gate: "Physical iOS and Android builds are required for final keyboard and screen-reader evidence."
---

# APP-07 — Complete accessibility and locale-safe control behavior

Audit and fix shared controls across web, iOS and Android so the app is usable with keyboards, screen readers, large text, signed decimal coordinates and the selected units. Keep the initial application language English; this task does not add unreviewed translations.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Baseline and known completed work

Read components/ui.tsx, Sheet.tsx, SelectField.tsx, SeabedSelect.tsx, LocalDateHourField.tsx; lib/inputNumbers.ts, formDrafts.ts, localDateHour.ts, units.ts and existing tests. Required-field hints, disabled fields, comma decimal parsing, canonical precision through unit changes and local date/hour controls already exist. Date-duration tests already cover a half-hour clock change. Preserve them.

The November browser pass covered desktop and 390 × 844 layouts, not actual device keyboards, VoiceOver/TalkBack, 200% text or full keyboard focus management. Several formatters still explicitly use en-US. Review that as a consistency issue, not as authorization to add languages.

## Ownership

Own the shared controls and formatting helpers named above plus their tests. APP-02 owns Forms.tsx/Onboarding.tsx; APP-03 owns evidence sheets; APP-04 owns chart/result components; APP-06 owns Planner/Saved; APP-08 owns WatchScreen. Do not edit those workers' files concurrently. Publish any new optional control props and a checklist of exact caller changes for the integrator.

Keep existing props backwards compatible where possible. Do not introduce a new component framework or mass restyle the blue/black/gray theme.

## Technical requirements and steps

1. Create a control inventory: text/number field, date calendar, hour selector, single-choice dropdown, multi-choice seabed, checkbox, switch, tab, modal, icon-only action, inline error and async button. Record label, role, value, required/disabled state, focus behavior and error linkage.
2. Ensure every interactive control has an accessible name and selected/checked state appropriate to its actual behavior. Explain disabled actions adjacent to the control where the reason is not evident.
3. Modal opening must move focus into the sheet, constrain web keyboard traversal to the modal, support Escape/platform Back where cancellation is valid, and restore focus to its opener. Closing child setup forms returns to their parent; do not bypass required setup through Escape.
4. Dropdowns/calendars must support keyboard navigation and explicit selection. Multi-select must not close after choosing one seabed. Screen readers must announce current selections and errors without reading decorative icon glyphs as content.
5. Support signed coordinates, decimal comma/point and unfinished numeric drafts. Never turn an empty, '-', '.', NaN or overflow value into zero. Unit changes must preserve canonical values for untouched drafts and explicitly retain invalid drafts for correction.
6. Define one display-format policy: English text, device-local timezone, locale-aware numeric/date ordering where supported, explicit currency code where ambiguous, and consistent 12/24-hour handling. Freeze it with FOUNDATION-02. Do not perform exchange-rate conversion. Reject invalid timestamps safely instead of throwing.
7. Keep stay selection at date/hour precision. Detailed forecast intervals may include minutes when the source requires them; labels must explain the timezone and preserve UTC instants across formatting.
8. Verify layouts at 320/390/768/1024 logical-pixel widths, landscape, 200% text and visible native keyboard. Primary actions and errors must remain reachable without content overlap. Aim for at least 44 × 44 logical-pixel touch targets for essential controls.
9. Respect reduced motion and do not use colour alone for exclusions, selection or watch alerts. Fix shared primitives first; provide targeted caller patches to each owning worker.

## Acceptance criteria

- APP-07-AC01: Every inventory control exposes its accessible name, role and current state with no decorative glyph announcements.
- APP-07-AC02: Modal focus entry, containment, dismissal and restoration work on web; native Back behavior preserves required setup/confirmation rules.
- APP-07-AC03: Keyboard and screen-reader users can choose dates, hours and multiple seabeds without a pointer.
- APP-07-AC04: Invalid numeric drafts are never silently coerced; repeated unit switching preserves valid canonical values within documented conversion tolerance.
- APP-07-AC05: All date/money/unit presenters follow the frozen policy and preserve source currency and UTC instants.
- APP-07-AC06: At the listed viewport/text/keyboard settings, inputs, errors and primary actions remain reachable and do not overlap.
- APP-07-AC07: Status is understandable without colour, motion or icon recognition.
- APP-07-AC08: Actual device keyboard/screen-reader outcomes are recorded separately from browser emulation.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-07-T01 / APP-07-AC01, APP-07-AC02 | Keyboard-only web: open sheet, Tab/Shift-Tab through it, Escape, then reopen. | Focus stays inside while open and returns to opener; no hidden-page activation. |
| APP-07-T02 / APP-07-AC03, APP-07-AC08 | Select sand+mud, deselect sand, open date/hour with keyboard and VoiceOver/TalkBack. | Remaining selection announced correctly; multi-select stays open; date/hour selected explicitly; native device/OS/build evidence recorded separately. |
| APP-07-T03 / APP-07-AC04 | Enter '-', decimal comma, empty and large exponent-like strings; switch nautical/metric/imperial repeatedly. | Invalid drafts remain invalid; valid 25 nm boundary does not round beyond its allowed limit. |
| APP-07-T04 / APP-07-AC05 | Format an identical UTC stay in Europe/Warsaw and Australia/Lord_Howe around DST, with JPY/EUR/USD. | Instants unchanged, local offset/date correct, source currency unambiguous, no conversion. |
| APP-07-T05 / APP-07-AC06 | 320-wide view, 200% text, open native keyboard on last field and show validation error. | Save/cancel/error reachable; no clipped text or action behind keyboard. |
| APP-07-T06 / APP-07-AC07 | Grayscale/high-contrast screenshot and reduced-motion setting. | Excluded/unknown/selected states identified by text/symbol; no necessary motion. |
| APP-07-T07 / APP-07-AC05 | Invalid ISO or unsupported locale input to formatters. | Stable Unknown/invalid display and recoverable diagnostic; no screen crash. |

Run existing mobile typecheck/tests and export:web. Add focused helper tests to the existing lib/*.test.ts suite. Coordinate browser automation with QA-01 and device builds with WATCH-01/02; do not count screen-reader tests as passed if only inspected in source.

## Handoff and limits

Deliver inventory, format policy, shared control changes, caller checklist, test results and the device/browser matrix with untested cells explicit. Estimate 10 hours. No new languages, redesigned navigation, paid accessibility tools or broad stylistic rewrite. If an OS permission prompt prevents testing, report the exact prompt and required human action rather than auto-granting permissions.
