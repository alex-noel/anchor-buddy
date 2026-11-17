# App quality execution

Started 17 November 2026 on `codex/app-quality-2026-11-17` from `f7e00acdb9423fb212486931a0cb354e227e41ec`. The user authorized execution of all forty tasks and requested model size and reasoning effort matched to complexity. The runtime supports three concurrent workers plus the integrator.

## Worker routing

| Worker | Model and thinking | Initial assignment |
| --- | --- | --- |
| Visual | GPT-6 Luna, medium | Q01 shared visual tokens |
| Browser quality | GPT-6.1 Sol, medium | Q06 mounted browser harness |
| State and persistence | GPT-6.1 Terra, high | Q08 durable settings commands |
| Integrator | Parent model | Independent reviews, Q33 capture validation, source integration and acceptance |

Subsequent assignments reuse a suitable worker or change model when complexity changes. Tasks use exclusive file leases in the shared checkout. Only the integrator commits. Changes requiring stronger reasoning receive independent review; test-only or source-code success is never reported as physical-device evidence.

## Current checkpoint

- Q01: implementation reviewed; legacy palette compatibility corrected; mounted visual acceptance pending.
- Q06: in progress; isolated browser/export harness, no production fixture flags.
- Q08: in review; settings-v2 repository and asynchronous form saves implemented; pending-input behavior and mounted acceptance being completed.
- Q33: in review; shared caller-bounded fix validation, cancellable watch capture and four focused tests implemented. Native acquisition still needs a device.
- Q36/Q37: native build preflight blocked by missing toolchains; see the [native preflight](../../validation/quality-native-preflight.md). Independent app work continues.
- Other tasks remain planned until their reviewed prerequisites and leases are available.

The manifest and individual briefs will be updated at integration checkpoints. A partially implemented task remains review/blocked, not done.
