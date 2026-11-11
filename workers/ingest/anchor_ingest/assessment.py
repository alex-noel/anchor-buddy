"""Assemble inspectable real ENC evidence; never manufacture release approval."""
from __future__ import annotations

from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import shutil
import sqlite3
import tempfile
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .geometry import validate_geometry
from .packs import identifier, reject_synthetic, require_real_sources, verify_pack

DATUMS = {"MLLW", "MLW", "LAT", "MSL", "NAVD88", "NGVD29", "MHHW", "MHW", "MHWS", "HAT"}
UNITS = {"metres": 1.0, "feet": 0.3048, "fathoms": 1.8288}
# No buffering of points/lines: a guessed radius would invent source geometry.
HAZARD_CLASSES = {"LNDARE": "shore", "OBSTRN": "obstruction", "WRECKS": "obstruction", "UWTROC": "obstruction", "CBLARE": "cable", "CBLSUB": "cable", "FAIRWY": "channel", "NAVLNE": "channel"}
MARK_CLASSES = {"BOYLAT": "lateral", "BCNLAT": "lateral", "BOYCAR": "cardinal", "BCNCAR": "cardinal", "BOYISD": "isolated_danger", "BCNISD": "isolated_danger", "BOYSAW": "safe_water", "BCNSAW": "safe_water", "BOYSPP": "special", "BCNSPP": "special"}


def timestamp(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("An ISO timestamp with timezone is required")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("Invalid ISO timestamp") from None
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include its timezone")
    return parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def bound(value: object, factor: float) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value):
        raise ValueError("Depth bounds must be finite numbers or unknown")
    result = value * factor
    if not -100 <= result <= 12000:
        raise ValueError("Depth bound is outside the supported metre range")
    return result


