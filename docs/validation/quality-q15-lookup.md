# Location lookup

Baseline `a771390`. Search-sheet location lookup starts only from Find location or keyboard submit. Editing the query, choosing a centre, closing the sheet, going offline or cancelling invalidates the active request and aborts its transport. The current chosen centre and name remain visible while another lookup is attempted. An explicit search carries a chosen match’s name and coordinates without supplying a timezone absent from the response.

The isolated 390 × 844 Chromium journey verified no request during text entry, Enter and button submits, browser abort on changed text and explicit Cancel, suppression of delayed matches, no-match and provider-failure feedback, and disabled lookup offline. A long name wrapped within the result button. After a subsequent lookup and offline transition, the selected area still submitted its actual coordinates and name. Reopening Edit showed the same selected area.

- `npm run typecheck --workspace=@anchor-buddy/mobile` passed.
- `npm run test:e2e -- search-form.spec.ts journeys.spec.ts` passed all 4 mounted tests on the synchronized app and chart checkout.

The geocoder and discovery responses were intercepted in the browser tests. The existing production request and response validation stay in use. Reassessment outcome handling is covered by its own Q15 integration evidence.
