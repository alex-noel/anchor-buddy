# Global map display and selected-area downloads

The map uses OpenFreeMap vector tiles for worldwide geographical context. Regional depth bounds, holding evidence and hazards are separate assessment inputs. Browsing a new area does not create nautical coverage or establish an anchoring clearance.

The optional depth display also includes coarse GEBCO WMS imagery below zoom 13, and marks include the OpenSeaMap community overlay. Both are online display layers. They are excluded from the offline basemap download and never passed to the assessment engine. GEBCO explicitly excludes navigation and safety-at-sea use; OpenSeaMap is not complete authoritative hazard coverage.

## Download contract

`apps/mobile/src/lib/worldMaps` provides platform-specific storage through a shared deterministic download coordinator:

- `estimateMapArea({ bounds, maxZoom? })` estimates vector tile count and bytes. The default reduces detail to stay within the estimate; actual bytes are enforced while downloading.
- `downloadMapArea({ name, bounds, maxZoom?, id? }, onProgress?, signal?)` downloads an explicitly selected area. Supplying its original `id` resumes or repairs an existing area.
- `listMapAreas()`, `cancelMapArea(id)` and `deleteMapArea(id)` manage local areas.
- `verifyMapArea(id)` checks stored resource sizes and SHA-256 hashes; missing or corrupt files make the area partial and repairable.
- `loadWorldMapStyle(online)` supplies global online context or complete local maps. `subscribeMapAreas(listener)` updates map views when complete maps change.

Downloads are limited to one area at a time, three concurrent requests, 3,000 tiles and 50 MB. Service errors, rate limits and cancellation stop further work. Verified partial resources remain resumable; an area becomes complete only after its tiles and required label glyphs have been written. Each area pins the provider's dated tile dataset. A refresh date prompts review after a week; downloading display data does not extend regional forecast validity.

Native apps store map files in their private document directory and metadata in SQLite. Native file resources are verified before their style is activated. Browser previews use Cache Storage and a MapLibre protocol that verifies each cached resource before rendering it. Browser downloads use the configured API's fixed-host `/v1/maps/resource` proxy to supply the required application User-Agent; native downloads and native online resource requests identify the app directly. Normal browser online viewing goes directly to the provider, as in its browser integration guide.

Production web exports also cache the application shell, including the MapLibre worker and its imported module, so opening a saved map for the first time or reloading the app can work offline. `npm run export:web --workspace=@anchor-buddy/mobile` runs the post-export step automatically. Serve `apps/mobile/dist` at the origin root over HTTPS or localhost; `.js` and `.mjs` files must have a JavaScript MIME type. The first visit must be online. A map download waits for the shell to finish installing before proceeding. Each build's shell is complete and SHA-256 checked before activation; interrupted updates preserve the previous shell. Updates activate after tabs using the prior version close. API responses, charts and provider imagery are not cached by this service worker.

For local offline testing, run `python3 -m http.server 8082 --directory apps/mobile/dist`, visit `http://localhost:8082` online, and download an area. Switch off the network, open that saved map and reload the page. Browser storage can still be cleared or evicted; downloaded maps should be checked before departure. Metro development (`npm run web`) deliberately does not register the shell worker and still requires its server. Keep development and exported previews on different ports/origins. If an exported origin is later reused for Metro, its worker update receives a development cleanup worker: it removes only app-shell caches, unregisters itself and reloads the app into Metro. Saved map and user data are preserved. Always use the full `export:web` command; its post-step replaces that development worker with the generated production worker.

Native binaries contain their application code locally. Full native rendering and device acceptance remain required; JavaScript/Hermes export does not test native file loading or background behavior.

## Provider sources

- [OpenFreeMap integration guide](https://openfreemap.org/quick_start/) documents global browser/native use.
- [OpenFreeMap terms](https://openfreemap.org/tos/) permit bounded offline areas, at most four parallel requests and an identifying User-Agent. The implementation uses three requests and enforces both the tile and byte limits. Public OpenStreetMap raster servers are not used for these downloads.
- [GEBCO WMS documentation](https://www.gebco.net/data-products/gebco-web-services/web-map-service) documents the global imagery and its limitations. The live service's EPSG:3857 projection and image/CORS response were checked during implementation.
- [OpenSeaMap server documentation](https://wiki.openseamap.org/wiki/OpenSeaMap-dev%3AServer) identifies its community seamark layer.

Attribution remains in the map. No provider passwords, tokens, planetary tile archives or downloaded world datasets are committed to the repository.
