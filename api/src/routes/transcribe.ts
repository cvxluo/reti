// src/routes/transcribe.ts
import { Router } from "express";
import multer from "multer";
import { transcribeWithASR } from "../lib/asr.js";

export const transcribeRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okTypes = new Set([
      "audio/wav",
      "audio/x-wav",
      "audio/mpeg",
      "audio/mp3",
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "video/mp4",
      "application/octet-stream",
    ]);
    if (
      okTypes.has(file.mimetype) ||
      /\.(mp3|wav|m4a|aac|ogg|webm|mp4)$/i.test(file.originalname)
    ) {
      return cb(null, true);
    }
    return cb(new Error("unsupported_media_type"));
  },
});

transcribeRouter.post(
  "/api/transcribe",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "missing_file" });

      const { buffer, mimetype } = req.file;
      const result = await transcribeWithASR(buffer, mimetype);
      res.json(result);
    } catch (err: any) {
      if (err?.message === "unsupported_media_type")
        return res.status(415).json({ error: "unsupported_media_type" });
      if (err?.code === "LIMIT_FILE_SIZE")
        return res.status(413).json({ error: "file_too_large" });
      console.error("[/api/transcribe]", err);
      res.status(500).json({ error: "transcription_failed" });
    }
  }
);
