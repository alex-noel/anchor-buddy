# Q09 verification

Baseline checkpoint: `e1595a0`. No commit created by the worker.

- Per-field commands are queued through the Q08 repository. Each command modifies only its own preference; layer writes merge with the current stored layers. The UI retains session intent while pending or unsaved, and Settings shows pending or failure and Retry beside the relevant control. Failures initiated elsewhere also show a message pointing to Settings.
- Setup completion no longer writes preference values from a possibly stale render; it preserves the repository's latest committed preferences. Q11 owns further setup lifecycle work.
- `node --import tsx --test apps/mobile/src/lib/preferenceCommands.test.ts`: passed delayed combined writes, retry after failure, out-of-order result notification, and unchanged vessel/search values on unit changes. Repository serialization prevents older writes from completing after newer committed writes.
- `npm run typecheck --workspace=@anchor-buddy/mobile`: passed after a concurrent SelectField type error was resolved by its owner.
- `npm run test --workspace=@anchor-buddy/mobile`: passed 109 tests in the shared checkout.
- Integrator mounted review passed at 390×844 using an isolated browser context: failed unit preference write showed unsaved session intent beside the control, kept the previous durable units, and Retry persisted the selection across reload. No uncaught page errors. Physical-device/native-watch verification is not claimed. No watch module action is called by the preference command path.
