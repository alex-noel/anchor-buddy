from __future__ import annotations

import json
import math
from pathlib import Path


def geometry_bounds(geometry: dict) -> tuple[float, float, float, float]:
    if geometry.get("type") == "GeometryCollection":
        bounds = [geometry_bounds(item) for item in geometry.get("geometries", [])]
        if not bounds:
            raise ValueError("Empty geometry collection")
        return min(b[0] for b in bounds), min(b[1] for b in bounds), max(b[2] for b in bounds), max(b[3] for b in bounds)
    points = []

    def walk(value):
        if not isinstance(value, list) or not value:
            raise ValueError("Empty or invalid coordinates")
        if isinstance(value[0], (int, float)):
            if len(value) < 2 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in value):
                raise ValueError("Non-finite coordinate")
            if abs(value[0]) > 180 or abs(value[1]) > 90:
                raise ValueError("Expected WGS84 longitude/latitude")
            points.append(value)
        else:
            for item in value:
                walk(item)

    walk(geometry.get("coordinates"))
    return min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)


def validate_geometry(geometry: dict, *, require_gdal: bool) -> None:
    geometry_bounds(geometry)
    try:
        from osgeo import ogr
    except ImportError:
        if require_gdal:
            raise RuntimeError("GDAL is required to validate real source geometry") from None
        return
    value = ogr.CreateGeometryFromJson(json.dumps(geometry))
    if value is None or value.IsEmpty() or not value.IsValid():
        raise ValueError("Invalid source geometry; repair must be reviewed, never silently applied")


def validate_update_sequence(base: Path) -> list[Path]:
    if base.suffix != ".000" or not base.is_file():
        raise ValueError("ENC base .000 is required")
    numbered = sorted([path for path in base.parent.glob(base.stem + ".*") if path.suffix[1:].isdigit()], key=lambda path: int(path.suffix[1:]))
    numbers = [int(path.suffix[1:]) for path in numbered]
    if not numbers or numbers != list(range(max(numbers) + 1)):
        raise ValueError("ENC update sequence has missing or duplicate members")
    return numbered


def extract_s57(base: Path) -> tuple[list[dict], dict]:
    sequence = validate_update_sequence(base)
    try:
        from osgeo import gdal
    except ImportError:
        raise RuntimeError("S-57 ingestion requires GDAL with its S57 driver and object catalog") from None
    gdal.UseExceptions()
    messages = []

    def handler(level, code, message):
        if level >= gdal.CE_Warning:
            messages.append(message)

    gdal.PushErrorHandler(handler)
    try:
        dataset = gdal.OpenEx(str(base), gdal.OF_VECTOR, allowed_drivers=["S57"], open_options=["UPDATES=APPLY", "RETURN_PRIMITIVES=OFF", "SPLIT_MULTIPOINT=ON", "ADD_SOUNDG_DEPTH=ON", "LNAM_REFS=ON"])
        if dataset is None:
            raise ValueError("GDAL could not open ENC")
        metadata = {}
        features = []
        for layer in dataset:
            layer_name = layer.GetName()
            for feature in layer:
                fields = {key: feature.GetField(key) for key in feature.keys()}
                if layer_name == "DSID":
                    metadata = fields
                    continue
                shape = feature.GetGeometryRef()
                if shape is None:
                    continue
                geometry = json.loads(shape.ExportToJson())
                validate_geometry(geometry, require_gdal=True)
                features.append({"type": "Feature", "id": f"{base.stem}:{layer_name}:{feature.GetFID()}", "geometry": geometry, "properties": {**fields, "sourceId": base.stem, "objectClass": layer_name, "sourceEdition": None, "verticalDatum": None, "geometryUnmodified": True}})
        if messages:
            raise ValueError("GDAL reported an ENC/update warning: " + "; ".join(messages))
        if not metadata:
            raise ValueError("ENC lacks DSID metadata")
        # Preserve raw identifiers. Datum codes require a reviewed lookup before assessment.
        for feature in features:
            feature["properties"]["sourceEdition"] = metadata.get("DSID_EDTN")
            feature["properties"]["verticalDatum"] = metadata.get("DSPM_VDAT")
        return features, {"baseFile": base.name, "updateSequence": [path.name for path in sequence], "metadata": metadata}
    finally:
        gdal.PopErrorHandler()


def import_official_geojson(path: Path, *, source_id: str, source_url: str, jurisdiction: str, valid_from: str, valid_until: str, synthetic: bool = False) -> list[dict]:
    from datetime import datetime
    from urllib.parse import urlparse
    if not synthetic and (urlparse(source_url).scheme != "https" or not (urlparse(source_url).hostname or "").endswith(".gov")):
        raise ValueError("Official rule/habitat/notice input needs its authoritative .gov source URL")
    if datetime.fromisoformat(valid_until.replace("Z", "+00:00")) <= datetime.fromisoformat(valid_from.replace("Z", "+00:00")):
        raise ValueError("Invalid source validity interval")
    data = json.loads(path.read_text())
    if data.get("type") != "FeatureCollection":
        raise ValueError("Expected GeoJSON FeatureCollection")
    features = []
    for index, feature in enumerate(data["features"]):
        validate_geometry(feature["geometry"], require_gdal=not synthetic)
        features.append({**feature, "id": f"{source_id}:{feature.get('id', index)}", "properties": {**feature.get("properties", {}), "sourceId": source_id, "sourceUrl": source_url, "jurisdiction": jurisdiction, "validFrom": valid_from, "validUntil": valid_until, "applicabilityResolved": False, "geometryUnmodified": True}})
    return features
