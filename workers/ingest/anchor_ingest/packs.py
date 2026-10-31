from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess
import tempfile

from .geometry import geometry_bounds, validate_geometry
from .sources import utc_now

SAFE_NAME = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$")
REVIEW_GATES = ("maritime", "coverage", "geometry", "stationMappings", "onWaterValidation")


def identifier(value: str) -> str:
    if not SAFE_NAME.fullmatch(value) or ".." in value:
        raise ValueError("Invalid region, version, or asset identifier")
    return value


def sha256(path: Path) -> str:
    checksum = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            checksum.update(chunk)
    return checksum.hexdigest()


def write_analysis(features: list[dict], target: Path, provenance: list[dict], *, synthetic: bool) -> dict[str, int]:
    """Retain full source coordinates/properties; the RTree only narrows candidates."""
    counts: dict[str, int] = {}
    with sqlite3.connect(target) as database:
        database.executescript("""
          PRAGMA journal_mode=DELETE;
          CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE features (
            row_id INTEGER PRIMARY KEY, feature_id TEXT UNIQUE NOT NULL, source_id TEXT NOT NULL,
            object_class TEXT NOT NULL, geometry TEXT NOT NULL, properties TEXT NOT NULL,
            min_depth_m REAL, max_depth_m REAL, vertical_datum TEXT,
            survey_quality TEXT NOT NULL DEFAULT 'unreviewed'
          );
          CREATE VIRTUAL TABLE feature_bounds USING rtree(row_id, min_x, max_x, min_y, max_y);
          CREATE INDEX feature_source ON features(source_id);
          CREATE INDEX feature_class ON features(object_class);
        """)
        database.executemany("INSERT INTO metadata VALUES (?,?)", [("schemaVersion", "1"), ("synthetic", json.dumps(synthetic)), ("provenance", json.dumps(provenance)), ("notice", "Unsimplified source geometry; coverage, datum, rule applicability and survey quality require review. Display tiles are not analysis inputs.")])
        sources = {source["id"] for source in provenance}
        for index, feature in enumerate(features, 1):
            geometry = feature["geometry"]
            validate_geometry(geometry, require_gdal=not synthetic)
            west, south, east, north = geometry_bounds(geometry)
            properties = feature.get("properties", {})
            source_id = properties.get("sourceId")
            if source_id not in sources:
                raise ValueError(f"Feature references missing source: {source_id}")
            object_class = str(properties.get("objectClass", properties.get("kind", "unknown")))
            lower, upper = properties.get("DRVAL1"), properties.get("DRVAL2")
            if lower is not None and upper is not None and float(lower) > float(upper):
                raise ValueError("Depth range is reversed")
            database.execute("INSERT INTO features VALUES (?,?,?,?,?,?,?,?,?,?)", (index, str(feature.get("id", f"{source_id}:{index}")), source_id, object_class, json.dumps(geometry, separators=(",", ":")), json.dumps(properties, separators=(",", ":")), lower, upper, None if properties.get("verticalDatum") is None else str(properties["verticalDatum"]), "unreviewed"))
            database.execute("INSERT INTO feature_bounds VALUES (?,?,?,?,?)", (index, west, east, south, north))
            counts[object_class] = counts.get(object_class, 0) + 1
        database.commit()
        if database.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("Analysis SQLite integrity check failed")
    return counts