def assemble_assessment(directory: Path, config: dict) -> tuple[dict, dict]:
    """Read a checked source pack; source mappings are explicit operator attestations.

    The output remains unreviewed even when datum/unit mappings were reviewed.
    Soundings and non-area hazards stay in analysis.sqlite and the omission report.
    """
    manifest = verify_pack(directory)
    if not isinstance(config, dict):
        raise ValueError("Assembly configuration must be an object")
    reject_synthetic(config)
    mappings = config.get("sourceMappings", {})
    if not isinstance(mappings, dict):
        raise ValueError("sourceMappings must be an object keyed by source ID")
    name = config.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("A region name is required")
    zone = config.get("timezone")
    try:
        ZoneInfo(zone)
    except (ZoneInfoNotFoundError, TypeError, ValueError):
        raise ValueError("A valid regional IANA timezone is required") from None
    version_value = config.get("version", manifest["version"])
    if not isinstance(version_value, str):
        raise ValueError("Assembly version must be a string")
    version = identifier(version_value)
    generated = timestamp(datetime.now(timezone.utc).isoformat())
    expiry = timestamp(manifest["validUntil"])
    if expiry <= generated:
        raise ValueError("Source pack has expired; fetch and review an update")
    sources = []
    for raw in manifest["provenance"]:
        policy = mappings.get(raw["id"], {})
        if not isinstance(policy, dict):
            raise ValueError("Invalid source mapping")
        license_text = policy.get("license", raw.get("license"))
        if not isinstance(license_text, str) or not license_text.strip():
            raise ValueError("Every source requires an explicit licence statement")
        url = urlparse(raw["url"])
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            raise ValueError("Source URL must be public HTTPS without credentials")
        retrieved = timestamp(raw["retrievedAt"])
        valid_until = min(expiry, timestamp(raw.get("validUntil", expiry)))
        if retrieved >= valid_until:
            raise ValueError("Source retrieval/expiry interval is invalid")
        sources.append({"id": raw["id"], "name": raw.get("name", raw["id"]), "url": raw["url"], "retrievedAt": retrieved, "validUntil": valid_until, "attribution": raw["attribution"], "license": license_text, "synthetic": False})
        # A mapping validates labels and units, not source accuracy or coverage.
        if "verticalDatum" in policy:
            if policy["verticalDatum"] not in DATUMS or policy.get("depthUnits") not in UNITS:
                raise ValueError("Unsupported reviewed datum or depth unit")
            if policy.get("sourceSoundingDatumCode") is None or policy.get("sourceDepthUnitCode") is None:
                raise ValueError("Reviewed mappings must identify original sounding datum and depth-unit codes")
            if not isinstance(policy.get("reviewedBy"), str) or not policy["reviewedBy"].strip():
                raise ValueError("Datum/unit mapping needs its reviewer")
            reviewed = timestamp(policy.get("reviewedAt"))
            if reviewed > generated:
                raise ValueError("Datum/unit mapping review cannot be in the future")
    require_real_sources(sources)
    bounds = manifest["bounds"]
    if not (-180 <= bounds[0] < bounds[2] <= 180 and -85 <= bounds[1] < bounds[3] <= 85):
        raise ValueError("Region bounds exceed supported map coordinates")
    pack = {"id": manifest["regionId"], "version": version, "name": name.strip(), "generatedAt": generated, "validUntil": expiry, "timezone": zone, "bounds": bounds, "validation": {"status": "unreviewed", "notice": "Imported real chart evidence; survey quality, full footprint coverage, tides, weather, restrictions, habitats and maritime review remain unresolved."}, "sources": sources, "coverage": [], "depths": [], "hazards": [], "restrictions": [], "tides": [], "weather": [], "places": [], "marks": [], "holdingAreas": [], "chart": {"attribution": "; ".join(dict.fromkeys(s["attribution"] for s in sources)), "offlineAllowed": False}}
    report = {"schemaVersion": 1, "sourceRegion": manifest["regionId"], "sourceVersion": manifest["version"], "version": version, "sourceMappings": mappings, "featureCounts": {}, "omitted": [], "sourceMetadataFeatures": [], "notice": "Omitted source geometry remains in analysis.sqlite. Point soundings never establish continuous depths; non-area hazards require reviewed geometry. No complete coverage, survey review, permissions or release approval was inferred."}
    source_ids = {source["id"] for source in sources}
    asset = next((item for item in manifest["assets"] if item["purpose"] == "analysis"), None)
    if asset is None:
        raise ValueError("Source pack has no analysis database")
    with sqlite3.connect(f"file:{(directory / asset['path']).resolve()}?mode=ro", uri=True) as db:
        # Cell-wide DSPM metadata is not sufficient where local datum/unit areas
        # exist. Resolving their intersections is a separate reviewed operation.
        local_overrides = {row[0] for row in db.execute("SELECT DISTINCT source_id FROM features WHERE object_class IN ('M_SDAT','M_UNIT')")}
        for fid, source, kind, shape, fields in db.execute("SELECT feature_id,source_id,object_class,geometry,properties FROM features ORDER BY row_id"):
            if source not in source_ids:
                raise ValueError("Feature references missing provenance")
            geometry, props = json.loads(shape), json.loads(fields)
            validate_geometry(geometry, require_gdal=True)
            report["featureCounts"][kind] = report["featureCounts"].get(kind, 0) + 1
            area = geometry["type"] in {"Polygon", "MultiPolygon"}
            item = {"id": fid, "geometry": geometry, "sourceIds": [source]}
            reason = None
            if kind in {"DEPARE", "DRGARE"} and area:
                mapping = mappings.get(source, {})
                if source in local_overrides:
                    reason = "Local sounding-datum or unit areas require reviewed spatial resolution"
                elif "verticalDatum" not in mapping:
                    reason = "No reviewed source datum/unit mapping"
                elif props.get("VERDAT") is not None and str(props["VERDAT"]) != str(mapping["sourceSoundingDatumCode"]):
                    reason = "Feature datum differs from reviewed cell mapping"
                elif str(props.get("soundingDatum")) != str(mapping["sourceSoundingDatumCode"]) or str(props.get("depthUnitsCode")) != str(mapping["sourceDepthUnitCode"]):
                    reason = "Source sounding datum or depth-unit code differs from reviewed mapping"
                else:
                    factor = UNITS[mapping["depthUnits"]]
                    lower, upper = bound(props.get("DRVAL1"), factor), bound(props.get("DRVAL2"), factor)
                    if lower is not None and upper is not None and lower > upper:
                        raise ValueError("Depth range is reversed")
                    pack["depths"].append({**item, "minDepthM": lower, "maxDepthM": upper, "verticalDatum": mapping["verticalDatum"], "surveyQuality": "unknown"})
            elif kind in HAZARD_CLASSES and area:
                pack["hazards"].append({**item, "kind": HAZARD_CLASSES[kind], "name": props.get("OBJNAM") or kind})
            elif kind in MARK_CLASSES and geometry["type"] == "Point":
                point = geometry["coordinates"]
                if len(point) != 2 or abs(point[1]) > 85:
                    reason = "Navigation mark is outside the supported coordinate schema"
                else:
                    label = props.get("OBJNAM") or kind
                    pack["marks"].append({"id": fid, "position": point, "name": label, "label": label, "kind": MARK_CLASSES[kind], "sourceIds": [source]})
            elif kind.startswith("M_"):
                report["sourceMetadataFeatures"].append({"id": fid, "objectClass": kind, "sourceId": source, "properties": props})
                reason = "Chart metadata retained for review; does not declare complete coverage"
            elif kind == "SOUNDG":
                reason = "Isolated sounding retained as a source point; no interpolated depth area"
            elif kind in HAZARD_CLASSES:
                reason = "Non-area hazard retained without a guessed buffer"
            else:
                reason = "Object class has no reviewed assessment mapping"
            if reason:
                report["omitted"].append({"id": fid, "objectClass": kind, "sourceId": source, "reason": reason})
    report["assembledCounts"] = {key: len(pack[key]) for key in ("depths", "hazards", "marks", "coverage")}
    return pack, report


def write_assessment(directory: Path, config: dict, output: Path) -> dict:
    if output.exists():
        raise ValueError("Assembly output already exists; choose a new version directory")
    pack, report = assemble_assessment(directory, config)
    output.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".assembly-", dir=output.parent))
    try:
        for filename, value in (("assessment.json", pack), ("assembly-report.json", report)):
            with (stage / filename).open("w") as file:
                json.dump(value, file, separators=(",", ":"), allow_nan=False)
                file.flush()
                os.fsync(file.fileno())
        os.replace(stage, output)
    except BaseException:
        shutil.rmtree(stage, ignore_errors=True)
        raise
    return {"output": str(output), "reviewStatus": "unreviewed", **report["assembledCounts"], "omitted": len(report["omitted"])}
