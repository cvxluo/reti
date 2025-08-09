#!/usr/bin/env python3

import argparse
import csv
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Dict, Tuple


def compute_stable_hash_for_json_content(obj: dict) -> str:
    """
    Compute a stable SHA256 hash for a JSON object by dumping with sorted keys
    and compact separators. Returns the first 12 hex chars.
    """
    canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return digest[:12]


def compute_short_path_hash(path: Path) -> str:
    return hashlib.sha256(str(path).encode("utf-8")).hexdigest()[:6]


def assign_unique_id(
    packet: dict,
    source_path: Path,
    taken_ids: Dict[str, Path],
    prefix: str,
) -> Tuple[str, bool]:
    """
    Generate a deterministic ID from the packet content. If a collision occurs
    (same ID already taken by a different source), derive an alternative by
    appending a short hash of the file path to ensure uniqueness.

    Returns (assigned_id, is_collision_resolved)
    """
    base = f"{prefix}-{compute_stable_hash_for_json_content(packet)}"
    if base not in taken_ids:
        taken_ids[base] = source_path
        return base, False

    # If the same source produced the same base, it's fine.
    if taken_ids[base] == source_path:
        return base, False

    # Collision: same content hash from different files. Make it unique with path hash.
    alt = f"{base}-{compute_short_path_hash(source_path)}"
    # In the extremely unlikely case it's still taken, iterate with numeric suffix.
    suffix = 2
    candidate = alt
    while candidate in taken_ids and taken_ids[candidate] != source_path:
        candidate = f"{alt}-{suffix}"
        suffix += 1
    taken_ids[candidate] = source_path
    return candidate, True


def process_file(
    src_file: Path,
    dest_dir_for_gene: Path,
    mapping_writer: csv.writer,
    taken_ids: Dict[str, Path],
    prefix: str,
) -> None:
    if src_file.suffix.lower() != ".json":
        return

    with src_file.open("r", encoding="utf-8") as f:
        try:
            packet = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Skipping invalid JSON: {src_file} ({e})", file=sys.stderr)
            return

    new_id, collided = assign_unique_id(packet, src_file, taken_ids, prefix)

    # Update subject.id if present
    if isinstance(packet, dict):
        subject = packet.get("subject")
        if isinstance(subject, dict):
            subject["id"] = new_id
        else:
            # Create subject if missing or malformed
            packet["subject"] = {"id": new_id}
    else:
        # Unexpected structure; still write the file unmodified except name
        pass

    dest_dir_for_gene.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir_for_gene / f"{new_id}.json"

    with dest_file.open("w", encoding="utf-8") as f:
        json.dump(packet, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")

    mapping_writer.writerow([str(src_file), str(dest_file), new_id, "collision" if collided else "ok"])


def rename_store(source_dir: Path, dest_dir: Path, prefix: str, flat: bool = False) -> None:
    if not source_dir.exists() or not source_dir.is_dir():
        raise SystemExit(f"Source directory does not exist or is not a directory: {source_dir}")

    dest_dir.mkdir(parents=True, exist_ok=True)
    mapping_path = dest_dir / "mapping.csv"

    taken_ids: Dict[str, Path] = {}

    with mapping_path.open("w", encoding="utf-8", newline="") as map_file:
        writer = csv.writer(map_file)
        writer.writerow(["source_path", "dest_path", "assigned_id", "status"])  # header

        # Expecting layout: source_dir/<GENE>/<files.json>
        for gene_dir in sorted([p for p in source_dir.iterdir() if p.is_dir()]):
            target_dir = dest_dir if flat else (dest_dir / gene_dir.name)
            for entry in sorted(gene_dir.iterdir()):
                if entry.is_file():
                    process_file(entry, target_dir, writer, taken_ids, prefix)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a UID-based copy of phenopackets store.")
    parser.add_argument(
        "--source-dir",
        required=True,
        help="Path to the source phenopackets directory (contains per-gene subdirectories)",
    )
    parser.add_argument(
        "--dest-dir",
        required=True,
        help="Path to the destination directory to write UID-named copies",
    )
    parser.add_argument(
        "--prefix",
        default="PPK",
        help="Prefix for assigned IDs (default: PPK)",
    )
    parser.add_argument(
        "--flat",
        action="store_true",
        help="If set, write all output files into a single flat directory (no gene subfolders)",
    )

    args = parser.parse_args()
    source_dir = Path(args.source_dir).expanduser().resolve()
    dest_dir = Path(args.dest_dir).expanduser().resolve()
    prefix = args.prefix
    flat = args.flat

    print(f"Source: {source_dir}")
    print(f"Destination: {dest_dir}")
    print(f"ID prefix: {prefix}")

    rename_store(source_dir, dest_dir, prefix, flat=flat)
    print("Done.")


if __name__ == "__main__":
    main()


