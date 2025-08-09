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
def check_gene_guess(phenopacket_path: str, guessed_genes: List[str]) -> str:
    """Return 'Yes' if any ground-truth gene in the phenopacket is in guessed_genes (case-insensitive), else 'No'.

    Args:
        phenopacket_path: Absolute or relative path to a Phenopacket JSON file.
        guessed_genes: List of gene symbols guessed by the model.
    """

    packet_path = Path(phenopacket_path)
    if not packet_path.exists():
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


