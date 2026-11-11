---
id: APP-05
title: "Expose cache budgets, recovery and verified browser updates"
priority: P1
estimate_hours: 10
dependencies: [FOUNDATION-01, FOUNDATION-02, APP-01, APP-02, OPS-02]
lane: app
expert_review: false
external_gate: null
---

# APP-05 — Expose cache budgets, recovery and verified browser updates

Implement a cache-management panel and recovery flow for downloaded maps and evidence. Users must understand what is stored, what is incomplete or expired, and what can be removed without compromising their active context.

Paths beginning components/, screens/ or lib/ are relative to apps/mobile/src/. Other repository paths are given explicitly. Read FOUNDATION-02 before changing any shared contract. Runtime evidence must remain non-synthetic; fixtures belong only in test-only code. Do not weaken safety outcomes, infer provider rights, create accounts or enable the gated AI assistant.

## Current baseline

Read lib/worldMapsCore.ts, worldMaps.ts, worldMaps.web.ts, components/useChartStyle.ts, lib/offlineShell.web.ts, components/MapDownloadsSheet.tsx, scripts/web-offline-worker.js and docs/world-maps.md. Downloads already support coarse-first progress, resume, resource hashes, 3,000 tiles/50 MB per area, local-language fonts, interruption recovery and complete-copy replacement. Those controls were browser-tested in Japan. Do not replace them with a second downloader.

Remaining work is aggregate storage visibility, cross-asset recovery and an understandable browser shell update state. Current per-area caps do not communicate the combined storage used by many areas.

## Ownership and dependencies

Own map cache helpers/adapters listed above, MapDownloadsSheet.tsx, proposed components/CacheManagementPanel.tsx and lib/cacheInventory.ts/tests. APP-06 exclusively owns SavedScreen.tsx; publish the new panel's props instead of editing that screen. The integrator wires Settings/Saved/App shell. APP-02 owns storage repository primitives, which you consume; coordinate any additional method through FOUNDATION-02.

Early preparation may begin after FOUNDATION-02 freezes the contracts: build pure inventory/budget calculations, panel states and test-only adapter doubles. Shared-storage extensions and durable integration wait for APP-02's repository implementation; ask its owner for the required method rather than editing its files. Final provider-budget integration and acceptance wait for OPS-02's implemented shared coordination and unavailable/cooldown contract. Test doubles support early work but do not satisfy that integration gate.

Do not modify domain evidence validity or native watch state. Consume a read-only deletion-protection policy from the controller identifying active/unverified watch and active pack references. Route remote downloads/repairs through the existing API proxy governed by OPS-02's shared provider budget; do not implement another coordinator or add direct-provider/proxy bypasses. Surface its busy/unavailable/cooldown response and preserve resumable state, honoring any explicit retry time without creating an automatic request burst.

## Requirements and steps

1. Build an inventory separating display map areas, cached regional evidence, reviewed pack assets and browser app-shell resources. Show status, known byte usage, source/version, last use/update where actually recorded and expiry where meaningful. Unknown byte usage must remain unknown.
2. Add a 250 MB default user-selected map-cache budget, configurable between 50 and 1,000 MB. This app budget is additional to the existing 50 MB/3,000-tile per-area cap and actual OS/browser availability. Do not promise the OS will retain cached files.
3. Preflight the estimated incremental bytes of a download/update. Count the old complete copy plus staging bytes until activation/cleanup. If required space exceeds budget, ask the user to reduce area/detail or explicitly remove named assets; do not silently evict maps.
4. Query platform free-storage estimates only through supported APIs; when unavailable, report that preflight cannot prove capacity and still catch actual write/quota errors. Preserve partial coarse coverage and the previous complete version.
5. Verify selected manifests/resources on an explicit Repair/Verify action and before use where existing logic requires it. Show corrupt/incomplete state, support resume/refetch for permitted sources, and never mark an unavailable source repaired.
6. Keep active-watch evidence protected when the watch is active or unverified. Deleting a map must not delete its saved search or source evidence; deleting source evidence must not remove profiles/watch logs. Use named confirmation and surface failure without removing the UI row prematurely.
7. Add a browser “Check for app update” status: unsupported/Metro, checking, up to date, verified update waiting, failed/offline. Reuse the integrity-checked service-worker lifecycle. Explain that all Anchor Buddy tabs must close and reopen before activation; do not call skipWaiting or reload while the watch is active/unverified.
8. Prevent shared MapLibre/font/application assets from being counted as verified area coverage unless the area's own manifest references them. Do not broaden offline permissions for scientific WMS/context layers.

