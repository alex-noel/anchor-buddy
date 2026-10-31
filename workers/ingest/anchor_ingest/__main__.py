from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from .geometry import extract_s57, import_official_geojson
from .packs import build_pack, publish_object_store, verify_pack
from .sources import CATALOG_URL, NOAA_HOSTS, download_cells, fetch_bytes, parse_catalog
from .postgis import index_pack


def main() -> None:
    parser = argparse.ArgumentParser(description="Anchor Buddy source ingestion. Real data remains review-required until explicit release gates are met.")
    commands = parser.add_subparsers(dest="command", required=True)
    catalog = commands.add_parser("catalog", help="List the NOAA Florida ENC catalog; does not download ENC cells")
    catalog.add_argument("--url", default=CATALOG_URL)
    catalog.add_argument("--file", type=Path, help="Read a saved catalog without network")
    download = commands.add_parser("download", help="Download explicitly selected ENC cells with provenance")
    download.add_argument("--cell", action="append", required=True)
    download.add_argument("--output", type=Path, required=True)
    download.add_argument("--catalog-url", default=CATALOG_URL)
    extract = commands.add_parser("extract", help="Apply contiguous S-57 updates and preserve unsimplified geometry")
    extract.add_argument("base", type=Path)
    extract.add_argument("--output", type=Path, required=True)
    official = commands.add_parser("official", help="Import authoritative restrictions, habitats or spatial notices without assuming rule applicability")
    official.add_argument("input", type=Path)
    official.add_argument("--source-id", required=True)
    official.add_argument("--source-url", required=True)
    official.add_argument("--jurisdiction", required=True)
    official.add_argument("--valid-from", required=True)
    official.add_argument("--valid-until", required=True)
    official.add_argument("--output", type=Path, required=True)
    build = commands.add_parser("build", help="Build a versioned regional pack from a JSON operator recipe")
    build.add_argument("recipe", type=Path)
    build.add_argument("--root", type=Path, required=True)
    build.add_argument("--tiles", action="store_true", help="Requires separately installed tippecanoe")
    verify = commands.add_parser("verify", help="Verify every artifact checksum and size")
    verify.add_argument("directory", type=Path)
    publish = commands.add_parser("publish", help="Publish a verified pack to a configured S3-compatible bucket")
    publish.add_argument("directory", type=Path)
    publish.add_argument("--destination", required=True)
    index = commands.add_parser("index-postgis", help="Transactionally index a verified pack in configured PostGIS; requires DATABASE_URL")
    index.add_argument("directory", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "catalog":
            data = args.file.read_bytes() if args.file else fetch_bytes(args.url, allowed_hosts=NOAA_HOSTS, limit=25_000_000)
            result = parse_catalog(data)
        elif args.command == "download":
            result = download_cells(args.cell, args.output, args.catalog_url)
        elif args.command == "extract":
            features, metadata = extract_s57(args.base)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(json.dumps({"type": "FeatureCollection", "features": features, "encMetadata": metadata}, indent=2))
            result = {"output": str(args.output), "features": len(features), "metadata": metadata}
        elif args.command == "official":
            features = import_official_geojson(args.input, source_id=args.source_id, source_url=args.source_url, jurisdiction=args.jurisdiction, valid_from=args.valid_from, valid_until=args.valid_until)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
            result = {"output": str(args.output), "features": len(features), "applicabilityResolved": False}
        elif args.command == "build":
            recipe = json.loads(args.recipe.read_text())
            base = args.recipe.resolve().parent
            features = []
            for file in recipe["featureFiles"]:
                features.extend(json.loads((base / file).read_text())["features"])
            result = build_pack(root=args.root, region_id=recipe["regionId"], version=recipe["version"], features=features, provenance=recipe["provenance"], bounds=recipe["bounds"], valid_until=recipe["validUntil"], synthetic=recipe.get("synthetic", False), review=recipe.get("review"), attachments={item["name"]: (base / item["file"], item["purpose"]) for item in recipe.get("attachments", [])}, create_tiles=args.tiles, offline_chart=recipe.get("offlineChart"))
        elif args.command == "verify":
            result = verify_pack(args.directory)
        elif args.command == "index-postgis":
            result = index_pack(args.directory)
        else:
            publish_object_store(args.directory, args.destination)
            result = {"published": True, "destination": args.destination}
        print(json.dumps(result, indent=2))
    except (ValueError, RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
