# Q32 validation: Settings organization and action feedback

## Changes

Settings keeps the boat/search, display, map-layer, and offline controls in the primary settings flow while leaving regional API and source details behind disclosure controls. Regional connection, catalogue, and pack-download feedback now live beside their respective actions. A failed connection message names the configured endpoint, explains that it must be reachable from the current device, and points to retry. Catalogue results remain separately visible, including the truthful no-reviewed-packs state. Progress updates during pack verification are not exposed as repeated live announcements; terminal outcomes use status or alert semantics.

No installer, commit/cancel, coordinator, integrity, or source-validity behavior changed. English remains the only available translation, and the AI section continues to state that the capability is unavailable.

## Verification

- `npm run typecheck --workspace=@anchor-buddy/mobile` — passed.
- `npm test --workspace=@anchor-buddy/mobile` — passed, 160 tests.
- Existing browser suite: `npx playwright test --config=e2e/playwright.config.ts` — passed, 12/12.
- Focused browser journey: `npx playwright test --config=e2e/playwright.config.ts e2e/settings.spec.ts` — passed, 1/1. At 390 × 844 CSS pixels, it keyboard-opens Data connection, uses a controlled failed endpoint, checks endpoint-specific retry guidance, retries successfully, and verifies the separate catalogue outcome/no-reviewed-packs message. It also checks that the disclosure remains open and there are no uncaught page errors.
- The focused test attaches failure and retry screenshots as Playwright artifacts (`settings-endpoint-failure-390x844`, `settings-connection-retry-success-390x844`). The endpoint and catalogue responses are controlled browser fixtures, not live-service evidence.

## Remaining review

Desktop layout and native platform rendering were not independently inspected. No physical-device evidence is claimed.
