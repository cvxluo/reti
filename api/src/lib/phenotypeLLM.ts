import { openai } from "./openai.js";
import {
  PhenotypeJSON,
  type PhenotypeJSON as PhenotypeJSONType,
} from "./phenotypeSchema.js";

const SYSTEM = `You convert clinical descriptions into:
(a) a concise, well-formed phenotype narrative,
(b) an array of HPO terms strictly supported by the input.
- Do NOT infer facts that aren't present.
- If uncertain, omit the HPO term rather than guessing.
- Confidence is in [0,1].
- Output JSON ONLY, matching this TypeScript type:
{
  "phenotype_text": string,
  "hpo": [{"id":"HP:0000001","label":"Example","confidence":0.9}]
}`;

function coerceJson(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(cleaned);
}

export async function captionImage(imageUrl: string): Promise<string> {
  const resp = await openai.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Describe clinically relevant visible findings only.",
          },
          { type: "input_image", image_url: imageUrl, detail: "auto" },
        ],
      },
    ],
  });

  const text = (resp as any).output_text ?? "";
  return text.trim();
}

export async function generatePhenotypeFromText(
  text: string
): Promise<PhenotypeJSONType> {
  const user = `TEXT:\n${text}\n\nReturn ONLY the JSON.`;
  const resp = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
  });

  const raw = resp.choices[0]?.message?.content ?? "{}";
  const json = PhenotypeJSON.parse(coerceJson(raw));
  return json;
}
