import { z } from "zod";
import { generatePhenotypeFromText, captionImage } from "./phenotypeLLM.js";

export const PhenotypeParams = z.object({
  mode: z.enum(["text", "image"]),
  text: z.string().optional(),
  image_url: z.string().url().optional(),
});

export type PhenotypeParams = z.infer<typeof PhenotypeParams>;

export async function phenotypeAnalyze(args: PhenotypeParams) {
  const parsed = PhenotypeParams.parse(args);

  if (parsed.mode === "text") {
    if (!parsed.text) throw new Error("missing_text");
    const out = await generatePhenotypeFromText(parsed.text);
    return JSON.stringify(out);
  }

  if (!parsed.image_url) throw new Error("missing_image_url");
  const caption = await captionImage(parsed.image_url);
  const out = await generatePhenotypeFromText(caption);
  return JSON.stringify(out);
}
