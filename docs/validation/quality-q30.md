# Q30 connectivity and evidence freshness

Explore presents offline preference, detected disconnection or network status separately from source retrieval outcome. The active pack's original expiry and matching local cache date remain visible. Retrying retains available evidence while a request is pending; a successful fetch clears the prior pack's cache date until that exact observation is durably cached. A protected older cache does not make the new live observation appear saved.

Manual refresh and the sources sheet share the existing offline/loading/60-second cooldown guard. UI availability updates at the cooldown boundary; the action checks current time again. Search request generation continues to reject cancelled/stale responses. Explicit new searches remain independent user actions.

- `node --import tsx --test apps/mobile/src/lib/evidencePresentation.test.ts apps/mobile/src/lib/connectivity.test.ts`: 6 passed.
- Exported browser `recovery.cases.ts`: expired retained data remains visible during pending retrieval, HTTP 503 failure, disconnection/reconnection and preferred offline mode; cache bytes and original dates remain unchanged. Refresh cannot bypass cooldown or offline preference.
- The same suite verifies protected-cache quota failure and explicit retention change/retry. All three recovery journeys passed at 390×844 using deterministic test responses with external traffic blocked.

These checks establish browser behavior only. They do not establish provider reliability, source suitability or native background operation.
