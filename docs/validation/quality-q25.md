# Q25 verification

- Saving at capacity requires selecting the exact named existing snapshot; the dialog previews its UTC save timestamp and vessel and provides Cancel. The operation re-reads durable searches, performs one complete replacement write, and publishes only after success. The selected snapshot remains intact on failure or cancellation.
- Existing historical notices and separate Open & reassess / View saved snapshot actions remain. Saved entries show UTC date/time and ended stays. Oversized legacy libraries are read without truncation and must be reduced to 30 or fewer before a new save.
- `node --import tsx --test apps/mobile/src/lib/savedCapacity.test.ts apps/mobile/src/lib/workspace.test.ts`: 7 passed, covering at-capacity rejection, exact replacement, unchanged source, reload and oversized legacy preservation.
- `npm run typecheck --workspace=@anchor-buddy/mobile`: passed.
- Mounted at-capacity save/cancel/replace, empty/mixed library, long-name wrapping and viewport inspection remain with the integrator.

Integrator mounted review passed at 390×844: the 30-item library disables Save until an exact existing item is selected; Cancel preserves all 30; an injected atomic storage failure preserves all original records; retry replaces only the chosen ID and retains 29 originals; reload shows the new record. Capture `.artifacts/quality-run/q25-capacity-failure390.png`, result `.artifacts/quality-run/capacity-review.json`. No browser errors.
