"""Bounded downloads and provenance for authoritative source snapshots."""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import stat
import time
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET
import zipfile

CATALOG_URL = "https://charts.noaa.gov/ENCs/FL_ENCProdCat_19115.xml"
NOAA_HOSTS = {"charts.noaa.gov", "distribution.charts.noaa.gov"}


def fetch_bytes(url: str, *, allowed_hosts: set[str], limit: int = 100_000_000) -> bytes:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in allowed_hosts or parsed.username or parsed.password:
        raise ValueError("Source URL is outside the HTTPS provider allowlist")
    request = Request(url, headers={"User-Agent": "Anchor Buddy-ingest/0.1 (operator configured source collection)", "Accept": "*/*"})
    with urlopen(request, timeout=30) as response:
        if urlparse(response.url).hostname not in allowed_hosts or urlparse(response.url).scheme != "https":
            raise ValueError("Source redirect escaped provider allowlist")
        if int(response.headers.get("Content-Length", "0")) > limit:
            raise ValueError("Source exceeds download limit")
        content = response.read(limit + 1)
    if len(content) > limit:
        raise ValueError("Source exceeds download limit")
    return content


def parse_catalog(content: bytes) -> list[dict]:
    if b"<!DOCTYPE" in content.upper() or b"<!ENTITY" in content.upper():
        raise ValueError("XML entities are not permitted")
    root = ET.fromstring(content)
    records = []
    # NOAA ISO-19115 catalogs wrap each ENC in MD_Metadata. Namespace URIs can vary.
    for metadata in root.iter():
        if metadata.tag.rsplit("}", 1)[-1] != "MD_Metadata":
            continue
        text = " ".join(part.strip() for part in metadata.itertext() if part.strip())
        names = re.findall(r"\bUS[A-Z0-9]{6}\b", text.upper())
        urls = [part.strip() for part in metadata.itertext() if part.strip().lower().startswith("https://") and ".zip" in part.lower()]
        if not names or not urls:
            continue
        url = urls[0]
        if urlparse(url).hostname not in NOAA_HOSTS:
            continue
        bounds = {}
        for item in metadata.iter():
            key = item.tag.rsplit("}", 1)[-1]
            if key in {"westBoundLongitude", "southBoundLatitude", "eastBoundLongitude", "northBoundLatitude"}:
                try:
                    bounds[key] = float("".join(item.itertext()).strip())
                except ValueError:
                    pass
        records.append({"cell": names[0], "url": url, "bounds": bounds, "catalogText": text})
    return sorted({record["cell"]: record for record in records}.values(), key=lambda record: record["cell"])


def extract_exchange_set(content: bytes, target: Path, *, max_uncompressed: int = 512_000_000) -> list[Path]:
    target = target.resolve()
    target.mkdir(parents=True, exist_ok=True)
    files = []
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        entries = archive.infolist()
        if sum(entry.file_size for entry in entries) > max_uncompressed:
            raise ValueError("ENC exchange set exceeds unpacked limit")
        for entry in entries:
            path = PurePosixPath(entry.filename)
            mode = entry.external_attr >> 16
            if path.is_absolute() or ".." in path.parts or "\\" in entry.filename or stat.S_ISLNK(mode):
                raise ValueError("Unsafe archive member")
            if entry.is_dir():
                continue
            destination = target.joinpath(*path.parts).resolve()
            if not destination.is_relative_to(target):
                raise ValueError("Archive path escapes target")
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(entry) as source, destination.open("xb") as output:
                remaining = entry.file_size
                while remaining:
                    chunk = source.read(min(65536, remaining))
                    if not chunk:
                        raise ValueError("Truncated archive member")
                    output.write(chunk)
                    remaining -= len(chunk)
            files.append(destination)
    return files


def download_cells(cells: list[str], target: Path, catalog_url: str = CATALOG_URL) -> dict:
    catalog_bytes = fetch_bytes(catalog_url, allowed_hosts=NOAA_HOSTS, limit=25_000_000)
    catalog = {item["cell"]: item for item in parse_catalog(catalog_bytes)}
    unknown = set(cells) - catalog.keys()
    if unknown:
        raise ValueError(f"Cells not present in catalog: {sorted(unknown)}")
    if len(cells) > 20:
        raise ValueError("Select at most twenty cells per ingestion run")
    provenance = []
    for cell in cells:
        record = catalog[cell]
        content = fetch_bytes(record["url"], allowed_hosts=NOAA_HOSTS)
        files = extract_exchange_set(content, target / cell)
        provenance.append({"id": cell, "url": record["url"], "retrievedAt": utc_now(), "attribution": "NOAA Office of Coast Survey", "sha256": hashlib.sha256(content).hexdigest(), "catalog": record, "files": [str(path.relative_to(target)) for path in files]})
        time.sleep(0.25)
    result = {"catalogUrl": catalog_url, "catalogSha256": hashlib.sha256(catalog_bytes).hexdigest(), "sources": provenance}
    target.mkdir(parents=True, exist_ok=True)
    (target / "provenance.json").write_text(json.dumps(result, indent=2))
    return result


def utc_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
