import { z } from "zod";

export const HPOItem = z.object({
  id: z.string().regex(/^HP:\d{7}$/),
  label: z.string(),
  confidence: z.number().min(0).max(1),
});

export const PhenotypeJSON = z.object({
  phenotype_text: z.string().min(1),
  hpo: z.array(HPOItem),
});

export type PhenotypeJSON = z.infer<typeof PhenotypeJSON>;
