import { z } from "zod";
import { rankGenesForHpo } from "./hpo_gene_index.js";

export const RankGenesParams = z.object({
  hpo_ids: z
    .array(z.string())
    .min(1, "Provide at least one HPO ID like HP:0001250"),
  top_k: z.number().int().min(1).max(100).optional(),
});
export type RankGenesParams = z.infer<typeof RankGenesParams>;

export async function rankGenesTool(args: RankGenesParams) {
  const { hpo_ids, top_k } = RankGenesParams.parse(args);
  const hits = rankGenesForHpo(hpo_ids, top_k ?? 25);
  interface GeneHit {
    gene: string;
    score: number;
    matches: string[];
    links: string[];
  }

  interface RankGenesResult {
    candidates: GeneHit[];
  }

  return JSON.stringify({
    candidates: hits.map((h: any) => ({
      gene: h.gene,
      score: Number(h.score.toFixed(6)),
      matches: h.matches,
      links: h.links ? Object.values(h.links) : [],
    })),
  } as RankGenesResult);
}
