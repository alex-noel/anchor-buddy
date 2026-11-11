---
id: OPS-03
title: "Prove portable deployment, backup and rollback"
priority: P0
estimate_hours: 14
dependencies: [FOUNDATION-01, OPS-01, OPS-02, DATA-03]
lane: ops
expert_review: true
external_gate: "Docker/Compose; already authorized staging access is required only for staging validation."
---

# OPS-03 — Prove portable deployment, backup and rollback

## User instruction

Make the container stack reproducibly operable as a controlled internal alpha: API, optional PostGIS/coordinator, immutable regional packs and bounded live caches. Demonstrate startup, restricted operation, backup/restore and rollback on a disposable local or already authorized staging environment. Do not deploy publicly, purchase infrastructure or claim a cloud account exists.

**Estimate:** 12–16 worker-hours. **Scheduling:** Use the dependency gates and target window in `DISPATCH.md`; early read-only preparation is allowed. **Dependencies:** FOUNDATION-01, OPS-01 request/health contracts, OPS-02 coordination migration/configuration and DATA-03 pack layout. Container preparation can start after interface freeze; final validation waits for those inputs. DATA-08 owns source-refresh job logic; you own running/configuring it and recovering deployment state.

## Baseline and ownership

Read `infra/compose.yaml`, `Dockerfile.api`, `Dockerfile.ingest`, `001-schema.sql`, `infra/README.md`, `apps/api/src/index.ts`, `database.ts`, `.env.example`, `apps/api/src/packs.ts`, `workers/ingest/anchor_ingest/postgis.py` and ingestion publication docs. Current Compose runs PostGIS 17/3.5, a Node 24 API, and an optional GDAL ingestion container; packs are read-only in the API. It is not proof of production operations. API startup currently does not make the optional database a universal prerequisite. The live cache needs deliberate persistent mounting, not an untracked container layer.

Own `infra/**` except OPS-02's assigned migration and any DATA-owned refresh implementation, proposed `scripts/ops/**`, and `docs/operations/**`. Do not edit provider/domain/mobile implementations. Coordinate `.env.example`, Docker dependency files and GitHub workflows with OPS-04/integrator. Use placeholders only in tracked configuration.

## Required implementation

1. Define deployment modes: single-process development, bounded internal shared deployment, and offline/read-only pack service. State required versus optional dependencies. Supply pinned version/digest provenance and health/readiness checks that reflect the selected mode without equating provider availability with nautical safety.
2. Persist packs, bounded live cache and required database/coordinator state in named volumes or documented object-store adapters. Preserve immutable region/version keys and atomically change only the reviewed current-version pointer. API has read-only pack access; ingestion/publishing is an operator action with a separate identity/mount.
3. Harden service defaults: run suitable images as non-root, restrict writable paths, omit public database ports, drop unnecessary capabilities, and expose only intended API/ingress ports. Use trusted HTTPS at the deployment boundary. Do not disable certificate verification to make phone testing work.
4. Add a migration runner with version tracking and an explicit lock. Initial database bootstrap is not a substitute for upgrades. Fail startup/readiness safely when the selected shared mode requires a missing/incompatible migration; keep development mode documented. Do not put passwords in commands, build arguments, images or logs.
5. Implement backup and restore instructions/scripts for database metadata and immutable pack/current-pointer state. Include source manifests/hashes and software schema versions. Test restore into fresh isolated volumes and compare identities/hashes; copying files without restoring a working service is not sufficient.
6. Implement deployment rollback without overwriting old packs or rewriting their dates. Revert the app image/current pointer to a compatible version, retain forward-created immutable data, and detect incompatible schema rollback before it corrupts state. Keep a failed staged download/publication from replacing the previous complete pack.
7. Exercise bounded disk-full, database unavailable, cache corruption, ingestion failure, expired sources and restart behavior. Surface actionable operational health without exposing user coordinates/credentials. Include explicit storage quotas and cleanup ownership.

## Acceptance criteria

- **OPS-03-AC01:** A documented clean setup starts the chosen internal-alpha mode from locked source/images and reports mode-appropriate liveness/readiness.
- **OPS-03-AC02:** API cannot mutate published packs; database and operator publication are not unintentionally exposed.
- **OPS-03-AC03:** Required data/cache state survives container recreation without refreshing evidence timestamps.
- **OPS-03-AC04:** Versioned migrations apply predictably and concurrent/missing/incompatible migration states fail safely.
- **OPS-03-AC05:** A fresh isolated restore serves the same verified region/version/hash and correct metadata as the backup.
- **OPS-03-AC06:** Rollback and failed publication leave the prior complete compatible release available; old immutable versions remain intact.
- **OPS-03-AC07:** Outage/disk/corruption cases have bounded, truthful outcomes and redacted operational evidence.
- **OPS-03-AC08:** Deployment instructions contain no actual secrets, paid-account assumptions or public-release authorization.

## Test cases

| ID | Setup/action | Expected result / AC |
| --- | --- | --- |
| OPS-03-T01 | New isolated Compose project/volumes, supply local secrets privately, build/start and call health/readiness. | Documented service set healthy for selected mode; no required hidden manual patch; AC01. |
| OPS-03-T02 | Attempt pack write from API identity; inspect exposed ports and database access. | Write denied; no public database/operator port; AC02. |
| OPS-03-T03 | Cache dated real evidence, recreate API containers and reload it. | Original retrieval/expiry and immutable pack identity preserved; AC03. |
| OPS-03-T04 | Apply migration twice/concurrently, then start shared mode with missing schema. | Idempotent version handling/lock; explicit refusal or unready state when required; AC04. |
| OPS-03-T05 | Back up, restore into fresh named volumes, verify manifests/rows and serve a known real pack. | Matching identities/hashes and valid app responses; AC05. |
| OPS-03-T06 | Inject failed publication, switch to new compatible image/version, then rollback. | Prior complete version remains usable; no partial pointer or timestamp rewrite; AC06. |
| OPS-03-T07 | Stop DB, fill bounded scratch volume, corrupt cache and restart worker independently. | Controlled degraded/unready states, old complete packs retained, no secret leakage; AC07–08. |

Existing starting commands: `docker compose -f infra/compose.yaml config`, `docker compose -f infra/compose.yaml build`, and `docker compose -f infra/compose.yaml up`. Run with a unique disposable project name and no real production volumes. New migration/backup/restore/rollback commands are deliverables; each must support explicit target identity and refuse ambiguous destructive targets.

## Handoff and non-goals

Deliver redacted deployment manifest, successful restore/rollback transcript, hashes, runbook and failure matrix. Provide actual CPU/memory/storage observations for the tested workload without claiming production capacity. Production cloud provisioning, public DNS exposure, signing/payment setup, legal/provider acceptance and source maritime approval are outside this task. If staging access is unavailable, complete local proof and mark staging verification blocked.
