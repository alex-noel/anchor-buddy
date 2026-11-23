# Q18 result card hierarchy

## Implemented

- Status uses separate icon and plain text: “Checks pass,” “Excluded,” or “Needs more evidence.” Exclusion and insufficient evidence remain distinct without color.
- The first existing assessment reason is shown below status; no assessment ordering or calculation changed.
- The accessible button name uses place name, place kind, readable status and the leading reason. It contains no raw assessment enum or decorative glyph, and its hint says it opens details.
- Name, reason and summary values can wrap. The result card remains the open-details press target and has a 44 px minimum height.
- Unknown depth and price retain their explicit text; zero depth and explicit free status remain distinct. Q22 fee-status propagation is preserved.

## Acceptance and verification

- **Pass by code inspection:** unknown depth/price differs from zero/free; exclusion and insufficient evidence have separate words and icons; accessible label uses natural status wording; text is not clamped to a single line and the card retains its press action.
- **Typecheck:** `npm run typecheck --workspace=@anchor-buddy/mobile` passed.
- **Mounted visual/screen-reader check:** not captured. A task-owned browser tab could not load `http://localhost:8081` (`ERR_CONNECTION_REFUSED`). Phone/desktop long-name matrix and screen-reader smoke remain for integrator review.

Integrator mounted verification: test-only presentation fixtures render real ResultCard at 390×900 and 1280×900, all three statuses, long names, zero depth, unknown depth/price, explicit Free and paid zero. All buttons have readable names, remain clickable, wrap without document overflow. Phone screenshot visually reviewed; SVG icons are stubbed only in this isolated harness (normal app icons verified under Q02). Captures in `.artifacts/watch-ui/watch.cases.ts-cards-and-f-eefd0-adable-on-phone-and-desktop/`. No live evidence or physical screen-reader claim.
