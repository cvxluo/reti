import { Router } from "express";
import { openai } from "../lib/openai.js";
import { phenotypeAnalyze, PhenotypeParams } from "../lib/phenotype_tool.js";

export const agentRouter = Router();

// (Optional) keep Biomni stubbed for now; not executed below
const biomniTool = {
  type: "function" as const,
  name: "biomni",
  description: "Use Biomni to diagnose the patient",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "The prompt to send to Biomni" },
    },
    required: ["prompt"],
    additionalProperties: false,
  },
};

const phenotypeTool = {
  type: "function" as const,
  name: "phenotype_analyze",
  description:
    "Generate phenotype narrative and HPO array from text or image URL",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: ["text", "image"],
        description: "Input mode",
      },
      text: {
        type: "string",
        description: "Clinical description if mode=text",
      },
      image_url: {
        type: "string",
        description: "Public/data URL if mode=image",
      },
    },
    required: ["mode"],
    additionalProperties: false,
  },
};

agentRouter.post("/api/agent", async (req, res) => {
  try {
    const { userRequest } = req.body ?? {};
    if (!userRequest)
      return res.status(400).json({ error: "missing_userRequest" });

    const SYSTEM = `You are an expert clinical assistant. Use tools when helpful.
- If the user provides symptoms or asks to analyze text, call phenotype_analyze with mode="text" and the text.
- If the user gives an image URL, call phenotype_analyze with mode="image" and image_url.
- When the tool returns JSON { phenotype_text, hpo }, write a concise summary and include structured values.`;

    // 1) Ask GPT‑5 (same model name as your first function)
    const first = await openai.responses.create({
      model: "gpt-5-2025-08-07",
      instructions: SYSTEM,
      input: [
        { role: "user", content: [{ type: "input_text", text: userRequest }] },
      ],
      tools: [phenotypeTool, biomniTool], // both available; we only implement phenotype_analyze here
      tool_choice: "auto",
      parallel_tool_calls: false,
    });

    let finalText = (first as any).output_text ?? "";
    let hpo:
      | Array<{ id: string; label: string; confidence: number }>
      | undefined;

    // 2) Handle any tool calls
    const toolCalls = ((first as any).output ?? []).filter(
      (p: any) => p.type === "function_call"
    );
    if (toolCalls.length > 0) {
      const tool_outputs: Array<{ tool_call_id: string; output: string }> = [];

      for (const call of toolCalls) {
        const name = call.name as string;
        const args =
          typeof call.arguments === "string"
            ? JSON.parse(call.arguments)
            : call.arguments;

        if (name === "phenotype_analyze") {
          const raw = await phenotypeAnalyze(args as PhenotypeParams); // returns JSON string
          tool_outputs.push({ tool_call_id: call.id, output: raw });

          // capture for UI convenience
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.phenotype_text) finalText = parsed.phenotype_text;
            if (parsed?.hpo) hpo = parsed.hpo;
          } catch {}
        }

        // If you want to actually call Biomni later, add a handler here:
        // if (name === "biomni") { ... }
      }

      // 3) Let the model finish with tool_outputs (Responses API continuation)
      const second = await openai.responses.create({
        model: "gpt-5-2025-08-07",
        tool_outputs,
        tools: [phenotypeTool, biomniTool],
      });

      const finishing = (second as any).output_text?.trim();
      if (finishing) finalText = finishing;
    }

    return res.json({ text: finalText, hpo });
  } catch (err: any) {
    console.error("[/api/agent]", err);
    return res
      .status(500)
      .json({ error: "agent_failed", message: err?.message });
  }
});
