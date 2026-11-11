# Real NOAA ENC ingestion verification — 2026-11-11

Ran the production catalog, download, extract, build and assemble commands against NOAA cell **US5FL4DR**, Entrance to Key West Harbor, edition 6/update 0. No test geometry or provider responses were substituted. GDAL ran in the repository's pinned `ghcr.io/osgeo/gdal:ubuntu-small-3.11.4` container. The downloaded data and generated artifacts remain under ignored `.artifacts/enc-pilot/`; no regional chart payload was added to source control.

The current NOAA Florida catalog returned 698 selectable cells after recognizing its official `www.charts.noaa.gov` download host. The exchange set was retrieved at `2026-11-11T16:08:29.888660Z` from [NOAA's cell download](https://www.charts.noaa.gov/ENCs/US5FL4DR.zip).

| Check | Observed result |
| --- | --- |
| GDAL extraction with updates enabled and warnings rejected | 4,299 unsimplified source features |
| Original sounding points | 2,055 preserved with distinct point IDs |
| Extracted metadata | `DSPM_SDAT=12`, `DSPM_VDAT=16`, `DSPM_DUNI=1` |
| Assembled depth/dredged areas | 288, with source lower/upper bounds |
| Assembled polygon hazards | 40 |
| Assembled navigation marks | 77 |
| Source objects omitted from domain mapping | 3,894, individually recorded in the omission report |
| Positive coverage declarations | 0 |
| TypeScript `validateLiveRegionPack` on generated JSON | No errors |
| Assessment release status | `unreviewed` |

For this development smoke, the sounding code was explicitly mapped to MLLW and units to metres after a technical metadata check; the mapping record identifies that check as automated development work, **not maritime approval**. [IHO's S-57 conversion guidance](https://iho.int/uploads/user/pubs/standards/s-65/S-65%20Annex%20B_Ed%201.2.0_Final.pdf) identifies sounding datum 12 as MLLW. [GDAL's S-57 documentation](https://gdal.org/en/stable/drivers/vector/s57.html) describes the source metadata and split-sounding behavior. No source quality, habitat clearance, jurisdiction, tide station relationship or weather footprint was inferred. Survey quality remains unknown, and the pack cannot be used as a reviewed live-search pack.

The real run exposed and fixed three blockers: the current NOAA download hostname was absent from the allowlist; relative output paths broke provenance-file creation; and split soundings shared GDAL FIDs, causing SQLite uniqueness failures. Unit tests now cover the first two; this real extraction/build validated distinct IDs for all 2,055 soundings. The assembler's tests additionally cover unknown bounds, explicit unit conversion, datum mismatches/local overrides, polygon holes, omitted point hazards, provenance rejection, integrity failure and immutable output directories.

Hashes for reproducibility:

```text
NOAA catalog SHA-256: 9afcef9fc7e44e68a4f49d04c1e31d34e1927f02a5766dd719ec63ddaab36a60
ENC ZIP SHA-256: c557ba4f1b80741f70cf3d6f7611dea6d93f1de9e182e0f1f37bda290e2821b8
analysis.sqlite SHA-256: f396484768ee16a1cabd79de3cce33b4aa384885457bbbc26caf94b8b86d5bfb
```

Reproduce with the commands in [README.md](README.md), selecting `US5FL4DR`, retaining the downloaded provenance, and creating a new version/assembly directory. Catalog contents and NOAA exchange-set versions change over time. The seven-day source-pack validity used for this development run was a refresh policy, not a forecast interval or a statement of navigation suitability.
