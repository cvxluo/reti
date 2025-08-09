## Gene Guess Checker MCP Server (fastmcp)

This standalone MCP server exposes a single tool, `check_gene_guess`, that reads a Phenopacket JSON file (resolved via UID), extracts ground-truth diagnostic gene symbol(s) from `interpretations[].diagnosis.genomicInterpretations[].variantInterpretation.variationDescriptor.geneContext.symbol`, and checks if any are present in a provided list of guessed gene symbols.

Returns "Yes" if any match (case-insensitive), otherwise "No".

### Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r mcp/requirements.txt
```

### Run (STDIO)

```bash
python mcp/gene_checker_server.py
```

Configure your MCP client (e.g., Cursor, Claude Desktop) to launch the above command as an MCP server.

### Tool: `check_gene_guess`

Inputs:
- `phenopacket_uid` (str): Phenopacket UID like `PPK-abcdef123456` stored under `diagnosis/phenopackets_uid_flat/`.
  - Backward-compatible: you may also pass a direct file path; the server will accept it.
- `guessed_genes` (list[str]): Model-predicted gene symbols

Output:
- `"Yes"` if any ground-truth gene symbol is in `guessed_genes`; else `"No"`.

### Example (Local quick test via client)

```python
import asyncio
from fastmcp import Client

async def main():
    async with Client("python", args=["mcp/gene_checker_server.py"]) as client:
        result = await client.call_tool(
            "check_gene_guess",
            {
                # Prefer UID lookup; falls back to path if you pass one
                "phenopacket_uid": "PPK-1acf6283c9d7",
                "guessed_genes": ["AAGAB", "BRCA1"],
            },
        )
        print(result.text)  # "Yes"

asyncio.run(main())
```

### Notes
- The server is intentionally independent of Biomni for easy reuse. If you decide to integrate later, you can mount/import this server or call it as an external MCP server.
- Multiple ground-truth genes are supported; any match returns "Yes".

### Reference
- fastmcp documentation and examples: [fastmcp GitHub](https://github.com/jlowin/fastmcp)


