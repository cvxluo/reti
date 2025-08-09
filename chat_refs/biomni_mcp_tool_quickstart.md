## Biomni MCP Custom Tool Quickstart (Genetic Diagnosis)

### What this gives you
- **Easiest path**: Implement tools as a tiny MCP server; Biomni auto-discovers and calls them.
- **No Biomni internals needed**: You write normal Python functions and a small YAML entry.
- **Autonomous use**: `A1` will select and call your tool from natural language prompts when it’s relevant.

### TL;DR
1. Write a small MCP server exposing your functions.
2. Add it to `mcp_config.yaml`.
3. In Python: `agent = A1(); agent.add_mcp(config_path="./mcp_config.yaml")`.
4. Prompt naturally; the agent will call your tool when appropriate.

### Minimal MCP server template
Create a module (e.g., `genetic_dx_mcp.py`).

```python
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel
from typing import List, Optional

mcp = FastMCP("genetic-dx")

class ACMGResult(BaseModel):
    classification: str
    criteria: List[str]
    summary: str

@mcp.tool()
def classify_variant_acmg(
    variant: str,
    genome_build: str = "hg38",
    hpo_terms: Optional[List[str]] = None,
) -> ACMGResult:
    # TODO: call ClinVar/gnomAD/VEP/etc. and assemble a report
    return ACMGResult(
        classification="VUS",
        criteria=["PM2?"],
        summary=f"Placeholder for {variant} ({genome_build}); HPO={hpo_terms or []}",
    )

if __name__ == "__main__":
    mcp.run()
```

### Add to `mcp_config.yaml`
Place this alongside existing examples (see `biomni-app/tutorials/examples/add_mcp_server/mcp_config.yaml`).

```yaml
mcp_servers:
  genetic_dx:
    enabled: true
    command: ["python", "-m", "genetic_dx_mcp"]  # or ["python", "genetic_dx_mcp.py"]
    env:
      CLINVAR_API_KEY: "${CLINVAR_API_KEY}"
      GNOMAD_API_KEY: "${GNOMAD_API_KEY}"
      VEP_BASE_URL: "${VEP_BASE_URL}"
    tools:
      - biomni_name: classify_variant_acmg
        description: "Classify a variant with ACMG/AMP criteria using external databases"
        parameters:
          variant:       {type: str, required: true,  description: "HGVS or chrom-pos-ref-alt"}
          genome_build:  {type: str, required: false, default: "hg38"}
          hpo_terms:     {type: List[str], required: false, description: "HPO IDs (e.g., HP:0001250)"}
```

### Use in Biomni
```python
from biomni.agent import A1

agent = A1()
agent.add_mcp(config_path="./mcp_config.yaml")

# Natural language; the agent will pick your tool when relevant
agent.go("Classify NM_000059.4(BRCA2):c.7007G>A with hg38 and HPO: HP:0001250, HP:0002315.")

# Or explicitly reference the tool/args
agent.go("Use classify_variant_acmg with variant='NM_000059.4:c.7007G>A', genome_build='hg38'.")
```

### Test your MCP server (optional)
Use the example client under `biomni-app/tutorials/examples/expose_biomni_server/`:
- `python run_mcp_server.py`
- `python test_mcp_server.py`

Or add quick smoke tests to your own repo using the `mcp` client, similar to the example.

### Autonomous tool calling
- `A1` defaults to `use_tool_retriever=True` and will autonomously select tools (including MCP tools) based on your prompt.
- For the lightweight `react` agent, pass `use_tool_retriever=True` to enable the same behavior.

### Tips for reliability
- **Names/descriptions**: Make them clear and domain-specific; helps the retriever pick your tool.
- **Parameter types**: Prefer simple types (`str`, `int`, `bool`, `List[str]`).
- **Env vars**: Pass keys via the YAML `env:` section with `${VAR}` and export them in your shell/.env.
- **Timeouts**: Long jobs are OK; you can increase `timeout_seconds` when creating `A1`.
- **Examples in repo**: See `biomni-app/biomni/tool/example_mcp_tools/pubmed_mcp.py` and `biomni-app/docs/mcp_integration.md` for patterns.
