# Q05 responsive shell and notices

The header now wraps and grows instead of clipping at a fixed height. Watch entry and tabs have sufficient hit areas. Empty Explore places start/search/download actions first and hides result filters until there is an active search. Empty content scrolls for short viewports. Notices expose readable live text separately from the Dismiss message button. Workspace/watch controller transitions are unchanged.

Mounted Chromium checks at 320×900, 390×900, 768×900 and 1280×900 confirmed watch entry and all tabs remain reachable, no document overflow, and no inactive Quick filters in empty Explore. Captures `.artifacts/quality-run/q05-{320,390,768,1280}.png`. Native/large-text matrix remains with Q38; actual 200% shared form/control checks are recorded under Q02/Q04. No active native monitoring claim is derived from the browser.
