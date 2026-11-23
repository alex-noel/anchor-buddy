# Browser journey checks

After installing the locked workspace dependencies with `npm ci`, provision the matching Chromium once with `npm exec --workspace=@anchor-buddy/mobile -- playwright install chromium`. A Linux host missing Chromium system libraries also needs Playwright's `install-deps chromium` setup.

Run from the repository root:

```sh
npm run test:e2e
```

Once the dependencies and browser are installed, the run needs only loopback access. It builds the normal Expo web entry into a temporary directory, serves it on `127.0.0.1:18082`, and removes the export and stops its server on exit. The runner refuses to reuse an existing server. It opens a fresh Chromium context for each test, without loading an existing browser profile or storage state. External requests are blocked and service worker registration is disabled in the test contexts to keep requests interceptable.

The suite completes vessel and defaults setup in the UI, checks empty Explore after setup and reload, and verifies that browser watch displays its native-only boundary with no arming or alarm controls. It also checks missing-area validation, draft cancellation without discovery, cancellation of a pending discovery request, saving and closing the search, and opening the stored snapshot after reload for reassessment. Discovery responses are intercepted by Playwright. The saved search has zero results derived from an empty, unreviewed region with no nautical sources.

Failures exit nonzero. Look in `.artifacts/e2e/` before running again. Failed journeys retain a screenshot, Playwright trace, and control context. Uncaught page exceptions also include the error stack. Open a saved trace locally with `npm exec --workspace=@anchor-buddy/mobile -- playwright show-trace /absolute/path/to/trace.zip`.

## Validation

Baseline `f7e00acdb9423fb212486931a0cb354e227e41ec`. Verified with headless Chromium 158.0.8127.18 at a 1280 × 900 CSS pixel viewport on macOS 15.7.7 arm64, Node 24.6.0 and Playwright 1.65.0.

| Acceptance criterion         | Evidence                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline, repeatable journeys | The suite uses a loopback export, fresh browser contexts and test-runner interception. Both journeys passed on successive runs.                                                                   |
| Fixture isolation            | Test-only routes return the empty region or hold the pending response. The Expo entry point and API handlers have no changes. `npm run check:runtime` passed.                                     |
| Failure artifacts            | A temporary test that threw asynchronously in the page failed the run with the exception and control snapshots, a 1280 × 900 screenshot and a trace. The probe was removed.                       |
| Owned lifecycle and storage  | Setup started from an unconfigured browser context in each journey. Reload retained setup and the saved search within the context. Each run removed its temporary export and released port 18082. |

This suite covers mounted browser behavior. Native watch behavior and service worker caching have separate checks.
