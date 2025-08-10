import { Router } from "express";
import { openai } from "../lib/openai.js";
import { phenotypeAnalyze, PhenotypeParams } from "../lib/phenotype_tool.js";
import { rankGenesTool, RankGenesParams } from "../lib/rank_genes_tool.js";

export const agentRouter = Router();

const biomniTool = {
  type: "function" as const,
  name: "biomni",
  description:
    "Use Biomni, a subagent that has access to detailed medical databases and research papers, to return an investigation",
  strict: false,
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The prompt to send to Biomni",
      },
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
  strict: false,
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

const clinvarTool = {
  type: "function" as const,
  name: "clinvar",
  description: "Use Clinvar to search for variants",
  strict: false,
  parameters: {
    type: "object",
    properties: {
      search_query: {
        type: "string",
        description: "The search query to send to Clinvar",
      },
    },
  },
  required: ["search_query"],
  additionalProperties: false,
};

const rankGenesToolSchema = {
  type: "function" as const,
  name: "rank_genes_from_hpo",
  description: "Rank candidate genes from a list of HPO IDs.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      hpo_ids: {
        type: "array",
        items: { type: "string" },
        description: "Array of HPO term IDs",
      },
    },
    required: ["hpo_ids"], // only hpo_ids required
    additionalProperties: false,
  },
};

const systemMessage = `You are an expert medical assistant. You're attempting to help a patient fulfill their request.
- For text symptoms, call phenotype_analyze.
- For images, call phenotype_analyze.
- After phenotype_analyze returns HPO, call rank_genes_from_hpo with those HPO IDs.
- For literature-backed investigation, call biomni.
- For variant lookups, call clinvar.
- Once phenotype_analyze returns, always call rank_genes_from_hpo with the returned HPO IDs before giving any final answer.
- If rank_genes_from_hpo returns JSON, produce a plain-language summary explaining the gene list, mentioning possible disease associations and the match to the given HPO terms. Avoid inventing unrelated case reports.
- After calling phenotype_analyze, don't call rank_genes_from_hpo if HPO IDs is empty.

`;

