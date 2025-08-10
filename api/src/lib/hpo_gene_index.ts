import fs from "fs";
import path from "path";

export type GeneHit = {
  gene: string; // symbol
  score: number;
  matches: string[]; // HPO IDs that contributed
  links: { ensembl: string; ucsc: string; ncbi: string };
};

type HpoToGenes = Map<string, Set<string>>;
type TermCounts = Map<string, number>;

let HPO_TO_GENES: HpoToGenes = new Map();
let TERM_COUNTS: TermCounts = new Map();

export function loadHpoGeneIndex() {
  // per your note: reference directly
  const file = path.resolve(
    process.cwd(),
    "../diagnosis/phenotype_to_genes.txt"
  );

  if (!fs.existsSync(file)) {
    console.warn(
      "[HPO] map file missing at",
      file,
      " — continuing with empty index"
    );
    HPO_TO_GENES = new Map();
    TERM_COUNTS = new Map();
    return;
  }

  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // skip header if present
  const start = lines[0].toLowerCase().startsWith("hpo_id") ? 1 : 0;

  const map: HpoToGenes = new Map();
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < 5) continue;

    const hpo = cols[0].trim().toUpperCase(); // hpo_id
    const geneSymbol = cols[3].trim().toUpperCase(); // gene_symbol

    if (!/^HP:\d+$/.test(hpo) || !geneSymbol) continue;

    if (!map.has(hpo)) map.set(hpo, new Set());
    map.get(hpo)!.add(geneSymbol);
  }

  const counts: TermCounts = new Map();
  for (const [hpo, genes] of map) counts.set(hpo, genes.size);

  HPO_TO_GENES = map;
  TERM_COUNTS = counts;

  console.log(`[HPO] loaded ${HPO_TO_GENES.size} terms from ${file}`);
}

export function rankGenesForHpo(hpoIds: string[], topK = 25): GeneHit[] {
  const wanted = hpoIds
    .map((h) => h.toUpperCase().trim())
    .filter((h) => /^HP:\d+$/.test(h));

  if (wanted.length === 0) return [];

  const idf = (hpo: string) => 1 / (1 + (TERM_COUNTS.get(hpo) ?? 0));

  const scores = new Map<string, { score: number; matches: Set<string> }>();

  for (const hpo of wanted) {
    const genes = HPO_TO_GENES.get(hpo);
    if (!genes) continue;
    const w = idf(hpo);
    for (const g of genes) {
      const rec = scores.get(g) ?? { score: 0, matches: new Set<string>() };
      rec.score += w;
      rec.matches.add(hpo);
      scores.set(g, rec);
    }
  }

  const hits: GeneHit[] = Array.from(scores.entries()).map(
    ([gene, { score, matches }]) => ({
      gene,
      score,
      matches: Array.from(matches),
      links: {
        ensembl: `https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${gene}`,
        ucsc: `https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=${gene}`,
        ncbi: `https://www.ncbi.nlm.nih.gov/gene/?term=${gene}[sym] AND human[orgn]`,
      },
    })
  );

  hits.sort((a, b) =>
    b.score === a.score ? a.gene.localeCompare(b.gene) : b.score - a.score
  );
  return hits.slice(0, topK);
}
