# SAFE-01 — Primitive hazard assessment and numerical evidence

Baseline: `ed48e6508538b8ccbb24fd24c0e2e5b4e74063b7` (approved FOUNDATION-02). Additional reviewed prerequisite: root contract correction `e658dadc495d857687984dd2687afb1c417f1b8e`, independently approved by this worker and cherry-picked as `98a5c74`. Final implementation SHA is supplied in the scoped commit handoff.

Task status: **implemented_awaiting_external_evidence**. Mathematical implementation, controlled tests and target compilation are complete. Qualified review of numerical/geometry assumptions is unavailable. Primitive-bearing assessments therefore cannot claim clearance or pass; an independently observed intersection still excludes. No synthetic/test switch bypasses this rule.

## Behavior and ownership

- Added bounded point, line and polygon primitive assessment using original unsimplified source geometry. Source IDs and original object identity survive into exclusion/uncertainty reasons.
- Evaluate the final full-circle vessel/rode footprint after existing whole-stay depth/rode convergence. Wind direction, preferred seabed and depth alternatives cannot shrink it. Existing polygon exclusions and seam behavior are unchanged.
- Add only sourced physical extent and positional uncertainty to the exclusion distance. Unknown quantities remain unknown and yield insufficient evidence. A known intersection with original geometry still excludes, even when other dimensions are unresolved.
- Numerical model review is explicitly missing for **every** primitive-bearing input. A complete legacy hazard-coverage flag cannot override this; the engine emits `hazards_coverage` plus `hazard_model_review_required`. Exclusions take priority over insufficiency as before.
- Bound input/topology and numerical work. Unsupported data/complexity is rejected before activation or reported as insufficient during assessment; original geometry is never simplified or silently dropped.

Owned changes: `packages/domain/src/geo.ts`, new `hazards.ts`, the narrow `engine.ts` call site, explicitly authorized primitive-only amendment in `validation.ts`, `test/hazards.test.ts`, updated FOUNDATION-02 primitive regression in `test/contracts.test.ts`, test-only reference generator/corpus, this report. No provider fetching, source rights, screens, native protocol or depth/rode algorithm changes.

## Contract amendment and approval gate

The integrator explicitly authorized replacing `UNSUPPORTED_HAZARD_PRIMITIVES` with validated handling. Schema fields remain unchanged. The authorized bounds correction also restricts region latitude bounds to ±85° (longitude remains ±180°), preserves ordered/nonwrapped bounds and verifies high-latitude discovery construction/rejection before provider work. Source IDs must resolve; primitive IDs must be unique and cannot conflict with legacy polygon hazards. Existing snapshot and source-envelope v2 activation gates remain effective. The prior foundation regression now verifies preserved unknowns, rejected missing provenance, and the model-review insufficiency rather than blanket primitive rejection.

This amendment grants no maritime approval. A future genuine review must bind numerical algorithm/version, supported coordinate/extent/work limits, reference evidence and source-uncertainty assumptions to an approved scope. No such model-approval field/attestation exists in the current schema. The integrator must approve that explicit contract and activation change after actual qualified review; neither `validation.status='reviewed'`, a test fixture, nor an ordinary user control can remove this gate. No invented reviewer is supplied. Updated frozen-contract descriptions are integrated by the schema owner.

## Numerical method and supported domain

The existing legacy polygon routines remain unchanged. New primitive calculations use:

1. Original GeoJSON longitude/latitude-linear segments, including zero-length segments and polygon/hole boundaries. They are not replaced by great-circle endpoint segments or rendered tiles. A point inside a polygon's occupied area has zero distance; a point in a hole is measured against every original boundary.
2. Spherical point distances using the existing radius `R=6371008.8 m`. For a segment from `(lon1,lat1)` to `(lon2,lat2)`, an upper path-length bound is
   `R * radians(1) * hypot(deltaLat, cos(minAbsLatitude) * deltaLon)`.
   `minAbsLatitude` is the closest latitude to the equator on that segment. The triangle inequality provides a lower distance bound `(distanceA + distanceB - pathUpper)/2` (clamped to zero). Adaptive bisection stops once an interval cannot improve the best sampled distance by more than **0.25 m**, or its whole path is at most **0.5 m**. There is no circumference-only sampling.
3. Ellipsoid metric enclosure, not a claim that a fixed 2 m corrects every spherical error. WGS84 uses `a=6378137 m`, `f=1/298.257223563`, `e²=f(2-f)`. The meridional/prime-vertical metric radii divided by R lie between `0.9944169795045362` and `1.0044867032295566`. The deliberately wider engineering factors **0.994 and 1.006** enclose those extrema. Thus the distance to original geometry is enclosed by `max(0,bestSphere-0.25)*0.994` and `bestSphere*1.006`. These bounds apply to the metric distance, not source positional accuracy.
4. Compare the conservative **lower** distance bound to `fullFootprintRadius + knownExtent + knownPositionalUncertainty + 2 m`. The numerical guard remains at least the existing **2 m**. A lower bound cannot establish clearance if a required source quantity is unknown. The broad ellipsoid interval deliberately permits false-positive exclusions; no displayed measured distance or nautical confidence is derived from it.