def build_pack(*, root: Path, region_id: str, version: str, features: list[dict], provenance: list[dict], bounds: list[float], valid_until: str, synthetic: bool, review: dict | None = None, attachments: dict[str, tuple[Path, str]] | None = None, create_tiles: bool = False, offline_chart: dict | None = None) -> dict:
    identifier(region_id)
    identifier(version)
    review = review or {key: False for key in REVIEW_GATES}
    if len(bounds) != 4 or not (-180 <= bounds[0] < bounds[2] <= 180 and -90 <= bounds[1] < bounds[3] <= 90):
        raise ValueError("Invalid regional bounds")
    if datetime.fromisoformat(valid_until.replace("Z", "+00:00")) <= datetime.now(timezone.utc):
        raise ValueError("Pack is already expired")
    if not provenance:
        raise ValueError("Source provenance is required")
    for source in provenance:
        if not all(source.get(key) for key in ("id", "url", "retrievedAt", "attribution")):
            raise ValueError("Incomplete source provenance")
    reviewed = all(review.get(key) is True for key in REVIEW_GATES) and bool(review.get("reviewedBy")) and bool(review.get("reviewedAt"))
    if reviewed and synthetic:
        raise ValueError("Synthetic source packs cannot be released as reviewed")
    region = root / region_id
    region.mkdir(parents=True, exist_ok=True)
    destination = region / version
    if destination.exists():
        raise ValueError("Pack versions are immutable")
    staging = Path(tempfile.mkdtemp(prefix=".staging-", dir=region))
    try:
        counts = write_analysis(features, staging / "analysis.sqlite", provenance, synthetic=synthetic)
        (staging / "display.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))
        purposes = {"analysis.sqlite": "analysis", "display.geojson": "display"}
        if create_tiles:
            if not shutil.which("tippecanoe"):
                raise RuntimeError("tippecanoe is required for --tiles")
            subprocess.run(["tippecanoe", "-o", str(staging / "display.mbtiles"), "-l", "nautical", "-Z", "7", "-z", "16", "--drop-densest-as-needed", str(staging / "display.geojson")], check=True)
            purposes["display.mbtiles"] = "display"
        for name, (source, purpose) in (attachments or {}).items():
            identifier(name)
            if name in purposes or name == "manifest.json":
                raise ValueError("Attachment replaces a reserved artifact")
            if purpose not in {"forecast", "restrictions", "tariffs", "assessment", "display"}:
                raise ValueError("Invalid attachment purpose")
            shutil.copyfile(source, staging / name)
            purposes[name] = purpose
        if reviewed and "assessment" not in purposes.values():
            raise ValueError("Reviewed release requires an assembled assessment snapshot")
        if offline_chart:
            from urllib.parse import urlparse
            if offline_chart.get("rights") != "operator-owned-or-licensed" or not offline_chart.get("approvedBy") or not offline_chart.get("approvedAt"):
                raise ValueError("Offline chart rights require explicit operator review")
            style_asset = offline_chart.get("styleAsset", "")
            identifier(style_asset)
            if purposes.get(style_asset) != "display" or (staging / style_asset).stat().st_size > 2_000_000:
                raise ValueError("Offline chart must name a small checked display style asset")
            origins = offline_chart.get("resourceOrigins", [])
            style_url = urlparse(offline_chart.get("styleUrl", ""))
            if style_url.scheme != "https" or style_url.username or style_url.password or f"https://{style_url.netloc}" not in origins:
                raise ValueError("Offline chart style URL must use an approved HTTPS origin")
            if not isinstance(offline_chart.get("minZoom"), int) or not isinstance(offline_chart.get("maxZoom"), int) or not 0 <= offline_chart["minZoom"] <= offline_chart["maxZoom"] <= 16:
                raise ValueError("Offline chart zoom range must lie between 0 and 16")
        manifest = {
            "schemaVersion": 1, "regionId": region_id, "version": version,
            "createdAt": utc_now(), "validUntil": valid_until,
            "label": "Synthetic demonstration — not for navigation" if synthetic else "Regional source snapshot",
            "synthetic": synthetic, "releaseStatus": "reviewed" if reviewed else "review-required",
            "bounds": bounds, "review": review, "provenance": provenance,
            "featureCounts": counts,
            "coverageStatement": "Feature presence alone does not prove complete hazard, habitat, restriction or depth coverage.",
            "assets": [{"path": name, "sha256": sha256(staging / name), "bytes": (staging / name).stat().st_size, "mediaType": "application/vnd.sqlite3" if name.endswith((".sqlite", ".mbtiles")) else "application/geo+json" if name.endswith(".geojson") else "application/json", "purpose": purpose} for name, purpose in sorted(purposes.items())]
        }
        if offline_chart:
            manifest["offlineChart"] = offline_chart
        (staging / "manifest.json").write_text(json.dumps(manifest, indent=2))
        verify_pack(staging)
        # fsync every artifact before the version and current-pointer rename.
        for path in staging.iterdir():
            with path.open("rb") as file:
                os.fsync(file.fileno())
        os.replace(staging, destination)
        pointer = region / (".current-" + version + ".json")
        with pointer.open("x") as file:
            json.dump({"version": version}, file)
            file.flush()
            os.fsync(file.fileno())
        os.replace(pointer, region / "current.json")
        directory = os.open(region, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
        return manifest
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise


def verify_pack(directory: Path) -> dict:
    manifest = json.loads((directory / "manifest.json").read_text())
    if manifest.get("schemaVersion") != 1:
        raise ValueError("Unsupported pack version")
    seen = set()
    for asset in manifest["assets"]:
        identifier(asset["path"])
        if asset["path"] in seen:
            raise ValueError("Duplicate pack asset")
        seen.add(asset["path"])
        path = directory / asset["path"]
        if path.is_symlink() or not path.is_file() or path.stat().st_size != asset["bytes"] or sha256(path) != asset["sha256"]:
            raise ValueError(f"Pack integrity failure: {asset['path']}")
    return manifest


def publish_object_store(directory: Path, public_root: str) -> None:
    """Upload immutable version first, then pointer last via operator's configured AWS/S3 CLI."""
    manifest = verify_pack(directory)
    if not public_root.startswith("s3://") or not shutil.which("aws"):
        raise ValueError("An s3:// bucket and configured AWS-compatible CLI are required")
    # region/version keys are validated; subprocess argv never interpolates a shell.
    region = identifier(manifest["regionId"])
    version = identifier(manifest["version"])
    base = public_root.rstrip("/") + "/" + region
    subprocess.run(["aws", "s3", "cp", str(directory), base + "/" + version + "/", "--recursive", "--cache-control", "public,max-age=31536000,immutable"], check=True)
    with tempfile.TemporaryDirectory() as temp:
        pointer = Path(temp) / "current.json"
        pointer.write_text(json.dumps({"version": version}))
        subprocess.run(["aws", "s3", "cp", str(pointer), base + "/current.json", "--cache-control", "no-cache", "--content-type", "application/json"], check=True)
