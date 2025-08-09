from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import List

try:
    from dotenv import load_dotenv  # type: ignore
except Exception:  # noqa: BLE001
    load_dotenv = None  # type: ignore[assignment]

# Load environment variables from a local .env if available
if load_dotenv is not None:
    try:
        load_dotenv()
    except Exception:
        pass

def extract_phenotype_summary(packet: dict) -> str:
    """Build a short phenotype summary from a Phenopacket v2 JSON.

    Focus on HPO terms for prompting the LLM.
    """
    features = packet.get("phenotypicFeatures") or []
    labels: List[str] = []
    for feat in features:
        term = (feat or {}).get("type") or {}
        label = term.get("label") or term.get("id")
        if label:
            labels.append(str(label))
    return ", ".join(labels) if labels else "No phenotypic features provided."


def call_gpt5_get_gene_guesses(phenotype_text: str, max_genes: int = 10) -> List[str]:
    """Call OpenAI GPT-5 (Responses API) to get a JSON list of gene symbol guesses.

    Falls back to returning an empty list if OPENAI_API_KEY is missing or request fails.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY not set; skipping GPT call and returning empty guesses.")
        return []

    try:
        # Use Responses API and prefer output_text for robust parsing
        from openai import OpenAI  # type: ignore

        client = OpenAI(api_key=api_key)
        system = (
            "You are a genetics assistant. Given phenotypic features, return a JSON array "
            "of up to N plausible diagnostic gene symbols (HGNC symbols only). Output JSON only."
        )
        user = (
            f"Phenotypic features: {phenotype_text}\n"
            f"Return at most {max_genes} HGNC gene symbols as a JSON array, like: [\"GENE1\", \"GENE2\"]."
        )

        prompt = f"System: {system}\n\nUser: {user}"
        resp = client.responses.create(
            model="gpt-5",
            input=prompt,
            # temperature=0.2,
        )

        text = getattr(resp, "output_text", None)
        if not text:
            # Fallback: best-effort concatenate from output structure
            output = getattr(resp, "output", None)
            if isinstance(output, list):
                parts: List[str] = []
                for item in output:
                    content = getattr(item, "content", None)
                    if isinstance(content, list):
                        for block in content:
                            # Try common fields seen in SDKs
                            if isinstance(block, dict):
                                if isinstance(block.get("text"), str):
                                    parts.append(block["text"])  # type: ignore[index]
                                elif isinstance(block.get("value"), str):
                                    parts.append(block["value"])  # type: ignore[index]
                text = "".join(parts) if parts else None

        if not text:
            return []

        data_text = text
        if data_text.strip() and data_text.strip()[0] != "[":
            start = data_text.find("[")
            end = data_text.rfind("]")
            if start != -1 and end != -1 and end > start:
                data_text = data_text[start : end + 1]

        guesses = json.loads(data_text) if data_text else []
        if isinstance(guesses, list):
            return [str(g).strip() for g in guesses if isinstance(g, str) and g.strip()]
        return []
    except Exception as exc:  # noqa: BLE001
        print(f"GPT call failed: {exc}")
        return []


def _result_to_text(result: object) -> str:
    """Best-effort extraction of text from various fastmcp result shapes."""
    for attr in ("text", "output_text", "value", "data"):
        if hasattr(result, attr):
            val = getattr(result, attr)
            if isinstance(val, str):
                return val
    # content may be list-like with text blocks
    content = getattr(result, "content", None)
    if isinstance(content, list) and content:
        # try to join any 'text' or 'value' fields
        parts = []
        for block in content:
            if isinstance(block, dict):
                if isinstance(block.get("text"), str):
                    parts.append(block["text"]) 
                elif isinstance(block.get("value"), str):
                    parts.append(block["value"]) 
        if parts:
            return "".join(parts)
    return str(result)


async def run_check(phenopacket_uid: str, guesses: List[str]) -> str:
    """Start the MCP server and call the tool with provided guesses.

    phenopacket_uid may be a UID like "PPK-..." or a direct path (backward-compatible).
    """
    from fastmcp import Client  # imported lazily so script runs without deps until needed

    server_script = str(Path(__file__).parent / "gene_checker_server.py")

    async with Client(server_script) as client:
        result = await client.call_tool(
            "check_gene_guess",
            {
                "phenopacket_uid": str(phenopacket_uid),
                "guessed_genes": guesses,
            },
        )
        return _result_to_text(result)


def _resolve_uid_to_path(uid_or_path: str) -> Path | None:
    """Resolve a UID (PPK-*) to its JSON file under phenopackets_uid_flat.

    Falls back to treating the input as a direct path if it exists.
    Tries mapping.csv as a last resort.
    """
    # 1) Direct path
    candidate_path = Path(uid_or_path)
    if candidate_path.exists():
        return candidate_path

    # 2) phenopackets_uid_flat/<uid>.json
    uid = Path(uid_or_path).stem
    if not uid:
        return None

    base_dir = (Path(__file__).resolve().parent.parent / "phenopackets_uid_flat").resolve()
    j = base_dir / f"{uid}.json"
    if j.exists():
        return j

    # 3) mapping.csv lookup
    mapping_csv = base_dir / "mapping.csv"
    if mapping_csv.exists():
        try:
            import csv

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


def main() -> None:
    parser = argparse.ArgumentParser(description="Test GeneGuessChecker MCP server")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--uid",
        help="Phenopacket UID (e.g., PPK-abcdef123456). Also accepts a direct path.",
    )
    group.add_argument(
        "--phenopacket",
        help="Path to Phenopacket JSON (backward-compatible)",
    )
    parser.add_argument(
        "--max-genes",
        type=int,
        default=10,
        help="Max number of gene guesses to request from GPT-5",
    )
    parser.add_argument(
        "--guesses",
        nargs="*",
        help="Optional manual guesses to bypass GPT (space-separated)",
    )
    args = parser.parse_args()

    if args.uid:
        resolved_path = _resolve_uid_to_path(args.uid)
        if resolved_path is None:
            raise SystemExit(f"Could not resolve UID to file: {args.uid}")
        phenopacket_path = resolved_path
        phenopacket_uid_to_pass = args.uid
    else:
        phenopacket_path = Path(args.phenopacket)
        if not phenopacket_path.exists():
            raise SystemExit(f"Phenopacket not found: {phenopacket_path}")
        phenopacket_uid_to_pass = str(phenopacket_path)

    packet = json.loads(phenopacket_path.read_text())
    phenotype_text = extract_phenotype_summary(packet)

    if args.guesses:
        guesses = [g.strip() for g in args.guesses if g.strip()]
    else:
        guesses = call_gpt5_get_gene_guesses(phenotype_text, max_genes=args.max_genes)

    print(f"Phenotype: {phenotype_text}")
    print(f"Guessed genes: {guesses}")

    import asyncio

    verdict = asyncio.run(run_check(phenopacket_uid_to_pass, guesses))
    print(f"Tool verdict: {verdict}")


if __name__ == "__main__":
    main()