Primary references consulted 2026-11-11: [PROJ geodesic calculations](https://proj.org/en/stable/geodesic.html) documents its GeographicLib geodesic routines and direct/inverse ellipsoidal distances; [GeoJSON RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.1) defines coordinate and segment semantics. The bound above is the engineering derivation being submitted for qualified review, not an approval inferred from either reference.

Supported primitive query domain:

| Dimension              | Bound / behavior                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coordinates            | WGS84 longitude ±180°, latitude **±85° inclusive**                                                                                                                   |
| Antimeridian           | Unwrapped/crossing longitude spans beyond 180° relative to query or adjacent vertices are unsupported; never treated as complete coverage                            |
| Query-to-vertex extent | At most **50,000 m spherical distance**; farther geometry returns explicit unsupported extent, even if apparently irrelevant                                         |
| Primitive count        | At most **256** per pack; larger inputs rejected by region validation                                                                                                |
| Vertices               | At most **4,096** per primitive, **16,384** across primitives before exact topology validation; bounded nested-container scans                                       |
| Numerical work         | Shared **50,000 point-distance evaluations** per candidate across all primitives; exhausted work yields insufficient evidence and preserves already-found exclusions |
| Geometry               | Point, LineString (including coincident endpoints), Polygon, MultiPolygon; valid original topology required                                                          |
| Coverage seams         | No polygon union. One original depth/coverage polygon must still prove full-footprint coverage                                                                       |

Complexity rejection at the input boundary uses the existing `validateRegionPack`/`assertInputs` flow; invalid packs never become an active assessment. Within accepted packs, numerical budget/extent failures produce explicit reasons and `complete:false`. This work does not rewrite existing legacy-array validation or global search scheduling limits.

## Independent offline reference

Reference execution used the already installed image `ghcr.io/osgeo/gdal:ubuntu-small-3.11.4`, image ID:

```text
sha256:4b94b5e76e8b5616a4d5dc38e6e20def10ab70c3487eeb923d90547372e70a03
```

Inside that image, PROJ **9.6.1** (`libproj.so.25`) provides GeographicLib C `geod_init`, `geod_inverse` and `geod_direct`. The test-only Python generator calls those actual offline WGS84 routines using their header-defined C structure. It does not call the production TypeScript distance code. Points are generated by the independent ellipsoidal direct problem; line reference minima use 1,024 evenly spaced brackets followed by 100 golden-section iterations along the original linear lon/lat edge. This is an independent numerical reference for the finite local corpus, not an exhaustive mathematical or maritime proof. No PostGIS image was available; the permitted geodesic reference was used instead.

Reproduction from repository root, with the already-present image:

```sh
docker run --rm --network none -v "$PWD:/work:ro" \
  ghcr.io/osgeo/gdal:ubuntu-small-3.11.4 \
  python3 /work/packages/domain/test/reference/primitive-geodesic-reference.py \
  > packages/domain/test/fixtures/primitive-geodesic-reference.json
npm run test --workspace=@anchor-buddy/domain
```

Test-only corpus SHA-256:

```text
60fa6f2fc7c9566d63c40de3c075111fb7200709204f7c17b5f7daf877c4746c
```

The fixed seed is **642859**. There are **210** independent point/line cases across equator, Keys, northern Europe and both ±85° limits, with point distances from 1 m through 49 km and randomly oriented local segments. All reference minima fall inside the production distance enclosure (comparison epsilon **0.00001 m**, used solely to compare independent numerical outputs). Reversing line coordinates produces identical bounds. This epsilon does not reduce the safety threshold.

| Latitude | Cases | Maximum lower-bound slack (m) | Maximum upper-bound slack (m) | Maximum distance evaluations |
| -------- | ----: | ----------------------------: | ----------------------------: | ---------------------------: |
| 0°       |    47 |                    348.682281 |                    570.744614 |                          351 |
| 24.7°    |    47 |                    377.123924 |                    485.314910 |                          297 |
| 59.9°    |    47 |                    470.716296 |                    200.307181 |                          260 |
| +85°     |    37 |                    510.551120 |                     77.928192 |                          281 |
| −85°     |    32 |                    510.551120 |                     76.575459 |                          391 |

These maximum slacks arise at long reference distances; the enclosure is deliberately conservative and is **not sub-metre geodesic accuracy**. The maximum interval span was 591.549629 m for the 49 km-scale corpus. A representative local Node 24 run of the entire 210-case corpus, including repeated/reversed evaluations, took approximately 9 ms; timing is informational, hardware-dependent and not a service-level limit. A pathological 4,096-vertex zigzag actually exhausts the 50,000-call budget, returns unsupported complexity and cannot produce a pass; a previously detected point exclusion remains. No source geometry is truncated to obtain that result.

## AC matrix

| Acceptance criterion                         | Status             | Evidence / remaining action                                                                                                                                                                             |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAFE-01-AC01                                 | PASS               | Internal point, guarded boundary, crossing cable and integration tests exclude with original source IDs                                                                                                 |
| SAFE-01-AC02                                 | PASS               | Unknown extent/uncertainty retained; hazard completeness suppressed; all primitive inputs additionally require model review                                                                             |
| SAFE-01-AC03                                 | PASS               | Tiny enclosed polygon, hole boundary, tangent and zero-length line tests; original geometry used                                                                                                        |
| SAFE-01-AC04                                 | PASS               | 180° wind reversal, all depth allowances, larger depth/rode and deployed-rode footprint checks preserve/enlarge exclusions                                                                              |
| SAFE-01-AC05                                 | PASS               | Existing complete domain regression suite passes; explicit no-union/seam cases remain insufficient                                                                                                      |
| SAFE-01-AC06                                 | PASS (engineering) | Stable ID/segment ordering, reversal equality, no mutation, actual budget exhaustion, Node checks and iOS/Android Hermes bytecode export. Physical runtime/parity trials remain SAFE-04/native work     |
| SAFE-01-AC07                                 | PASS               | This reproducible numerical report, independent reference script/corpus, supported-domain bounds and conservative limitations                                                                           |
| External qualified geometry/numerical review | BLOCKED            | No qualified reviewer/model attestation available. The required insufficiency gate remains on; integrator obtains review and separately approves a binding contract before enabling primitive clearance |

## Required test cases

| ID         | Setup / command                                                                                                      | Expected                                                                            | Actual / artifact                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| S01-T01    | `hazards.test.ts`, point 10 m from 50 m footprint and 52 m guarded boundary                                          | Both excluded with original source IDs                                              | PASS                                               |
| S01-T02    | Crossing line with outside endpoints; reversed coordinates and coincident endpoints                                  | Same exclusion/reasons; zero-length primitive valid                                 | PASS                                               |
| S01-T03    | Unknown extent or uncertainty, otherwise complete analytical fixture                                                 | Insufficient evidence and no complete hazard claim; raw intersection still excludes | PASS                                               |
| S01-T04    | 1 m polygon inside footprint and habitat hole boundary                                                               | Both detected; hole interior alone is not occupied area                             | PASS                                               |
| S01-T05    | Wind reversal, deeper max depth, larger required/deployed rode, +20/+30 alternatives                                 | Existing exclusion stays; larger full disk checked                                  | PASS                                               |
| S01-T06    | Adjacent rectangles with zero/narrow seam                                                                            | Neither alone proves disk; no union/fill                                            | PASS                                               |
| S01-T07    | Offline PROJ corpus and domain regression                                                                            | Deterministic distance enclosure including ±85°; explicit unsupported cases         | PASS, 210 references, maximum 391 evaluations/case |
| Additional | Invalid provenance/coordinates/dimensions, duplicates, large topology, real budget exhaustion, source order reversal | Rejection/insufficiency without mutation or false completion                        | PASS                                               |

All geometry, sources and identities in these test cases are analytical test-only examples, never production evidence or reviewers. There are no new npm scripts: the existing domain test glob runs the regression; the optional reproducible reference-generation command above is documented separately.

## Verification and integration handoff

Node **24.22.3** from the existing sibling toolchain; `npm ci` succeeded against the lockfile. Required checks:

```text
npm run test --workspace=@anchor-buddy/domain
PASS: 88 tests, 0 failures/skips (includes root's three contract corrections).

npm run typecheck
PASS: all workspaces.

npm run test --workspace=@anchor-buddy/api
PASS: 47 tests, 0 failures/skips after the region-bounds correction.

npm run check:runtime
PASS: 7 guard tests, 88 repository modules; reference generator/corpus are unreachable from runtime.

cd apps/mobile
../../node_modules/.bin/expo export --platform ios --platform android \
  --output-dir ../../.artifacts/safe01-hermes
PASS: iOS and Android Hermes bytecode export.
```

Hermes export verifies bundling/bytecode compilation, **not** Swift/Kotlin compilation, device operation, overnight monitoring or independent native numerical execution. No such claims are made. No native files were changed.

Live-source checks: none. Reference generation ran with Docker networking disabled. Original real ENC source/coverage approvals were not changed, and no real pack was promoted. The source/shape contract and ingestion omission rules remain owned by DATA-02/DATA-03.

Privacy/secret review: only invented analytical points, reserved test source labels and numerical data added. No credentials, private tracks, profiles, contacts or signatures. No account creation, mail, cloud deployment, push or purchase.

Rollback: revert SAFE-01 implementation and restore the prior primitive rejection gate before any downstream primitive activation. Existing legacy pack behavior remains unchanged. The root-owned documentation/type-comment gate descriptions need the recorded amendment; no further central API/App wiring is required.

Independent root-amendment review: `e658dad` was inspected with `git show`; string-only enums reject array/object coercion and preserve valid strings, review-start/end checks match the frozen whole-interval contract, callback/lookup behavior remains fail-closed. **Approved, no findings**; source unchanged by this worker apart from the authorized primitive validator gate amendment.
