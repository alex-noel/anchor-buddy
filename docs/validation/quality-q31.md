# Q31 application readiness and waiting updates

Settings now shows application-file readiness separately from maps/evidence. Native app screens are described as bundled; Metro explicitly does not save an offline browser shell. Exported browser builds can prepare/retry application files and check updates. Read-only lifecycle observation exposes waiting updates without forced reload or skipWaiting.

A waiting verified update explains closing all Anchor Buddy browser tabs and reopening. Failed update installation keeps the prior complete shell ready when it still controls the page, with failure feedback and retry. Readiness requires the exact app-worker URL and root scope; an unrelated service worker never grants readiness. No production worker install/activation algorithm changed.

Terra independently reviewed the status/readiness implementation and identified the foreign-worker case; it was fixed before acceptance. Exported Chromium tests passed 3/3 at 390×844: first verified install, offline reload, waiting update, failed-integrity update preserving prior files and settings, and foreign-worker rejection. Tests run through `e2e/download-harness/playwright.config.ts offline.cases.ts`; version/invalid asset endpoints exist only in its isolated test server. Runtime guard passed 7/7 with 108 repository modules at this checkpoint. Native spoken/physical evidence is not claimed.
