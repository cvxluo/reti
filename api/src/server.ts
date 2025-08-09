import express from "express";
import cors from "cors";
import { transcribeRouter } from "./routes/transcribe.js";
import { phenotypeRouter } from "./routes/phenotype.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use(transcribeRouter);
app.use(phenotypeRouter);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`api on http://localhost:${PORT}`));
