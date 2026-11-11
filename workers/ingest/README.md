# Regional source ingestion

This worker builds integrity-checked real-source packs. It does **not** claim that downloading an ENC supplies complete habitat, regulatory, tide/current, holding-ground or marina data. No navigable Florida Keys pack is bundled. Build, verification, indexing and publication reject synthetic or mixed-source data. Invented test fixtures live only under `tests/fixtures` and cannot be built by the production CLI.

Python 3.11+ runs unit tests without packages; those tests replace only the external GDAL validator. Production ENC extraction and source geometry validation require GDAL with S-57 support. `tippecanoe` is optional for display MBTiles. PostGIS indexing requires the `postgres` optional dependency (`pip install '.[postgres]'`); the container supplies GDAL and psycopg and excludes test fixtures.

From `workers/ingest`:

```sh
python3 -m unittest discover -s tests -v
python3 -m anchor_ingest --help
python3 -m anchor_ingest catalog
```

`catalog` retrieves only the NOAA Florida catalog, not all chart data. Select applicable cells using the catalog's boundaries and product metadata. Download only the chosen identifiers:

```sh
python3 -m anchor_ingest download --cell CELL_FROM_CATALOG --output /tmp/anchorbuddy-incoming
python3 -m anchor_ingest extract /path/to/CELL.000 --output /tmp/cell.geojson
```

Keep each cell's `.000`, `.001`, `.002`, … files together. Missing sequence members and GDAL warnings cause extraction to fail. GDAL applies updates; the result retains DSID/DSPM metadata, source edition, sounding datum (`DSPM_SDAT`), height datum (`DSPM_VDAT`), depth-unit code and the precise update sequence. These datum fields are distinct. A numeric S-57 datum code is **not** automatically treated as MLLW. Split soundings retain their original feature ID and a per-point ordinal so no points are lost to duplicate IDs. The catalog snapshot and downloaded exchange-set hashes remain in provenance. Some NOAA catalog records supply geographic polygons rather than bounding-box fields; an empty catalog `bounds` is unknown and requires inspecting the source metadata, not assuming worldwide coverage.

Official sanctuary, habitat, jurisdiction and spatial safety-notice GeoJSON can be imported with:

```sh
python3 -m anchor_ingest official /path/to/notices.geojson \
  --source-id official-notices --source-url https://agency.gov/published-source \
  --jurisdiction 'Publishing authority' --valid-from 2026-10-30T00:00:00Z \
  --valid-until 2026-11-01T00:00:00Z --output /tmp/notices-imported.geojson
```

This preserves geometry and records time/jurisdiction/source; it leaves legal applicability unresolved. A PDF or non-spatial Local Notice to Mariners needs a reviewed spatial interpretation. Absence of a published polygon does not mean a place is clear. Use authoritative source URLs and retain the original publication. The importer does not scrape unverified community rules into authoritative constraints.

## Pack recipe and artifacts

Create a recipe in an operator workspace. `featureFiles` points to extracted/imported real GeoJSON. Supply `regionId`, an immutable `version`, `bounds`, `validUntil`, `synthetic:false` and complete `provenance`. Every source must explicitly declare `synthetic:false` alongside its ID, URL, retrieval timestamp and attribution. Features must reference an included source ID. Optional attachments are `{name, file, purpose}` where purpose is `forecast`, `restrictions`, `tariffs` or `assessment`. An assessment attachment must conform to the exported domain `RegionPack` type with real-source review status and explicitly real sources. Verification also checks JSON attachments and SQLite metadata for synthetic or unclassified provenance. Curated records must keep operator source currency, verification date, validity period and unknown fields. Tariff absence is not “free.”

```sh
python3 -m anchor_ingest build /path/to/operator/recipe.json --root /tmp/anchorbuddy-packs
python3 -m anchor_ingest verify /tmp/anchorbuddy-packs/REGION/VERSION
```

The resulting version directory contains:

- `analysis.sqlite`: full unsimplified geometry/properties, source references, original datum/unit codes, unreviewed survey quality, and an RTree. Convenience metre columns are populated only when the source explicitly declares metres; raw `DRVAL1`/`DRVAL2` always remain in properties. Sounding points remain points; they are never interpolated into depth coverage.
- `display.geojson`, optionally `display.mbtiles`: presentation artifacts. Tippecanoe may simplify or drop display geometry, so analysis never reads it.
- Source-specific forecast, restriction, tariff and assembled assessment attachments supplied by the operator.
- `manifest.json`: asset lengths and SHA-256 digests, source provenance, feature counts, expiry, release status and review gates.

An assembled assessment is a separate reviewed product, not an automatic inference from ENC object count. Its coverage layers must positively establish full bathymetry/hazard/habitat/restriction/weather/tide/current coverage for the searched footprint and stay. It must retain unknown depths, survey quality, current/wave gaps, vertical-datum mismatch, unresolved rules and source expiry. A real assessment snapshot with `validation.status !== "reviewed"` cannot be served for live search.

## Assemble extracted ENC evidence

The `assemble` command converts a verified source pack's SQLite geometry into domain `RegionPack` JSON. It emits an **unreviewed** assessment plus an omission report in a new directory; it never modifies a published pack or grants release approval.

