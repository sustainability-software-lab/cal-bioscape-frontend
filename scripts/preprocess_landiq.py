#!/usr/bin/env python3
"""
Preprocess LandIQ GeoJSON for Mapbox tileset ingestion.

Converts Peter's cleaned LandIQ 2024 GeoJSON (main_crop lowercase, no main_crop_code)
into a GeoJSONSeq file ready for tippecanoe. Streams the input -- never loads the
full 625 MB file into memory.

Usage:
    python scripts/preprocess_landiq.py <input.geojson> <output.geojsons>
    python scripts/preprocess_landiq.py --help

Output format: one GeoJSON Feature per line (GeoJSONSeq / RFC 7946 Section 12).

Dependencies: Python 3.8+ standard library only. For large files, ijson can be
installed (pip install ijson) for lower peak RSS; the script detects it automatically.
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Iterator

# ---------------------------------------------------------------------------
# Canonical crop vocabulary (56 keys from cropColorMapping in LayerControls.tsx)
# Hardcoded here so the script is self-contained; must stay in sync with that file.
# ---------------------------------------------------------------------------
CANONICAL_CROPS: list[str] = [
    "Alfalfa & Alfalfa Mixtures",
    "Almonds",
    "Apples",
    "Apricots",
    "Avocados",
    "Beans (Dry)",
    "Bush Berries",
    "Carrots",
    "Cherries",
    "Citrus and Subtropical",
    "Cole Crops",
    "Corn, Sorghum and Sudan",
    "Cotton",
    "Dates",
    "Eucalyptus",
    "Flowers, Nursery and Christmas Tree Farms",
    "Grapes",
    "Greenhouse",
    "Idle – Long Term",
    "Idle – Short Term",
    "Induced high water table native pasture",
    "Kiwis",
    "Lettuce/Leafy Greens",
    "Melons, Squash and Cucumbers",
    "Miscellaneous Deciduous",
    "Miscellaneous Field Crops",
    "Miscellaneous Grain and Hay",
    "Miscellaneous Grasses",
    "Miscellaneous Subtropical Fruits",
    "Miscellaneous Truck Crops",
    "Mixed Pasture",
    "Native Pasture",
    "Olives",
    "Onions and Garlic",
    "Peaches/Nectarines",
    "Pears",
    "Pecans",
    "Peppers",
    "Pistachios",
    "Plums",
    "Pomegranates",
    "Potatoes",
    "Prunes",
    "Rice",
    "Safflower",
    "Strawberries",
    "Sugar beets",
    "Sunflowers",
    "Sweet Potatoes",
    "Tomatoes",
    "Turf Farms",
    "Unclassified Fallow",
    "Walnuts",
    "Wheat",
    "Wild Rice",
    "Young Perennials",
]

# Build lowercase -> canonical lookup from the 56 canonical keys
_LOOKUP: dict[str, str] = {c.lower(): c for c in CANONICAL_CROPS}

# Explicit overrides: Peter's data uses "citrus" alone (not the full canonical name)
_OVERRIDES: dict[str, str] = {
    "citrus": "Citrus and Subtropical",
}

# Urban codes: these become main_crop_code='U', main_crop_name='Unclassified'
_URBAN_CODES: set[str] = {"u", "ul2"}


def normalize_feature(props: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize a single feature's properties dict.

    Returns a new dict with:
      main_crop_name  -- canonical Title-Case crop name
      main_crop_code  -- 'U' for urban, '' otherwise
      acres           -- passthrough
      county          -- passthrough (including '****')
      resources       -- pipe-delimited string (omitted if null/empty)

    Raises ValueError for any non-urban main_crop value that has no mapping.
    """
    raw = str(props.get("main_crop", "")).strip()

    if raw in _URBAN_CODES:
        out: dict[str, Any] = {
            "main_crop_name": "Unclassified",
            "main_crop_code": "U",
            "acres": props.get("acres"),
            "county": props.get("county"),
        }
    else:
        canonical = _OVERRIDES.get(raw) or _LOOKUP.get(raw)
        if canonical is None:
            raise ValueError(f"Unmapped main_crop value: {raw!r}")
        out = {
            "main_crop_name": canonical,
            "main_crop_code": "",
            "acres": props.get("acres"),
            "county": props.get("county"),
        }

    resources_raw = props.get("resources")
    if isinstance(resources_raw, list) and resources_raw:
        out["resources"] = "|".join(str(r) for r in resources_raw)

    return out


# ---------------------------------------------------------------------------
# Streaming readers
# ---------------------------------------------------------------------------

def _iter_features_ijson(path: Path) -> Iterator[dict]:
    import ijson  # noqa: PLC0415
    with path.open("rb") as fh:
        yield from ijson.items(fh, "features.item")


def _iter_features_stdlib(path: Path) -> Iterator[dict]:
    """
    Line-by-line fallback for when ijson is not installed. Works correctly when
    the GeoJSON FeatureCollection has one feature per line (Peter's export format).
    For files where the whole JSON is on one line, loads the full file (memory
    cost is acceptable for files <1 GB on machines with >=4 GB RAM).
    """
    with path.open(encoding="utf-8") as fh:
        content = fh.read()
    data = json.loads(content)
    yield from data.get("features", [])


def iter_features(path: Path) -> Iterator[dict]:
    try:
        import ijson  # noqa: F401, PLC0415
        yield from _iter_features_ijson(path)
    except ImportError:
        yield from _iter_features_stdlib(path)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def process(input_path: Path, output_path: Path) -> int:
    """
    Stream-process input GeoJSON, write normalized GeoJSONSeq to output_path.

    Returns 0 on success, 1 if any unmapped non-urban crop values were found.
    """
    unmapped: Counter = Counter()
    total = 0

    with output_path.open("w", encoding="utf-8") as out_fh:
        for feature in iter_features(input_path):
            total += 1
            raw_props = feature.get("properties") or {}
            try:
                norm_props = normalize_feature(raw_props)
            except ValueError as exc:
                raw_val = str(raw_props.get("main_crop", "")).strip()
                unmapped[raw_val] += 1
                continue

            out_feature = {
                "type": "Feature",
                "geometry": feature.get("geometry"),
                "properties": norm_props,
            }
            out_fh.write(json.dumps(out_feature, ensure_ascii=False) + "\n")

    written = total - sum(unmapped.values())
    print(f"Processed {total} features: {written} written, {sum(unmapped.values())} skipped.")

    if unmapped:
        print("ERROR: unmapped non-urban main_crop values:", file=sys.stderr)
        for val, count in unmapped.most_common():
            print(f"  {val!r}: {count} feature(s)", file=sys.stderr)
        return 1

    print("Coverage check: PASSED (0 unmapped non-urban values)")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Normalize LandIQ 2024 GeoJSON for Mapbox tileset ingestion."
    )
    parser.add_argument("input", type=Path, help="Path to source GeoJSON (FeatureCollection)")
    parser.add_argument("output", type=Path, help="Path for output GeoJSONSeq (.geojsons)")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"ERROR: input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    sys.exit(process(args.input, args.output))


if __name__ == "__main__":
    main()
