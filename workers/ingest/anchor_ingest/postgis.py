from __future__ import annotations

import json
import os
from pathlib import Path
import sqlite3

from .packs import verify_pack


def index_pack(directory: Path) -> dict:
    """Transactional operator index. Reads DATABASE_URL; never prints credentials."""
    manifest = verify_pack(directory)
    try:
        import psycopg
    except ImportError:
        raise RuntimeError("PostGIS indexing requires the postgres optional dependency (psycopg)") from None
    connection_string = os.environ.get("DATABASE_URL")
    if not connection_string:
        raise ValueError("DATABASE_URL is required for PostGIS indexing")
    asset = next((item for item in manifest["assets"] if item["purpose"] == "analysis"), None)
    if asset is None:
        raise ValueError("Pack has no analysis asset")
    prefix = manifest["regionId"] + ":" + manifest["version"] + ":"
    with sqlite3.connect(directory / asset["path"]) as source, psycopg.connect(connection_string, connect_timeout=10) as database:
        with database.cursor() as cursor:
            for provenance in manifest["provenance"]:
                cursor.execute("""INSERT INTO source_snapshots (id,provider_id,source_url,retrieved_at,valid_until,sha256,provenance,review_status)
                                  VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING""",
                               (prefix + provenance["id"], provenance["id"], provenance["url"], provenance["retrievedAt"], manifest["validUntil"], provenance.get("sha256", asset["sha256"]), json.dumps(provenance), manifest["releaseStatus"]))
            count = 0
            for feature_id, source_id, kind, geometry, properties, lower, upper, datum in source.execute("SELECT feature_id,source_id,object_class,geometry,properties,min_depth_m,max_depth_m,vertical_datum FROM features"):
                cursor.execute("""INSERT INTO nautical_features (id,source_id,kind,geometry,properties,depth_lower_m,depth_upper_m,vertical_datum)
                                  VALUES (%s,%s,%s,ST_SetSRID(ST_GeomFromGeoJSON(%s),4326),%s,%s,%s,%s)
                                  ON CONFLICT (id) DO NOTHING""",
                               (prefix + feature_id, prefix + source_id, kind, geometry, properties, lower, upper, datum))
                count += 1
            cursor.execute("INSERT INTO regional_packs (region_id,version,manifest) VALUES (%s,%s,%s) ON CONFLICT (region_id,version) DO NOTHING", (manifest["regionId"], manifest["version"], json.dumps(manifest)))
    return {"regionId": manifest["regionId"], "version": manifest["version"], "indexedFeatures": count, "releaseStatus": manifest["releaseStatus"]}