```sh
python3 -m anchor_ingest assemble /tmp/anchorbuddy-packs/REGION/VERSION \
  --config /path/to/operator/assembly-config.json --output /tmp/assembled-new-version
```

The configuration requires `name`, an IANA `timezone`, and `sourceMappings` keyed by each source ID. Every source needs an explicit `license` statement (either here or in its provenance). A mapping without datum fields still imports polygon hazards and navigation marks, and records why depth areas were omitted. To include depth areas, provide all of `verticalDatum`, `depthUnits` (`metres`, `feet`, or `fathoms`), `sourceSoundingDatumCode`, `sourceDepthUnitCode`, `reviewedBy`, and timezone-qualified `reviewedAt`. These are operator attestations of a source-specific mapping; do not copy numbers from an unrelated cell. The original feature codes must match exactly. Local `M_SDAT` or `M_UNIT` areas block cell-wide depth mapping until a separate spatial resolution step is reviewed.

`assessment.json` preserves polygon holes and source depth ranges, converts only explicitly mapped units, and leaves unknown bounds unknown. Survey quality remains `unknown`. It includes polygon shore/obstruction/cable/channel features and supported point navigation marks. `assembly-report.json` records imported counts, every omission, source metadata such as `M_QUAL`, and the supplied mapping reviews. Isolated soundings and point/line hazards remain in the source SQLite; the assembler neither interpolates continuous depth nor invents hazard buffers. It does not infer holding ground from vegetation, habitat permission from absent polygons, or complete coverage from chart boundaries.

The assembly does not attach live point forecasts to chart polygons or select the nearest tide station. Weather/current coverage and station-to-site datum relationships need explicit spatial validation. An operator can subsequently add reviewed evidence and include the assembled JSON as an `assessment` attachment in a **new** source-pack version. The existing maritime, coverage, geometry, station-mapping and on-water release gates still apply.

Every weather and tide interval must identify its actual reviewed polygons in `coverageAreaIds`. Weather intervals link both applicable weather and current areas; tide intervals link the validated station's tide areas. A point forecast or nearby tide station cannot establish conditions across the whole region by merely being included in a pack.

For native offline charts, add a `display` attachment containing a MapLibre v8 style JSON and an optional `offlineChart` object to the recipe:

```json
{
  "styleUrl": "https://charts.your-domain.example/keys/v1/style.json",
  "styleAsset": "style.json",
  "minZoom": 7,
  "maxZoom": 15,
  "resourceOrigins": ["https://charts.your-domain.example"],
  "rights": "operator-owned-or-licensed",
  "approvedBy": "Operator who verified redistribution and offline rights",
  "approvedAt": "2026-10-30T00:00:00Z"
}
```

The assessment's `chart.styleUrl` must match and `chart.offlineAllowed` must be true. The mobile installer checks the style's manifest hash and requires all tiles, glyphs and sprites to use absolute URLs on approved HTTPS origins. Tile source definitions must embed their tile URLs, and GeoJSON must be embedded; opaque remote TileJSON/styles are refused. Public OpenStreetMap/OpenTopoMap tile hosts are expressly excluded. This is an operator declaration of actual rights, not a mechanism for granting rights to third-party maps.

After installation, native Settings can use MapLibre `OfflineManager` to download the full pack bounds at the approved zoom levels (maximum 16) into its native tile database. It reports completion only after the native manager confirms it. Partial downloads can resume, and they do not replace analysis data. The web preview does not download offline chart tiles. Downloaded JSON remains the assessment input; SQLite and rendering tiles remain distinct artifacts.

Every real pack remains `review-required` until the operator supplies true `maritime`, `coverage`, `geometry`, `stationMappings` and `onWaterValidation` review gates plus `reviewedBy` and `reviewedAt`. The recipe is an operator assertion of external work; the software cannot perform professional review or on-water trials. Approved release also requires an assessment attachment.

Files are built in a staging directory and verified before publication. A version cannot be overwritten. The `current.json` pointer changes only after the completed version is atomically renamed and flushed; an interrupted build leaves the previous pointer intact. Mobile clients must likewise verify a complete download before replacing their active snapshot.

```sh
python3 -m anchor_ingest index-postgis /tmp/anchorbuddy-packs/REGION/VERSION
python3 -m anchor_ingest publish /tmp/anchorbuddy-packs/REGION/VERSION --destination s3://operator-bucket/packs
```

Set `DATABASE_URL` for indexing without including secrets in commands. PostGIS indexing is transactional and version-scoped. S3 publication uses the operator's configured AWS-compatible CLI and uploads the current pointer last. Configure a bucket policy that forbids overwriting versioned objects, and object retention/versioning appropriate to your deployment. Publication is an operator action; these commands do not run automatically. The API serves a local/read-only mounted pack volume; object-storage deployments can serve the same manifest/assets directly over HTTPS.

Sources: [NOAA ENC catalog and downloads](https://charts.noaa.gov/ENCs/ENCs.shtml), [GDAL S-57 updates and metadata](https://gdal.org/en/stable/drivers/vector/s57.html), [NWS marine-grid API](https://www.weather.gov/documentation/services-web-api), [CO-OPS products and datums](https://api.tidesandcurrents.noaa.gov/api/prod/), [Florida Keys sanctuary guidance](https://floridakeys.noaa.gov/).
