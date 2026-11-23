# Search form organization

Baseline `ba9bba8` with Q12. New and edited searches start with the area and stay window. Search defaults show a reusable radius and stay duration. Depth, seabeds and operating limits have expandable groups with summaries in the selected units. The footer continues to distinguish Search this area from Save defaults.

The mounted 390 × 844 Chromium journey saved defaults with an 8 m preferred depth, Sand and Mud, and an 18 kt sustained wind limit. Collapsing the groups preserved their values and announced the summaries. An invalid wind limit expanded and focused its group on submit. A new search inherited the saved values, accepted manual coordinates and focused the radius field after an invalid entry. Editing and discarding a changed seabed restored both original selections.

- `npm run typecheck --workspace=@anchor-buddy/mobile` passed.
- `npm run test:e2e -- search-form.spec.ts journeys.spec.ts` passed all 3 tests.
- Before and after captures, viewports and control snapshots are under `.artifacts/quality-q13/`.

Discovery was intercepted with an empty unreviewed region for the mounted tests. Existing canonical values and stay/date semantics remain in use. Native device behavior remains unverified.
