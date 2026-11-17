# Q03 inline validation primitives

## Field API

`Field` now accepts:

- `error?: string` to associate and display an error message.
- `invalid?: boolean` to mark the input invalid when the message is rendered in a form summary or prepared separately.
- `inputRef?: React.Ref<React.ComponentRef<typeof TextInput>>` so a form can focus the input directly without querying native or web internals.

Error text contributes to the accessibility hint together with required state, unit suffix, and help. On web, the input also has `aria-invalid` and references both help and error IDs with `aria-describedby`. On native, `accessibilityHint` announces the same context. Invalid styling uses the shared semantic error color; existing focus ring and 44 px control target remain.

## Validation mapping

`partitionFormErrors(errors)` maps bounded domain field tokens to known editable fields and returns `{ fields, summary }`. `fields` maps to friendly labels/messages for recognized inputs; unknown or unmapped errors remain in `summary`. `readableFormErrors` continues to preserve all messages while translating recognized tokens for existing callers.

## Verification

- Added a focused test for known search/vessel field tokens and preservation of an unrecognized validation message in the summary.
- `npm test --workspace=@anchor-buddy/mobile`: passed (114 tests).
- `npm run typecheck --workspace=@anchor-buddy/mobile`: passed.
- A mounted vessel form was inspected in the task-owned tab at `localhost:8082`, confirming current field label/unit/help exposure. Inline invalid props are not yet consumed by Forms (adoption is assigned to Q12/Q13), so this pass did not exercise an invalid field or record its CSS viewport; an invalid-state mounted check remains open for integrator review after adoption.

Integrator mounted verification: isolated component harness at 390×900 and 1280×900 checks a real Field with required/unit/help/error; `aria-invalid=true` and accessible description include both help and error. No document overflow. Captures in `.artifacts/watch-ui/watch.cases.ts-cards-and-f-eefd0-adable-on-phone-and-desktop/`. Native spoken reader remains part of Q38/device acceptance.
