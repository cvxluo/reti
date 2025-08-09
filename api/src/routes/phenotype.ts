import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  generatePhenotypeFromText,
  captionImage,
} from "../lib/phenotypeLLM.js";

export const phenotypeRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const BodySchema = z.object({
  mode: z.enum(["text", "image"]),
  text: z.string().optional(),
  image_url: z.string().url().optional(),
});

phenotypeRouter.post("/api/phenotype", upload.none(), async (req, res) => {
  try {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "bad_request", details: parsed.error.flatten() });
    }
    const { mode, text, image_url } = parsed.data;

    if (mode === "text") {
      if (!text) return res.status(400).json({ error: "missing_text" });
      const out = await generatePhenotypeFromText(text);
      return res.json(out);
    } else {
      if (!image_url)
        return res.status(400).json({ error: "missing_image_url" });
      const caption = await captionImage(image_url);
      const out = await generatePhenotypeFromText(caption);
      return res.json(out);
    }
  } catch (err: any) {
    if (err?.issues)
      return res
        .status(422)
        .json({ error: "invalid_model_json", details: err.issues });
    if (err?.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({ error: "file_too_large" });
    console.error("[/api/phenotype]", err);
    return res.status(500).json({ error: "phenotype_failed" });
  }
});
