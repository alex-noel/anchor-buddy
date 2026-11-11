# Task index

**34 task briefs · 341 base hours · 249 acceptance criteria · 231 explicit test cases.**

Attach [common worker instructions](WORKER_INSTRUCTIONS.md), the chosen full brief, baseline/prerequisite SHAs and the integrator's file reservation. [DISPATCH.md](DISPATCH.md) controls calendar sequencing and later integration inputs. The days below are targets; external gates can leave required ACs blocked.

| Task | Instruction / outcome | Priority | Hours | Target days | Engineering prerequisites | Expert review |
| --- | --- | --- | ---: | --- | --- | --- |
| [FOUNDATION-01](tasks/FOUNDATION-01.md) | Capture a reproducible baseline and establish worker branches | P0 | 6 | D1–D1 | None | Standard |
| [FOUNDATION-02](tasks/FOUNDATION-02.md) | Freeze versioned evidence, persistence and integration contracts | P0 | 8 | D1–D2 | [FOUNDATION-01](tasks/FOUNDATION-01.md) | Required |
| [DATA-01](tasks/DATA-01.md) | Provider capabilities, coverage and permitted use | P0 | 6 | D2–D3 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md) | Standard |
| [DATA-02](tasks/DATA-02.md) | Harden real ENC extraction and source mapping | P0 | 8 | D4–D5 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [DATA-01](tasks/DATA-01.md) | Required |
| [DATA-03](tasks/DATA-03.md) | Compose immutable regional evidence and display packs | P0 | 10 | D5–D6 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [DATA-02](tasks/DATA-02.md) | Required |
| [DATA-04](tasks/DATA-04.md) | Normalize reviewed tide and current station relationships | P0 | 10 | D4–D5 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [DATA-01](tasks/DATA-01.md) | Required |
| [DATA-05](tasks/DATA-05.md) | Compose spatially bounded forecasts and official warnings | P0 | 10 | D5–D6 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [DATA-01](tasks/DATA-01.md) | Required |
| [DATA-06](tasks/DATA-06.md) | Ingest dated restrictions, habitat and temporary notices | P0 | 8 | D6–D7 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [DATA-01](tasks/DATA-01.md) | Required |
| [DATA-07](tasks/DATA-07.md) | Curate official places, vessel limits and tariff rules | P1 | 8 | D6–D7 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [DATA-01](tasks/DATA-01.md) | Required |
| [DATA-08](tasks/DATA-08.md) | Refresh and publish versioned evidence with regional live checks | P0 | 8 | D8–D9 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [DATA-03](tasks/DATA-03.md), [DATA-04](tasks/DATA-04.md), [DATA-05](tasks/DATA-05.md), [DATA-06](tasks/DATA-06.md), [DATA-07](tasks/DATA-07.md), [OPS-02](tasks/OPS-02.md) | Required |
| [SAFE-01](tasks/SAFE-01.md) | Assess real point and line hazards without weakening full-footprint checks | P0 | 12 | D3–D4 | [FOUNDATION-02](tasks/FOUNDATION-02.md) | Required |
| [SAFE-02](tasks/SAFE-02.md) | Add verifiable equipment guidance selection without invented scope ratios | P0 | 10 | D5–D6 | [FOUNDATION-02](tasks/FOUNDATION-02.md) | Required |
| [SAFE-03](tasks/SAFE-03.md) | Make tariff calculations support source-specific bands and currency precision | P1 | 10 | D6–D7 | [FOUNDATION-02](tasks/FOUNDATION-02.md) | Required |
| [SAFE-04](tasks/SAFE-04.md) | Prove assessment parity across API, browser and native Hermes runtimes | P0 | 10 | D8–D9 | [SAFE-01](tasks/SAFE-01.md), [SAFE-02](tasks/SAFE-02.md), [SAFE-03](tasks/SAFE-03.md), [WATCH-01](tasks/WATCH-01.md), [WATCH-02](tasks/WATCH-02.md) | Required |
| [APP-01](tasks/APP-01.md) | Extract the workspace controller without changing behavior | P0 | 12 | D2–D4 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md) | Required |
| [APP-02](tasks/APP-02.md) | Make profile and default saves durable and recoverable | P0 | 8 | D4–D5 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [APP-01](tasks/APP-01.md) | Standard |
| [APP-03](tasks/APP-03.md) | Make evidence gaps and full-stay forecasts understandable | P1 | 7 | D7–D8 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [APP-01](tasks/APP-01.md) | Standard |
| [APP-04](tasks/APP-04.md) | Keep map markers, list ranks and selections consistent | P1 | 8 | D7–D8 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [APP-01](tasks/APP-01.md) | Standard |
| [APP-05](tasks/APP-05.md) | Expose cache budgets, recovery and verified browser updates | P1 | 10 | D5–D6 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [APP-01](tasks/APP-01.md), [APP-02](tasks/APP-02.md), [OPS-02](tasks/OPS-02.md) | Standard |
| [APP-06](tasks/APP-06.md) | Persist anchor-plan drafts with explicit reassessment | P1 | 8 | D7–D8 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [APP-01](tasks/APP-01.md), [APP-02](tasks/APP-02.md) | Standard |
| [APP-07](tasks/APP-07.md) | Complete accessibility and locale-safe control behavior | P0 | 10 | D7–D9 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md) | Standard |
| [APP-08](tasks/APP-08.md) | Complete native watch readiness and user handoff states | P0 | 8 | D6–D7 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md), [APP-01](tasks/APP-01.md), [WATCH-01](tasks/WATCH-01.md), [WATCH-02](tasks/WATCH-02.md) | Required |
| [WATCH-01](tasks/WATCH-01.md) | Compile and integrate the actual iOS watch | P0 | 12 | D2–D4 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md) | Required |
| [WATCH-02](tasks/WATCH-02.md) | Compile Android and verify foreground-service integration | P0 | 12 | D2–D4 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md) | Required |
| [WATCH-03](tasks/WATCH-03.md) | Execute identical watch scenarios against native engines | P0 | 16 | D4–D6 | [FOUNDATION-02](tasks/FOUNDATION-02.md), [WATCH-01](tasks/WATCH-01.md), [WATCH-02](tasks/WATCH-02.md) | Required |
| [WATCH-04](tasks/WATCH-04.md) | Run controlled physical-device watch trials | P0 | 10 | D7–D10 | [WATCH-01](tasks/WATCH-01.md), [WATCH-02](tasks/WATCH-02.md), [WATCH-03](tasks/WATCH-03.md), [APP-08](tasks/APP-08.md) | Required |
| [OPS-01](tasks/OPS-01.md) | Bound API work and protect request privacy | P0 | 12 | D2–D4 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md) | Required |
| [OPS-02](tasks/OPS-02.md) | Coordinate provider budgets and caches across API replicas | P0 | 16 | D3–D5 | [FOUNDATION-02](tasks/FOUNDATION-02.md), [DATA-01](tasks/DATA-01.md) | Required |
| [OPS-03](tasks/OPS-03.md) | Prove portable deployment, backup and rollback | P0 | 14 | D6–D9 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [OPS-01](tasks/OPS-01.md), [OPS-02](tasks/OPS-02.md), [DATA-03](tasks/DATA-03.md) | Required |
| [OPS-04](tasks/OPS-04.md) | Remediate dependencies and make verification reproducible | P1 | 12 | D1–D9 | [FOUNDATION-01](tasks/FOUNDATION-01.md) | Required |
| [QA-01](tasks/QA-01.md) | Add repeatable browser end-to-end coverage for the complete user journey | P0 | 12 | D4–D9 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [APP-01](tasks/APP-01.md) | Standard |
| [QA-02](tasks/QA-02.md) | Exercise offline, interrupted update and storage-failure journeys | P0 | 10 | D7–D9 | [QA-01](tasks/QA-01.md), [APP-05](tasks/APP-05.md) | Standard |
| [QA-03](tasks/QA-03.md) | Prepare the pilot evidence dossier and obtain qualified maritime review | P0 | 10 | D8–D10 | [DATA-02](tasks/DATA-02.md), [DATA-03](tasks/DATA-03.md), [DATA-04](tasks/DATA-04.md), [DATA-05](tasks/DATA-05.md), [DATA-06](tasks/DATA-06.md), [DATA-07](tasks/DATA-07.md), [SAFE-01](tasks/SAFE-01.md), [SAFE-02](tasks/SAFE-02.md), [SAFE-03](tasks/SAFE-03.md) | Required |
| [QA-04](tasks/QA-04.md) | Integrate the sprint and issue an evidence-based internal-alpha go/no-go | P0 | 10 | D1–D10 | [FOUNDATION-01](tasks/FOUNDATION-01.md), [FOUNDATION-02](tasks/FOUNDATION-02.md) | Required |

