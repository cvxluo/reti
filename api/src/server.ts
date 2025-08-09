import express from "express";
import cors from "cors";
import { transcribeRouter } from "./routes/transcribe.js";
import { phenotypeRouter } from "./routes/phenotype.js";
import { agentRouter } from "./routes/agent.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use(transcribeRouter);
app.use(phenotypeRouter);
app.use(agentRouter);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`api on http://localhost:${PORT}`));
