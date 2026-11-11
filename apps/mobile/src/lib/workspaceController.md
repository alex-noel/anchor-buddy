# Workspace controller integration contract

`useWorkspaceController` owns the in-memory `WorkspaceState`, its reducer dispatch, the current request generation and its abort controller. `App.tsx` remains the effects adapter for local storage, regional discovery, derived assessment, map downloads, connectivity and native status. Screens receive values and callbacks; they do not own a second active search, draft or selected pin. The state contains candidate identity and an allowance, not an Assessment. Assessment uses the current pack, vessel, search and assessment time; a removed/moved place fails closed through `reassessSelection`. No transition invokes a native watch command.

## Transition table

| Current view | Action | Result |
| --- | --- | --- |
| Any base tab, including empty Explore | `changeTab(tab)` | Base view on tab, close detail and pin selection; active search and watch session retained. |
| Empty Explore, preview, active results, or plan | `beginSearch(draft, area, restore?)` | Search sheet; draft and optional saved pin/filters isolated from active state. Area has confirmation, optional name/timezone. |
| Search sheet | `cancelSearch` | Close draft and discard restore payload; active search, selection, filters and area unchanged. Outside search sheet it is a no-op. |
| Search sheet or saved-search reopen | `commitSearch(search, area?, filters?, pin?)` | Activate search and area together, clear plan/details/suggestion and preview, restore optional filters/pin, go to Explore. The effect adapter starts discovery with this same search/name/timezone tuple. |
| Any | `closeSearch` | Clear active search, preview, pin, details, plan, watch suggestion and draft; no native watch command. |
| Active results or plan | `openDetails(selection, search)` | Open details for candidate and allowance, with optional plan search. Assessment is recomputed from current data. |
| Details | `closeDetails` | Close details; outside details a no-op. |
| Details | `openPlan(plan)` | Close details and enter plan with candidate, search and allowance. |
| Any | `showWatch(setup?)` | Show watch route, optionally with an unconfirmed suggestion. Existing native session is independent. |
| Any profile commit | `commitProfile` | Clear plan and watch suggestions; return from plan to base. Native status/session is unchanged. |
| Saved map/region | Shell opens preview by clearing search and setting preview area, map view and Explore tab. No discovery or watch command is implied. |
| Setup | `openModal(profile/defaults)` | Child modal records `parent: setup`; closing returns to setup. |
| Any modal | `openModal(name)` / `closeModal(name)` | One modal at a time. Opening replaces the current modal, except setup child records its parent. Closing a non-current modal is a no-op. Modal names: setup, profile, defaults, search, advanced, layers, download, data, detail, save and tour. Setup display additionally waits for a known non-active, non-problem native watch status. |

`set(key, value)` is a typed field update adapter for existing rendering callbacks (filters, preview, view and intermediate form transitions). It does not persist. `dispatch` supports the discriminated actions above plus `set`. `state` exposes the values; `modal(name, open)` wraps modal actions. Effects must not treat a selection or plan suggestion as a confirmed anchor.

## Request and effect ownership

`RequestGeneration.begin()` identifies a source request; `current(id)` guards its completion. `cancel()` invalidates and aborts on offline/cancel/close; hook cleanup calls `dispose()` and aborts. `ActivationQueue.activate(value, predicate)` serializes the existing `active-region` pointer writes, checks before and after the asynchronous write and restores the previous pointer when a cancellation races a write. `remove()` is serialized with these writes. Cache versions can be stored independently but never activated by an invalid generation. Compensation depends on storage remaining writable: a second storage failure or process termination during the write/restore interval cannot be made crash-atomic by this adapter; APP-05/storage must provide a transactional conditional activation mechanism for that guarantee.

Hydration, settings writes, cache serialization, refresh timers, native status polling/subscription and assessment recomputation remain in `App.tsx`. The controller's cleanup aborts discovery and never arms, stops or recentres native monitoring. `WatchScreen` owns explicit native actions. APP-02 must provide durable settings commits; this change does not change their format or claim atomic settings saves.
