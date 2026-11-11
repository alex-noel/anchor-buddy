from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from anchor_ingest.assessment import assemble_assessment, write_assessment
from anchor_ingest.geometry import validate_geometry
from anchor_ingest.packs import build_pack


class AssessmentAssemblyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        now = datetime.now(timezone.utc)
        self.retrieved = (now - timedelta(minutes=5)).isoformat()
        self.expiry = (now + timedelta(days=2)).isoformat()
        self.geometry = {"type": "Polygon", "coordinates": [[[0, 0], [.1, 0], [.1, .1], [0, .1], [0, 0]], [[.04, .04], [.04, .06], [.06, .06], [.06, .04], [.04, .04]]]}
        self.features = [{"id": "cell:depth", "geometry": self.geometry, "properties": {"sourceId": "cell", "objectClass": "DEPARE", "DRVAL1": 3, "DRVAL2": 6, "soundingDatum": 12, "verticalDatum": 16, "depthUnitsCode": 1}}, {"id": "cell:rock", "geometry": {"type": "Point", "coordinates": [.01, .01]}, "properties": {"sourceId": "cell", "objectClass": "UWTROC", "VALSOU": 1}}]
        self.config = {"name": "Isolated contract-test source", "timezone": "UTC", "sourceMappings": {"cell": {"license": "Test-only source declaration", "verticalDatum": "MLLW", "depthUnits": "metres", "sourceSoundingDatumCode": 12, "sourceDepthUnitCode": 1, "reviewedBy": "Isolated test reviewer", "reviewedAt": self.retrieved}}}
        # Contract tests only replace the external GDAL dependency. No fixture can
        # enter a runtime pack unless its source identity explicitly declares real.
        self.gdal = patch("anchor_ingest.assessment.validate_geometry", side_effect=lambda geometry, **_: validate_geometry(geometry, require_gdal=False))
        self.gdal.start()
        self.addCleanup(self.gdal.stop)

    def build(self):
        with patch("anchor_ingest.packs.validate_geometry", side_effect=lambda geometry, **_: validate_geometry(geometry, require_gdal=False)):
            build_pack(root=self.root, region_id="contract", version="v1", features=self.features, provenance=[{"id": "cell", "url": "https://example.invalid/test-only", "retrievedAt": self.retrieved, "attribution": "Isolated contract test", "synthetic": False}], bounds=[0, 0, .1, .1], valid_until=self.expiry, synthetic=False)
        return self.root / "contract/v1"

    def test_unreviewed_assembly_preserves_holes_and_does_not_create_coverage(self):
        pack, report = assemble_assessment(self.build(), self.config)
        self.assertEqual(pack["depths"][0]["geometry"], self.geometry)
        self.assertEqual(pack["depths"][0]["surveyQuality"], "unknown")
        self.assertEqual(pack["depths"][0]["verticalDatum"], "MLLW")
        self.assertEqual(pack["validation"]["status"], "unreviewed")
        self.assertEqual(pack["coverage"], [])
        self.assertEqual(pack["tides"], [])
        self.assertEqual(pack["weather"], [])
        self.assertEqual(pack["hazards"], [])
        self.assertTrue(any(item["id"] == "cell:rock" and "guessed buffer" in item["reason"] for item in report["omitted"]))

    def test_missing_mapping_and_wrong_sounding_datum_do_not_infer_depths(self):
        path = self.build()
        config = copy.deepcopy(self.config)
        del config["sourceMappings"]["cell"]["verticalDatum"]
        self.assertEqual(assemble_assessment(path, config)[0]["depths"], [])
        config = copy.deepcopy(self.config)
        config["sourceMappings"]["cell"]["sourceSoundingDatumCode"] = 16  # VDAT is not SDAT.
        self.assertEqual(assemble_assessment(path, config)[0]["depths"], [])

    def test_unknown_bounds_survive_and_units_are_explicitly_converted(self):
        self.features[0]["properties"].update(DRVAL1=None, DRVAL2=10, depthUnitsCode=3)
        self.config["sourceMappings"]["cell"].update(depthUnits="feet", sourceDepthUnitCode=3)
        path = self.build()
        pack, _ = assemble_assessment(path, self.config)
        self.assertIsNone(pack["depths"][0]["minDepthM"])
        self.assertAlmostEqual(pack["depths"][0]["maxDepthM"], 3.048)
        with sqlite3.connect(path / "analysis.sqlite") as db:
            self.assertEqual(db.execute("SELECT min_depth_m,max_depth_m FROM features WHERE object_class='DEPARE'").fetchone(), (None, None))

    def test_local_datum_areas_block_cell_wide_mapping(self):
        self.features.append({"id": "local-datum", "geometry": self.geometry, "properties": {"sourceId": "cell", "objectClass": "M_SDAT", "VERDAT": 23}})
        pack, report = assemble_assessment(self.build(), self.config)
        self.assertEqual(pack["depths"], [])
        self.assertTrue(any("spatial resolution" in item["reason"] for item in report["omitted"]))

    def test_polygon_hazards_and_point_marks_keep_exact_source_geometry(self):
        self.features += [{"id": "land", "geometry": self.geometry, "properties": {"sourceId": "cell", "objectClass": "LNDARE"}}, {"id": "mark", "geometry": {"type": "Point", "coordinates": [.02, .02]}, "properties": {"sourceId": "cell", "objectClass": "BOYLAT", "OBJNAM": "Source mark"}}, {"id": "point", "geometry": {"type": "Point", "coordinates": [.03, .03, 7]}, "properties": {"sourceId": "cell", "objectClass": "SOUNDG", "DEPTH": 7}}]
        pack, report = assemble_assessment(self.build(), self.config)
        self.assertEqual(pack["hazards"][0]["geometry"], self.geometry)
        self.assertEqual(pack["marks"][0]["position"], [.02, .02])
        self.assertEqual(len(pack["depths"]), 1)
        self.assertTrue(any(item["id"] == "point" and "Isolated sounding" in item["reason"] for item in report["omitted"]))

    def test_no_mapping_review_or_licence_cannot_be_assumed(self):
        path = self.build()
        for key in ["license", "reviewedAt", "reviewedBy", "sourceDepthUnitCode"]:
            config = copy.deepcopy(self.config)
            del config["sourceMappings"]["cell"][key]
            with self.assertRaises(ValueError):
                assemble_assessment(path, config)

    def test_integrity_failure_blocks_assembly_and_version_is_immutable(self):
        path = self.build()
        output = self.root / "assembled"
        result = write_assessment(path, self.config, output)
        self.assertEqual(result["depths"], 1)
        with self.assertRaisesRegex(ValueError, "already exists"):
            write_assessment(path, self.config, output)
        with (path / "analysis.sqlite").open("ab") as file:
            file.write(b"tampering")
        with self.assertRaisesRegex(ValueError, "integrity"):
            assemble_assessment(path, self.config)
        self.assertTrue((output / "assessment.json").is_file())

    def test_synthetic_config_is_rejected_before_output(self):
        config = {**self.config, "synthetic": True}
        with self.assertRaisesRegex(ValueError, "Synthetic"):
            write_assessment(self.build(), config, self.root / "assembled")
        self.assertFalse((self.root / "assembled").exists())


if __name__ == "__main__":
    unittest.main()
