# Dispatch and integration

Dependencies in [manifest.json](manifest.json) are authoritative; section order in README groups related work. Q24 deliberately depends on Q25. All tasks start planned. The manifest is a maintained record, not an automatically observed progress tracker.

## First assignments

| Slot | Initial task | Rationale |
| --- | --- | --- |
| A | Q01 | Shared visual contract before screen polish |
| B | Q06 | Mounted test harness can be built independently |
| C | Q08 | Fix acknowledged-save correctness before polishing forms |
| Integrator | Review interfaces and leases | Keep changes small and reserve shared files |

With more capacity, Q33 can run independently of those tasks. Q36/Q37 can begin toolchain preflight early; serialize shared Expo configuration/dependency edits even when platform source is separate.

After these merge, release Q02/Q03, Q07, Q09/Q10 and Q18 when their dependencies and file leases allow. Do not run Q07 alongside other Forms.tsx work. Complete Q08 before Q04, then Q04 before adopting footer/dirty-state behavior in Q12/Q13. Sequence Q12 then Q13 because both edit Forms.tsx.

## Useful lanes after foundations

- **Shared controls:** Q01 → Q02/Q03 → Q04; only one ui.tsx owner at a time.
- **Persistence and forms:** Q08 → Q09/Q10 → Q11; Q07 → Q12 → Q13 → Q14. Respect each brief's additional prerequisites.
- **Results and maps:** Q16 → Q17; Q18 → Q20 → Q21. Q15/Q19 use the shell integration queue. Q22 reserves units/format plus result components.
- **Saved and downloads:** Q25 → Q26, then Q24/Q28 when their other dependencies are met. Q27 and Q29 can run separately if they do not share storage or Settings edits.
- **Offline and Settings:** Q30/Q31, then Q32 after Q09/Q29/Q31.
- **Watch:** Q33 → Q34 → Q35; Q36/Q37 build the platforms and rerun after watch changes.
- **Acceptance:** Q38 and Q39 after their explicit prerequisites, then Q40. Browser acceptance can run while native evidence is blocked; report the distinction.

These are lanes, not blanket permission to run every listed task at once. A task is ready only when every dependency is reviewed/merged and every write path is free.

## Shared-file reservations

| Shared area | Reservation rule |
| --- | --- |
| App.tsx and workspaceController.ts | One shell owner. Worker supplies a small integration patch or obtains the entire lease. Never let parallel tasks rewrite the shell. |
| Forms.tsx and formDrafts.ts | One forms task at a time; Q07/Q08/Q04/Q12/Q13/Q14/Q15 may overlap here. |
| ui.tsx, Sheet.tsx and theme.ts | Freeze shared component interfaces first, then release consumer work. |
| SavedScreen.tsx and workspace.ts | Serialize Q24/Q25/Q26/Q28 integration. |
| SettingsScreen.tsx | Serialize Q09/Q29/Q31/Q32 integration. |
| units.ts and domain format.ts | Serialize Q07/Q21/Q22; domain formulas are not leased for unrelated edits. |
| WatchScreen.tsx and bridge contracts | Q33/Q34/Q35 sequence; one reviewer owns native contract changes. |
| package manifests, lockfile and app.json | One dependency/native configuration owner. |
| e2e directory and CI wiring | One harness owner; Q38/Q39 extend it in separate reserved test files. |

Use isolated branches/worktrees where helpful, but isolation does not remove merge conflicts or prerequisite requirements. Integrate a reviewed task before giving its dependent task a baseline.

## Review and acceptance cadence

Run focused checks per task. After each coherent merged group, run the affected workspace tests and the relevant mounted journeys. Reserve the complete root check, web export and full new suites for an integration checkpoint; repeat only if subsequent changes affect them.

A task that uncovers a larger contract change returns a concrete proposed interface and reproduction to the integrator. It does not expand itself into a rewrite. Native toolchain, signing, physical-device and maritime gates stay explicit. Q40 can issue an interim blocked/partial report while prerequisites are outstanding; it cannot declare the whole plan done.
