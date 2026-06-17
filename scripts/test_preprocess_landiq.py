"""Tests for scripts/preprocess_landiq.py -- run with: pytest scripts/test_preprocess_landiq.py -v"""
import json
import subprocess
import sys
import textwrap
from pathlib import Path

SCRIPT = Path(__file__).parent / "preprocess_landiq.py"

# ---------------------------------------------------------------------------
# Import the module under test (direct import, not subprocess, for unit tests)
# ---------------------------------------------------------------------------
import importlib.util

def _load_module():
    spec = importlib.util.spec_from_file_location("preprocess_landiq", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _normalize(mod, main_crop, acres=10.0, county="fresno", resources=None):
    """Helper: call mod.normalize_feature() with a minimal input properties dict."""
    props = {"main_crop": main_crop, "acres": acres, "county": county}
    if resources is not None:
        props["resources"] = resources
    return mod.normalize_feature(props)


# ---------------------------------------------------------------------------
# Unit tests for normalize_feature()
# ---------------------------------------------------------------------------

class TestNormalizeFeature:
    def setup_method(self):
        self.mod = _load_module()

    def test_lowercase_to_canonical_almonds(self):
        out = _normalize(self.mod, "almonds")
        assert out["main_crop_name"] == "Almonds"
        assert out["main_crop_code"] == ""

    def test_lowercase_to_canonical_corn(self):
        out = _normalize(self.mod, "corn, sorghum and sudan")
        assert out["main_crop_name"] == "Corn, Sorghum and Sudan"

    def test_lowercase_to_canonical_sugar_beets(self):
        # "Sugar beets" has mixed case -- verify auto-correct via lower() round-trip
        out = _normalize(self.mod, "sugar beets")
        assert out["main_crop_name"] == "Sugar beets"

    def test_citrus_special_case(self):
        # "citrus" does NOT match "citrus and subtropical" -- needs explicit override
        out = _normalize(self.mod, "citrus")
        assert out["main_crop_name"] == "Citrus and Subtropical"
        assert out["main_crop_code"] == ""

    def test_urban_u(self):
        out = _normalize(self.mod, "u")
        assert out["main_crop_code"] == "U"
        assert out["main_crop_name"] == "Unclassified"

    def test_urban_ul2(self):
        out = _normalize(self.mod, "ul2")
        assert out["main_crop_code"] == "U"
        assert out["main_crop_name"] == "Unclassified"

    def test_passthrough_fields(self):
        out = _normalize(self.mod, "almonds", acres=45.3, county="kern")
        assert out["acres"] == 45.3
        assert out["county"] == "kern"

    def test_resources_pipe_encoding(self):
        out = _normalize(self.mod, "almonds", resources=["almond hulls", "almond shells"])
        assert out["resources"] == "almond hulls|almond shells"

    def test_null_resources_omitted(self):
        out = _normalize(self.mod, "almonds", resources=None)
        # property dict passed has no 'resources' key (None means not passed)
        assert "resources" not in out

    def test_empty_resources_omitted(self):
        out = _normalize(self.mod, "almonds", resources=[])
        assert "resources" not in out

    def test_masked_county_passthrough(self):
        out = _normalize(self.mod, "almonds", county="****")
        assert out["county"] == "****"

    def test_no_geoid_in_output(self):
        props = {"main_crop": "almonds", "acres": 5.0, "county": "fresno", "geoid": "06019", "tileset_id": "abc"}
        out = self.mod.normalize_feature(props)
        assert "geoid" not in out
        assert "tileset_id" not in out


# ---------------------------------------------------------------------------
# Abort test: unknown crop value must cause exit code 1
# ---------------------------------------------------------------------------

class TestUnknownCropAborts:
    def test_unknown_crop_exits_nonzero(self, tmp_path):
        # Build a tiny GeoJSON file with one unknown crop
        feature = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [0, 0]},
            "properties": {"main_crop": "unknown_crop_xyz", "acres": 1.0, "county": "test"}
        }
        fc = {"type": "FeatureCollection", "features": [feature]}
        infile = tmp_path / "test_input.geojson"
        outfile = tmp_path / "test_output.geojsons"
        infile.write_text(json.dumps(fc))
        result = subprocess.run(
            [sys.executable, str(SCRIPT), str(infile), str(outfile)],
            capture_output=True, text=True
        )
        assert result.returncode != 0, "Expected non-zero exit for unknown crop"

    def test_known_crop_exits_zero(self, tmp_path):
        feature = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [0, 0]},
            "properties": {"main_crop": "almonds", "acres": 1.0, "county": "fresno"}
        }
        fc = {"type": "FeatureCollection", "features": [feature]}
        infile = tmp_path / "test_input.geojson"
        outfile = tmp_path / "test_output.geojsons"
        infile.write_text(json.dumps(fc))
        result = subprocess.run(
            [sys.executable, str(SCRIPT), str(infile), str(outfile)],
            capture_output=True, text=True
        )
        assert result.returncode == 0, f"Expected exit 0 for known crop; stderr: {result.stderr}"

    def test_output_is_valid_geojsonseq(self, tmp_path):
        features = [
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [0, 0]},
             "properties": {"main_crop": "almonds", "acres": 5.0, "county": "fresno",
                            "resources": ["almond hulls", "almond shells"]}},
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [1, 1]},
             "properties": {"main_crop": "u", "acres": 10.0, "county": "los angeles"}},
        ]
        fc = {"type": "FeatureCollection", "features": features}
        infile = tmp_path / "in.geojson"
        outfile = tmp_path / "out.geojsons"
        infile.write_text(json.dumps(fc))
        result = subprocess.run(
            [sys.executable, str(SCRIPT), str(infile), str(outfile)],
            capture_output=True, text=True
        )
        assert result.returncode == 0, result.stderr
        lines = outfile.read_text().strip().split("\n")
        assert len(lines) == 2
        f1 = json.loads(lines[0])
        assert f1["properties"]["main_crop_name"] == "Almonds"
        assert f1["properties"]["resources"] == "almond hulls|almond shells"
        f2 = json.loads(lines[1])
        assert f2["properties"]["main_crop_code"] == "U"
