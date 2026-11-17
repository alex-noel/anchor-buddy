# Q39 exported save and offline recovery

The final production browser recovery suite passes 8/8 at 390×844. It uses real exported application and service-worker code, temporary loopback servers, blocked external traffic and deterministic test-only provider/storage failures.

| Path | Observed result |
| --- | --- |
| Map download | Metadata preparation, coarse usable tiles, pause, resume and completion are separate. Saved downloaded tiles open with offline preference enabled. |
| Evidence failure after map completion | The map stays saved; evidence retrieval reports its separate failure and retry. |
| Partial map deletion | Files are actually removed before an injected failure. The durable cleanup marker survives reload, opening missing assets is disabled, retry removes the remainder and focus returns to Saved. |
| Exported shell | Verified first install reloads with the browser context actually offline. A waiting good update does not force activation. A failed-integrity update keeps the previous verified shell and settings. A foreign service worker does not count as readiness. |
| Expired evidence | Pending retrieval, failed provider response, disconnect/reconnect and preferred offline mode retain original dates and bytes. Manual retry respects cooldown. |
| Protected cache capacity | A failed ninth automatic entry preserves all eight protected records. Explicitly allowing one record to be cleaned up permits retry and preserves the other seven after reload. |
| Regional install | Explicit cancel and navigation during pre-commit transfer preserve the prior pointer. A committed write with lost acknowledgement is resolved by pointer readback; referenced assets remain and reload restores the new region. |

Production Planner tests separately cover failed draft save/retry, stable identity, reload, changed-vessel/source notice, expired-date review, first draft creation and offline reopening. Shared form tests cover rejected profile/default/preference writes. The initial combined Planner run accidentally discovered the independent mock-map harness and raced the deferred GPS fixture; the test configuration now excludes that harness and awaits the injected GPS callback before cancellation. These were harness issues, not skipped assertions.

Commands and final logs are in `.artifacts/quality-final/`: `recovery.log`, `planner.log`, `journeys.log`, and `watch.log`. The regional approval fields in controlled test fixtures are not real nautical approval and are never bundled in production. Native storage, downloads, GPS and background operation remain separate acceptance gates.
