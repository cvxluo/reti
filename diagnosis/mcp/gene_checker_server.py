from __future__ import annotations

import json
from pathlib import Path
from typing import List, Set

from fastmcp import FastMCP


mcp = FastMCP("GeneGuessChecker")


def _extract_truth_gene_symbols(phenopacket: dict) -> Set[str]:
    symbols: Set[str] = set()

    for interpretation in phenopacket.get("interpretations", []) or []:
        diagnosis = interpretation.get("diagnosis") or {}
        for genomic_interpretation in diagnosis.get("genomicInterpretations", []) or []:
            variant_interpretation = genomic_interpretation.get("variantInterpretation") or {}
            variation_descriptor = variant_interpretation.get("variationDescriptor") or {}
            gene_context = variation_descriptor.get("geneContext") or {}
            symbol = gene_context.get("symbol")
            if symbol:
                symbols.add(str(symbol).strip().upper())

    return symbols


@mcp.tool
def check_gene_guess(phenopacket_uid: str, guessed_genes: List[str]) -> str:
    """Return 'Yes' if any ground-truth gene in the phenopacket is in guessed_genes (case-insensitive), else 'No'.

    Args:
        phenopacket_uid: A Phenopacket UID like "PPK-abcdef123456" (with or without .json),
            or a direct path for backward compatibility.
        guessed_genes: List of gene symbols guessed by the model.
    """

    def _resolve_uid_to_path(uid_or_path: str) -> Path | None:
        # 1) If caller provided a real path, use it
        candidate_path = Path(uid_or_path)
        if candidate_path.exists():
            return candidate_path

        # 2) Construct from UID under phenopackets_uid_flat
        uid = Path(uid_or_path).stem  # drop optional .json
        if not uid:
            return None

        uid_base_dir = (Path(__file__).resolve().parent.parent / "phenopackets_uid_flat").resolve()
        candidate = uid_base_dir / f"{uid}.json"
        if candidate.exists():
            return candidate

        # 3) Optional: try mapping.csv if present
        mapping_csv = uid_base_dir / "mapping.csv"
        if mapping_csv.exists():
            try:
                import csv  # local import to avoid overhead when unused

                with mapping_csv.open("r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        if (row.get("assigned_id") or "").strip() == uid:
                            dest_path = (row.get("dest_path") or "").strip()
                            if dest_path:
                                p = Path(dest_path)
                                if p.exists():
                                    return p
                            break
            except Exception:
                pass

        return None

    packet_path = _resolve_uid_to_path(phenopacket_uid)
    if packet_path is None:
        return "No"

    try:
        data = json.loads(packet_path.read_text())
    except Exception:
        return "No"

    truth_genes = _extract_truth_gene_symbols(data)
    guessed_set = {str(g).strip().upper() for g in guessed_genes if isinstance(g, str) and g.strip()}

    if not truth_genes or not guessed_set:
        return "No"

    return "Yes" if truth_genes & guessed_set else "No"


if __name__ == "__main__":
    # Default transport is stdio; can be overridden via CLI args if desired
    mcp.run()


