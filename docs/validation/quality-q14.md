# Stay calendar and timezones

Baseline `7112bd6`. The stay form identifies the device timezone used for entry and shows a differing selected-area timezone when available. A resolved stay shows its elapsed duration, departure and the separate contingency end. Calendar navigation uses timezone-neutral date arithmetic. Local-hour resolution and the UTC search payload use the existing conversion path.

The browser calendar opens on the selected day, exposes full dates and weekday headers, and keeps one day in the Tab sequence. Arrows move by day and week, Home and End move to the ends of the week, and Page Up and Page Down move by month. Shift with Page Up or Page Down moves by year. Escape or Cancel restores the trigger without changing the date. Enter or Space selects the focused day. [W3C date-picker keyboard guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)

## Verification

- A 390 × 844 Chromium journey used America/New_York for entry and selected Palma in Europe/Madrid. It verified focus, full weekday/date labels, selected day state, cross-month keyboard movement, and cancel without changing the date.
- Resolving the second 1 AM on the New York fall overlap retained the preceding 18-hour stay and moved Departure and Contingency end accordingly. When Departure was explicitly edited during an unresolved Arrival, completing Arrival retained the manually chosen departure.
- The request after choosing the first repeated hour used `2026-11-01T05:00:00.000Z` for arrival and `2026-11-02T04:00:00.000Z` for the contingency end. The area timezone traveled separately.
- `node --import tsx --test apps/mobile/src/lib/{localDateHour,formDrafts}.test.ts` passed all 14 tests, including the New York repeated hour and Lord Howe’s half-hour gap and fractional elapsed stay.
- `npm run test:e2e -- -g 'calendar keyboard navigation'` passed. Mobile typecheck and the runtime guard passed on the combined working checkout (7 guard tests, 110 checked modules).

Before and after phone captures and accessibility snapshots are under `.artifacts/quality-q14/`. The browser used an isolated profile, a fixed test date and an intercepted discovery response. Native keyboard and spoken assistive-technology behavior remain unverified.
