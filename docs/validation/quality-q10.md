# Q10 verification

Baseline checkpoint `09e783a`; no worker commit.

- Startup independently reads settings, setup, saved searches, regional cache and active region. Missing, invalid, unsupported-version and unreadable results remain distinct; readable entries in a partially invalid list are shown while the original bytes are retained. Retry is available by category. Automatic setup is deferred while any startup category needs recovery; watch access remains available during reads and recovery.
- Legacy settings migration now reads original bytes and refuses malformed, invalid or future-version legacy records. The authoritative `settings-v2` record remains the settings source; neither migration nor recovery deletes source keys. Writers for affected saved searches, evidence, active region and setup marker are blocked when their category requires recovery. The Settings installer checks the active-region guard before download and at commit.
- `node --import tsx --test apps/mobile/src/lib/startupRecovery.test.ts apps/mobile/src/lib/settingsPersistence.test.ts`: 8 passed, covering rejected reads, malformed cache, valid vessel and saved library, unknown versions, retry, legacy corruption and retained bytes.
- `npm run typecheck --workspace=@anchor-buddy/mobile`: passed.
- `npm run test --workspace=@anchor-buddy/mobile`: 113 passed in the shared checkout.
- Mounted recovery/retry and watch-access inspection, viewport measurements, and independent review remain with the integrator. Native watch behavior is not device-verified here. Retry rereads after a transient failure or external repair; there is deliberately no destructive reset or deletion action.

Integrator mounted review passed at 390×844 in an isolated browser context: setup completion write failure retains both saved steps, reload resumes and retry completes; later reload stays completed; reopening setup can return to Settings. With corrupt optional evidence, the saved vessel and saved trip remain readable, original bytes stay unchanged and Watch remains accessible. Future-version settings show recovery rather than onboarding, retain bytes, and Watch remains accessible; per-category retry recovers after storage becomes readable. No browser page errors. Capture `.artifacts/quality-run/q10-recovery-watch390.png`. Native access is not claimed by this web check.
