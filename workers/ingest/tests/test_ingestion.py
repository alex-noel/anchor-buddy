from __future__ import annotations

import io
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
import zipfile

from anchor_ingest.geometry import geometry_bounds, import_official_geojson, validate_update_sequence
from anchor_ingest.packs import build_pack, verify_pack
from anchor_ingest.sources import extract_exchange_set, parse_catalog

FIXTURES = Path(__file__).parents[1] / "fixtures"


class IngestionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.features = json.loads((FIXTURES / "features.geojson").read_text())["features"]
        self.recipe = json.loads((FIXTURES / "recipe.json").read_text())

    def build(self, version="v1", **kwargs):
        return build_pack(root=self.root, region_id="keys", version=version, features=self.features, provenance=self.recipe["provenance"], bounds=self.recipe["bounds"], valid_until=self.recipe["validUntil"], synthetic=True, **kwargs)

    def test_pack_preserves_holes_and_raw_depth_and_unknown_quality(self):
        manifest = self.build()
        directory = self.root / "keys/v1"
        self.assertEqual(manifest["releaseStatus"], "review-required")
        self.assertEqual(verify_pack(directory)["version"], "v1")
        with sqlite3.connect(directory / "analysis.sqlite") as database:
            geometry, lower, upper, quality = database.execute("SELECT geometry, min_depth_m,max_depth_m,survey_quality FROM features WHERE object_class='DEPARE'").fetchone()
            self.assertEqual(json.loads(geometry), self.features[0]["geometry"])
            self.assertEqual((lower, upper, quality), (3, 6, "unreviewed"))
            self.assertEqual(database.execute("SELECT count(*) FROM feature_bounds").fetchone()[0], 2)

    def test_corrupt_asset_is_rejected(self):
        self.build()
        directory = self.root / "keys/v1"
        with (directory / "display.geojson").open("a") as file:
            file.write("tampered")
        with self.assertRaisesRegex(ValueError, "integrity"):
            verify_pack(directory)

    def test_failed_update_keeps_previous_complete_pointer(self):
        self.build()
        with self.assertRaises(FileNotFoundError):
            self.build("v2", attachments={"weather.json": (self.root / "missing.json", "forecast")})
        self.assertEqual(json.loads((self.root / "keys/current.json").read_text()), {"version": "v1"})
        verify_pack(self.root / "keys/v1")
        self.assertFalse((self.root / "keys/v2").exists())

    def test_existing_version_cannot_be_overwritten(self):
        self.build()
        with self.assertRaisesRegex(ValueError, "immutable"):
            self.build()

    def test_synthetic_cannot_be_reviewed(self):
        with self.assertRaisesRegex(ValueError, "Synthetic"):
            self.build(review={"maritime": True, "coverage": True, "geometry": True, "stationMappings": True, "onWaterValidation": True, "reviewedBy": "fixture", "reviewedAt": "2026-10-30"})

    def test_missing_update_is_rejected(self):
        base = self.root / "TEST.000"
        base.touch()
        (self.root / "TEST.002").touch()
        with self.assertRaisesRegex(ValueError, "missing"):
            validate_update_sequence(base)
        (self.root / "TEST.001").touch()
        self.assertEqual(len(validate_update_sequence(base)), 3)

    def test_archive_traversal_rejected(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as archive:
            archive.writestr("../escape.txt", "bad")
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            extract_exchange_set(data.getvalue(), self.root / "incoming")

    def test_catalog_source_and_entities(self):
        records = parse_catalog((FIXTURES / "catalog.xml").read_bytes())
        self.assertEqual(records[0]["cell"], "US5TEST1")
        self.assertEqual(records[0]["bounds"]["westBoundLongitude"], -82)
        with self.assertRaisesRegex(ValueError, "entities"):
            parse_catalog(b'<!DOCTYPE x [<!ENTITY foo "bar">]><x/>')

    def test_rule_import_does_not_resolve_applicability(self):
        features = import_official_geojson(FIXTURES / "features.geojson", source_id="rules", source_url="https://example.invalid/fixture", jurisdiction="fixture", valid_from="2026-01-01T00:00:00Z", valid_until="2099-01-01T00:00:00Z", synthetic=True)
        self.assertFalse(features[0]["properties"]["applicabilityResolved"])

    def test_non_finite_coordinates_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "Non-finite"):
            geometry_bounds({"type": "Point", "coordinates": [float("nan"), 24.5]})

    def test_optional_offline_style_is_hashed_and_requires_approved_rights(self):
        style = self.root / "style.json"
        style.write_text(json.dumps({"version": 8, "sources": {}, "layers": []}))
        approval = {"styleUrl": "https://charts.example.org/style.json", "styleAsset": "style.json", "resourceOrigins": ["https://charts.example.org"], "minZoom": 7, "maxZoom": 15, "rights": "operator-owned-or-licensed", "approvedBy": "fixture", "approvedAt": "2026-10-30T00:00:00Z"}
        result = self.build(attachments={"style.json": (style, "display")}, offline_chart=approval)
        self.assertEqual(result["offlineChart"], approval)
        self.assertTrue(any(asset["path"] == "style.json" and len(asset["sha256"]) == 64 for asset in result["assets"]))
        approval["rights"] = "unverified"
        with self.assertRaisesRegex(ValueError, "rights"):
            self.build("v2", attachments={"style.json": (style, "display")}, offline_chart=approval)


if __name__ == "__main__":
    unittest.main()
