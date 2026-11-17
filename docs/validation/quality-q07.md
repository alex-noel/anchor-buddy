# Q07 exact conversions

Baseline: `e56f7c4` with reviewed Q01/Q08 edits present.

## Conversion consumers updated

- Domain `formatDepth` and `formatDistance` now use `CANONICAL_CONVERSIONS` for feet, kilometres per nautical mile, and statute miles per nautical mile.
- Mobile `depth`, `distance`, and `wind` display helpers use the same frozen factors.
- Search form distance, speed, and length inputs use the same factors when labelling and parsing metric/imperial values. Metric dimensions remain canonical metres; imperial lengths use the exact feet-per-metre ratio.
- Map download radius input and display uses the exact kilometre/statute-mile ratios. Untouched rounded drafts retain `referenceNm`; changed values convert once on read.
- Vessel profile length and mass fields use exact feet/metre and pounds/kilogram factors and reuse `parseUnitDraft` so unedited rounded values retain their original canonical number. An unconfigured vessel's zero bow roller height now displays and remains zero rather than being rendered blank.
- Added the exact international pound definition (`0.45359237 kg/lb`) to the frozen constants; this is backwards-compatible and does not change existing contract fields.

## Verification

- Added numerical checks for unit display factors, untouched/edited form values, zero bow height draft preservation, repeated map radius unit toggles, and the frozen canonical tolerance.
- Focused test/typecheck results are included in the worker handoff.
- No assessment formula, safety threshold, rounding policy, or public contract constant was changed.
