## MCP Gene Guess Checker — Summary and Usage

### Overview
- **Goal**: Provide an MCP server that answers whether the ground-truth diagnostic gene in a Phenopacket appears in a model’s guessed gene list.
- **Ground truth extraction**: From `interpretations[].diagnosis.genomicInterpretations[].variantInterpretation.variationDescriptor.geneContext.symbol` (case-insensitive).
- **Answer**: Returns `"Yes"` if any ground-truth gene matches one of the guesses; otherwise `"No"`.

### Files
- Server: `diagnosis/mcp/gene_checker_server.py`
- Test harness: `diagnosis/mcp/test_gene_checker.py`

### Dependencies
- `fastmcp>=2.11.0`, `openai>=1.50.0`, `python-dotenv`
- Create and use a virtualenv (Python 3.12 shown):
```bash
python3 -m venv /Users/johnyang/Desktop/Projects/reti/.venv
source /Users/johnyang/Desktop/Projects/reti/.venv/bin/activate
python -m pip install --upgrade pip
pip install "fastmcp>=2.11.0" "openai>=1.50.0" python-dotenv
```

### Run the MCP server (STDIO)
```bash
source /Users/johnyang/Desktop/Projects/reti/.venv/bin/activate
python /Users/johnyang/Desktop/Projects/reti/diagnosis/mcp/gene_checker_server.py
```

### Test script (manual guesses)
```bash
source /Users/johnyang/Desktop/Projects/reti/.venv/bin/activate
python /Users/johnyang/Desktop/Projects/reti/diagnosis/mcp/test_gene_checker.py \
  --phenopacket /Users/johnyang/Desktop/Projects/reti/diagnosis/phenopackets/AAGAB/PMID_28239884_Family1proband.json \
  --guesses AAGAB BRCA1
# Expected: Tool verdict: Yes
```

### Test script (GPT-5 via OpenAI Responses API)
- Put your API key in `/Users/johnyang/Desktop/Projects/reti/.env` as `OPENAI_API_KEY=...` (the script auto-loads it via python-dotenv).
```bash
source /Users/johnyang/Desktop/Projects/reti/.venv/bin/activate
python /Users/johnyang/Desktop/Projects/reti/diagnosis/mcp/test_gene_checker.py \
  --phenopacket /Users/johnyang/Desktop/Projects/reti/diagnosis/phenopackets/AAGAB/PMID_28239884_Family1proband.json \
  --max-genes 8
# Example output (varies): Guessed genes: ["WNT10A", "AAGAB", ...] → Tool verdict: Yes
```
- Implementation notes:
  - Uses OpenAI Responses API and prefers `output_text`; falls back to concatenating message blocks if needed.
  - Extracts bracketed JSON `[...]` if the model wraps the array in text.

### Agentic use in Cursor (or any MCP client)
- Register the server command in your MCP client config:
  - command: `python`
  - args: `["/Users/johnyang/Desktop/Projects/reti/diagnosis/mcp/gene_checker_server.py"]`
- Then GPT-5 can call `check_gene_guess` agentically when prompted, subject to the client’s tool-use policy.

### Reference
- fastmcp docs and examples: [fastmcp GitHub](https://github.com/jlowin/fastmcp)