## Acceptance criteria

- APP-05-AC01: Inventory separates asset categories and never reports unknown storage/coverage as zero or complete.
- APP-05-AC02: Per-area caps remain enforced and the aggregate budget includes staging plus retained complete maps.
- APP-05-AC03: Budget/quota failure preserves old usable assets and gives an actionable retry/reduce/delete path.
- APP-05-AC04: Corrupt data is detected; repair completion requires verified bytes and a valid manifest.
- APP-05-AC05: Deletion respects active/unverified watch protection and affects only the named asset category.
- APP-05-AC06: Browser update status reflects actual registration/worker state, preserves old complete shell, and never auto-reloads an active watch.
- APP-05-AC07: Interrupted downloads can still resume from Saved with their original area/detail/attribution.
- APP-05-AC08: Cached source expiry never changes simply because it was viewed, verified, repaired or copied.
- APP-05-AC09: Integrated downloads/repairs honor OPS-02's shared busy/unavailable/cooldown responses, retain resumable assets and never fall back to direct provider access or an independent budget.

## Test cases

| ID / AC | Setup and action | Expected result |
| --- | --- | --- |
| APP-05-T01 / APP-05-AC01, APP-05-AC02 | Four 50 MB areas, 30 MB pending update, 250 MB budget; request another 40 MB. | Combined 270 MB request blocked with explicit calculation; existing areas retained. |
| APP-05-T02 / APP-05-AC03, APP-05-AC07 | Write adapter fails after coarse tiles and fonts; restart and resume. | Partial map usable at completed zoom; later resume reaches verified completion. |
| APP-05-T03 / APP-05-AC04 | Corrupt one stored tile/glyph and run Verify then Repair with provider available/unavailable. | Corruption visible; available source repairs hash; unavailable source remains incomplete. |
| APP-05-T04 / APP-05-AC05 | Active/unverified watch references regional pack; attempt deletion, then delete unrelated map after confirmation. | Protected evidence remains; unrelated map alone is removed. |
| APP-05-T05 / APP-05-AC06 | Export A installed, export B published; check update while two tabs use A. | B verified/waiting; A remains usable; normal lifecycle activates B only after old clients close. |
| APP-05-T06 / APP-05-AC06, APP-05-AC08 | Offline update check and expired forecast inventory. | Useful offline state, original forecast deadline unchanged, no false update success. |
| APP-05-T07 / APP-05-AC03 | Platform storage estimate absent and later quota exceeded. | Estimate labelled unavailable; actual write error preserves old active pointer. |
| APP-05-T08 / APP-05-AC07, APP-05-AC09 | Against OPS-02's completed local coordination harness and counting stub provider, begin a download, trigger shared cooldown, then coordinator outage; recover and explicitly resume. | UI reports the actual retry/unavailable state; prior complete and partial assets remain; no direct-provider request or retry burst occurs; resume completes under the shared budget. |

Run mobile typecheck/tests, existing scripts/web-offline.test.mjs through npm run test --workspace=@anchor-buddy/mobile, and export:web. Coordinate actual disconnected-radio/process-restart testing with QA-02.

## Handoff and scope limit

Deliver inventory/budget helpers, panel contract, recovery tests, updated cache documentation and a recorded interrupted update. Estimate 10 hours. No silent LRU eviction, cloud backup, blanket cache deletion, global map bundles or native OTA updater. Stop if provider rights are unclear; leave that layer online-only and identify the exact capability missing.
