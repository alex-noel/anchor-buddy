# Q17 map and list result presentation

Started from shared baseline `e40e985` and reviewed against the integrated Q16 renderer changes. The main Explore chart and list receive the same display entries for rank, status and selected identity. The chart shows ranks 1–50, adds a selected result beyond that boundary and identifies the extra marker in the legend. A manual pin uses its own diamond symbol and leaves the ranked result count unchanged. Selection adds a visible outline while the marker keeps its assessment color, glyph and accessible status label. The selected place card shows the same status in text.

## Verification

- `node --import tsx --test apps/mobile/src/lib/{chartLoad,mapStyle,resultPresentation}.test.ts` passed 13 focused tests. The 55-result case checks the rank boundary, a selected result beyond it, re-ranking, filter removal and an unnumbered manual pin.
- `npm run test:e2e -- chart.spec.ts` passed both production-entry tests on macOS 15.7.7 arm64, Playwright 1.65.0 and Chromium 158.0.8127.18 at a 390 × 844 CSS pixel viewport. The ranking test intercepts 52 place records, selects rank 52 in the list, sees rank 52 plus its selected marker and status, then sorts it to rank 1 in both views. Filtering to docks removes the marina’s selected marker. A new manual pin appears separately while the button still reports 51 results. The rank-52 capture is in `.artifacts/quality-q17/selected-rank-52-390x844.png`.
- The legend explains the rank numbers, selection outline, manual pin diamond and status symbols. The displayed ranks and counts come from existing search output. The tests use controlled fixture results and map responses, with no live nautical or provider verification.

No state migration is needed. MapLibre Native marker rendering, attribution, touch and accessibility checks remain pending Q36/Q37.