## External gates

A task with external gates can have correct merged engineering while required ACs remain blocked. It must not be marked done or activate an unapproved capability.

- **[DATA-01](tasks/DATA-01.md):** Provider rights that cannot be established from official terms remain unknown until operator review.
- **[DATA-02](tasks/DATA-02.md):** Maritime validation of datum, survey quality and omitted hazard semantics is required before coverage approval.
- **[DATA-03](tasks/DATA-03.md):** Qualified maritime, coverage, geometry, station and on-water approvals must exist before the existing live-assessment release gate can pass.
- **[DATA-04](tasks/DATA-04.md):** A qualified reviewer must supply or approve station-area validity, datum conversion and bounded water-level uncertainty before analytical coverage is enabled.
- **[DATA-05](tasks/DATA-05.md):** Model/grid applicability and warning coverage need qualified review before centre-point forecasts become full-footprint assessment evidence.
- **[DATA-06](tasks/DATA-06.md):** A qualified local maritime reviewer must resolve jurisdiction, rule applicability, habitat completeness and current notices; source collection alone cannot approve them.
- **[DATA-07](tasks/DATA-07.md):** Only attributable operator or municipal facts with permitted reuse can become verified records; ambiguous tariffs and maritime operating limits require review.
- **[DATA-08](tasks/DATA-08.md):** Publication to a live reviewed catalogue remains blocked until all required source rights and genuine maritime/on-water attestations are present.
- **[SAFE-01](tasks/SAFE-01.md):** Qualified review of geometry uncertainty assumptions is required before real recommendations can pass.
- **[SAFE-02](tasks/SAFE-02.md):** An applicable manufacturer/operating source and qualified review are required to enable a real guidance entry.
- **[SAFE-04](tasks/SAFE-04.md):** Runnable iOS and Android test builds are required for native parity completion.
- **[APP-07](tasks/APP-07.md):** Physical iOS and Android builds are required for final keyboard and screen-reader evidence.
- **[APP-08](tasks/APP-08.md):** Installed iOS/Android builds and a person able to verify audible alerts; simulated sound is not acceptance evidence.
- **[WATCH-01](tasks/WATCH-01.md):** Full Xcode/iOS SDK and CocoaPods; physical installation additionally needs an existing signing identity and device.
- **[WATCH-02](tasks/WATCH-02.md):** Supported JDK, Android SDK/emulator and an available physical device for later acceptance.
- **[WATCH-04](tasks/WATCH-04.md):** Physical iOS and Android devices plus human observers; two 8-hour trials per platform. On-water work additionally requires QA-03 clearance.
- **[OPS-02](tasks/OPS-02.md):** Local PostgreSQL integration-test capability; operator-approved provider policy configuration for live use.
- **[OPS-03](tasks/OPS-03.md):** Docker/Compose; already authorized staging access is required only for staging validation.
- **[OPS-04](tasks/OPS-04.md):** Native CI verification needs suitable runners and WATCH-01/02/03 command evidence; no new account or paid runner purchase.
- **[QA-02](tasks/QA-02.md):** Native offline-device checks require runnable native builds; browser fault tests can complete independently.
- **[QA-03](tasks/QA-03.md):** Qualified local maritime reviewer, source rights and human-controlled on-water validation must be supplied; no automatic approval.
- **[QA-04](tasks/QA-04.md):** Any public recommendation/watch release remains gated on actual maritime and device approvals.
