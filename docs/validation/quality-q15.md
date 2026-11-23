# Q15 lookup and reassessment feedback

Location lookup submits explicitly or on Enter, supports cancellation and invalidates results when the query changes. It retains the selected place name without guessing an unavailable timezone. The focused search-form browser cases cover query edits, cancelled lookup, unavailable service and successful choice.

Saved-search reopening labels the active request as reassessing with the current vessel. A completion notice appears only for the current, uncancelled request, and distinguishes downloaded evidence, retained reviewed data, partial live observations and failed retrieval. An offline synchronous result is not erased by subsequent navigation. Controller generation tests cover stale completions; exported recovery cases verify retained evidence during failed and cancelled retrieval.

Implementation checkpoints: `7112bd6` for lookup; App integration is recorded in the final quality candidate. No new provider or assessment approval is implied by these messages.
