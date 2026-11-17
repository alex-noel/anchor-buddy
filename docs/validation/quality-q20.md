# Q20 details grouped around evidence and next actions

## Implemented in Details

- The top summary shows assessment status, assessment context/time, pack validation state and validity window, and the primary depth/cost facts.
- All excluded reasons and insufficient-evidence reasons are visible before the plan action, in separate groups. All informational reasons remain available in an expandable section. No reason is removed or reordered in the assessment data.
- The existing plan action and `elapsedEvidence` disable condition are unchanged and now sit directly below the status and blocking findings.
- Planning details, weather, access/availability and recorded place limits, cost breakdown, and sources/freshness are progressively disclosed. Missing site limits are not presented as unlimited values.
- Source records retain links and names and now expose source IDs plus their recorded retrieval and expiry dates. Unresolved source IDs remain listed instead of disappearing.
- Assessment context (`current` / `historical`), pack review state, and optional local cache-save time use distinct labels. A cache timestamp never advances source dates.

## Integrator wiring

`Details` accepts optional `evidenceCachedAt?: string | null`. Pass the existing app `savedAt` value at the `<Details>` callsite if it is the cache timestamp for the displayed pack. This worker did not edit `App.tsx`. When absent, the UI makes no cache-origin claim.

## Verification

- Mobile typecheck was run after the Details change. It currently fails at `apps/mobile/src/components/Forms.tsx:822` because `readableFormErrors` is not in scope; no Details errors were reported. This is outside the Q20 lease and appears in concurrently edited Q03 Forms code.
- Mounted detail capture and phone/desktop viewport checks remain for integrator review. No test assessment/pack was injected and no production evidence was fabricated.

Integrator mounted check passed in the isolated component harness at 390×900 and 1280×900. Blocking and missing-evidence reasons remained visible, historical and synthetic context stayed explicit, secondary findings expanded, and cache/source dates remained distinct. No document overflow. Phone capture visually reviewed at `.artifacts/watch-ui/watch.cases.ts-details-pre-c6e09-s-and-separate-source-dates/details-390.png`. Fixtures are enabled solely by this test bundle's explicit alias; normal app/runtime still excludes them. App supplies cache time only when regionData pack ID and version match the assessed pack.