agentRouter.post("/api/agent", async (req, res) => {
  const {
    userRequest,
    imageDataUrl,
    audioDataUrl,
    messages: prevMessages,
  } = req.body ?? {};
  console.log("received request", userRequest);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const writeData = (text: string) => {
    for (const line of String(text).split(/\r?\n/)) {
      res.write(`data: ${line}\n`);
    }
    res.write(`\n`);
  };

  const writeEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    writeData(typeof data === "string" ? data : JSON.stringify(data));
  };

  const inputChain: any[] = [];
  if (Array.isArray(prevMessages)) {
    for (const m of prevMessages) {
      if (m?.role === "user" && typeof m?.text === "string")
        inputChain.push({ role: "user", content: m.text });
      else if (m?.role === "assistant" && typeof m?.text === "string")
        inputChain.push({ role: "assistant", content: m.text });
    }
  }
  inputChain.push({
    role: "user",
    content: [
      { type: "input_text", text: userRequest },
      imageDataUrl && { type: "input_image", image_url: imageDataUrl },
    ].filter(Boolean),
  });

  // Orchestrate tools non-streaming, then stream the final assistant answer
  const tools = [biomniTool, phenotypeTool, clinvarTool, rankGenesToolSchema];
  let toolPasses = 0;
  const maxToolPasses = 4;
  while (toolPasses < maxToolPasses) {
    const completion: any = await (openai as any).responses.create({
      model: "gpt-5-nano-2025-08-07",
      instructions: systemMessage,
      input: inputChain,
      text: { verbosity: "low" },
      tools,
      tool_choice: "auto",
      parallel_tool_calls: true,
    });
    const output = completion?.output ?? [];
    let executedAnyTool = false;
    for (const item of output) {
      if (item?.type !== "function_call") {
        continue;
      }
      executedAnyTool = true;
      const callId = item.call_id;
      const name: string = item.name;
      let argsStr: string = item.arguments;
      const args = JSON.parse(argsStr);
      if (name === "biomni") {
        console.log("[biomni] calling tool with prompt");
        let output = "";
        const response = await fetch(`http://127.0.0.1:5000/go`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: args.prompt }),
        });
        if (response.ok) {
          const data = await response.json().catch(async () => ({
            final: await response.text().catch(() => ""),
          }));
          output =
            typeof data?.final === "string"
              ? data.final
              : JSON.stringify(data?.final ?? "");
        } else {
          console.error("[biomni] non-OK", response.status);
        }
        inputChain.push({
          type: "function_call",
          name: "biomni",
          call_id: callId,
          arguments: argsStr,
        });
        inputChain.push({
          type: "function_call_output",
          call_id: callId,
          output,
        });
      } else if (name === "phenotype_analyze") {
        if (args.mode === "image" && req.body.imageDataUrl) {
          console.log(
            "[phenotype_analyze] replacing image_url with real request body URL"
          );
          args.image_url = req.body.imageDataUrl; // inject real base64 or HTTP URL
        }

        const raw = await phenotypeAnalyze(args as PhenotypeParams);
        let output = raw;
        const parsed = JSON.parse(raw);
        writeEvent("hpo", parsed.hpo ?? []);
        output = JSON.stringify(parsed);

        inputChain.push({
          type: "function_call",
          name: "phenotype_analyze",
          call_id: callId,
          arguments: JSON.stringify(args),
        });
        inputChain.push({
          type: "function_call_output",
          call_id: callId,
          output,
        });
      } else if (name === "clinvar") {
        console.log("[clinvar] calling tool with query");
        let out = "";
        const response = await fetch(`http://127.0.0.1:5000/clinvar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ search_query: args.search_query }),
        });
        const data = await response.json().catch(async () => ({
          final: await response.text().catch(() => ""),
        }));
        out =
          typeof data.final === "string"
            ? data.final
            : JSON.stringify(data.final);
        inputChain.push({
          type: "function_call",
          name: "clinvar",
          call_id: callId,
          arguments: argsStr,
        });
        inputChain.push({
          type: "function_call_output",
          call_id: callId,
          output: out,
        });

        console.log("inputChain", inputChain);
      } else if (name === "rank_genes_from_hpo") {
        const raw = await rankGenesTool(args as RankGenesParams);
        const parsed = JSON.parse(raw);
        writeEvent("genes", parsed.candidates);

        // Provide tool output back to model
        inputChain.push({
          role: "assistant",
          content: [{ type: "output_text", text: raw }],
        });

        // Ask model to summarize
        inputChain.push({
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Summarize the above gene list in plain language. Explain the top candidate genes and why they match the HPO terms.",
            },
          ],
        });

        const summarization = await openai.responses.create({
          model: "gpt-5-nano-2025-08-07",
          input: inputChain,
          text: { verbosity: "low" },
          tool_choice: "none",
        });

        const summaryText = summarization.output_text?.trim() ?? "";
        writeEvent("summary", summaryText);
      }
    }

    if (!executedAnyTool) break;
    toolPasses++;
  }

  // Final: stream the assistant's answer based on the updated message chain
  const finalStream: any = await (openai as any).responses.stream({
    model: "gpt-5-nano-2025-08-07",
    instructions: systemMessage,
    input: inputChain,
    text: { verbosity: "low" },
    tool_choice: "none",
  });
  finalStream.on("response.output_text.delta", (e: any) => {
    if (e?.delta) writeData(e.delta);
  });
  finalStream.on("response.error", (e: any) => {
    writeEvent("error", e?.error?.message || "stream_error");
    try {
      res.end();
    } catch {}
  });
  finalStream.on("response.completed", () => {
    writeEvent("done", "[DONE]");
    try {
      res.end();
    } catch {}
  });
});
