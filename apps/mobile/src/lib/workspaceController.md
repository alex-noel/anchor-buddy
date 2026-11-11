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
| Any / saved map or region | `openPreview(area, name?, timezone?)` | Clear prior search and selection, set preview area and metadata, select Explore map. Caller cancels outstanding discovery first. |
| Preview without active search | `closePreview` | Clear preview and metadata; outside preview it is a no-op. |
| Any | `changeView(view)` | Select map or list without modifying active search or watch. |
| Plan or watch | `back` | Return watch to plan when a plan exists, otherwise return to base. |
| Evidence removed | `invalidateEvidence` | Clear detail, plan and watch suggestion, return to base; do not touch native watch. |
| Setup | `openModal(profile/defaults)` | Child modal records `parent: setup`; closing returns to setup. |
| Any modal | `openModal(name)` / `closeModal(name)` | One modal at a time. Opening replaces the current modal, except setup child records its parent. Closing a non-current modal is a no-op. Modal names: setup, profile, defaults, search, advanced, layers, download, data, detail, save and tour. Setup display additionally waits for a known non-active, non-problem native watch status. |

`set(key, value)` is an internal, key-correlated field update adapter for existing shell callbacks (filters, selection and intermediate form transitions). It does not persist and is not part of the public `WorkspaceAction` union. Public `dispatch` accepts the named actions above. `state` exposes the values; `modal(name, open)` wraps modal actions. Effects must not treat a selection or plan suggestion as a confirmed anchor.

## Action test coverage

The `workspaceController.test.ts` tests exercise every public action: `openModal`/`closeModal` through setup child and bridge scenarios; `changeTab`, `openDetails`, `closeDetails`, `openPlan`, `showWatch`, `back`, `invalidateEvidence`, and `changeView` through detail/plan and detail-context cases; `beginSearch`, `cancelSearch`, `commitSearch`, `closeSearch` through draft, reopen and bridge cases; `commitProfile` through plan invalidation and bridge cases; and `openPreview`/`closePreview` through the preview case. Named actions are in the exported `WorkspaceAction` union with typed payloads. `closeDetails`, `cancelSearch`, `closePreview` and closing a non-current modal have no-op cases. Reducer tests do not replace the mounted user journey.

## Request and effect ownership

`RequestGeneration.begin()` identifies a source request; `current(id)` guards its completion. `cancel()` invalidates and aborts on offline/cancel/close; hook cleanup calls `dispose()` and aborts. `cacheCurrentEvidence` permits an already-started cache write to finish but only hands its result to a current request. Live discovery updates current in-memory evidence and the regional evidence cache; it does not write the durable `active-region` pointer. That pointer changes only through existing explicit save/install/remove operations. This intentionally changes the former automatic discovery persistence: after restart, the explicitly saved region remains the active pointer. There is no rollback of cached evidence.

Hydration, settings writes, cache serialization, refresh timers, native status polling/subscription and assessment recomputation remain in `App.tsx`. The controller's cleanup aborts discovery and never arms, stops or recentres native monitoring. `WatchScreen` owns explicit native actions. APP-02 must provide durable settings commits; this change does not change their format or claim atomic settings saves.


`observeWatchStatus` accepts only `getStatus` and `subscribe`; it orders polling against pushed status events and invalidates late reads on background or disposal. The shell owns foreground timing and presentation. `cancelWorkspaceRequest` and `disposeWorkspaceRequest` invalidate the request generation and abort discovery; they do not receive a watch bridge. A native bridge spy test exercises these production adapters and reducer transitions, not an installed native service.
