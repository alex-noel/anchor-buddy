# Q11 verification

Baseline is Q10 in the shared checkout following `09e783a`; no worker commit.

- `setupComplete` is an additive optional v2 settings field. Completion commits one complete settings record, requires existing valid and confirmed vessel/defaults, and does not write the old setup marker. An in-flight lock prevents duplicate completion requests; preference changes must finish or be retried before completion.
- Old envelopes without the field and absent envelopes read the retained `setup-complete-v2` marker. A true marker is honored only with both valid and confirmed steps. The next settings commit writes the resolved completion field; subsequent reads ignore the retained marker. Corrupt or unsupported required migration inputs block writes. Existing values and original bytes are retained.
- Setup shows committed step summaries, the next required step, and unit-save pending/error/retry. Review can return to Settings. Onboarding and the tour are suppressed while Watch is shown or active/unverified; no watch command is issued by setup.
- `node --import tsx --test apps/mobile/src/lib/setupCompletion.test.ts apps/mobile/src/lib/startupRecovery.test.ts apps/mobile/src/lib/settingsPersistence.test.ts`: 14 passed before unrelated parallel additions, covering missing inputs, delayed and failed completion, reload/retry, idempotence, legacy migration, malformed records and rejected/incomplete markers.
- `npm run test --workspace=@anchor-buddy/mobile`: 120 passed in the shared checkout.
- `npm run test --workspace=@anchor-buddy/domain`: 91 passed.
- `npm run typecheck --workspace=@anchor-buddy/mobile`: Q11 edits initially typechecked; latest rerun is blocked by concurrently missing `src/components/Details.tsx` (TS2307), outside this lease. Re-run after its owner restores it.
- Mounted setup failure/retry/reload and review/watch checks, viewport inspection and independent review remain with the integrator. Native watch verification is not claimed.

Integrator mounted review passed at 390×844 in an isolated browser context: setup completion write failure retains both saved steps, reload resumes and retry completes; later reload stays completed; reopening setup can return to Settings. With corrupt optional evidence, the saved vessel and saved trip remain readable, original bytes stay unchanged and Watch remains accessible. Future-version settings show recovery rather than onboarding, retain bytes, and Watch remains accessible; per-category retry recovers after storage becomes readable. No browser page errors. Capture `.artifacts/quality-run/q10-recovery-watch390.png`. Native access is not claimed by this web check.
