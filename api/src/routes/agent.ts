import { Router } from "express";
import { openai } from "../lib/openai.js";
import { phenotypeAnalyze, PhenotypeParams } from "../lib/phenotype_tool.js";

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
  

  const pubmedTool = {
    type: "function" as const,
    name: "pubmed",
    description: "Use Pubmed to search for research papers",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        search_query: {
          type: "string",
          description: "The search query to send to Pubmed",
        },
      },
    },
    required: ["search_query"],
    additionalProperties: false,
  };

const systemMessage = `You are an expert medical assistant. You're attempting to help a patient fulfill their request.
You have access to the following tools:
- ask Biomni, a subagent that has access to detailed medical databases and research papers, to get a detailed investigation. If you use biomni, make sure to add instructions for to make a **short** plan and emphasizing speed.
- use phenotype_analyze to generate a phenotype narrative and HPO array from provided text or image
- query Clinvar to search for variants
- query Pubmed to search and get content from research papers


For tool calls:
- Always begin by rephrasing the user's goal in a friendly, clear, and concise manner, before calling any tools.
- Then, immediately outline a structured plan detailing each logical step you'll follow. - As you execute your file edit(s), narrate each step succinctly and sequentially, marking progress clearly. 
- Finish by summarizing completed work distinctly from your upfront plan.

After you make your tool call, please summarize what you did and why in addition to responding to the user's request.

When analyzing phenotypes from a case, make sure to respond with an analysis on how specific phenotypes help differentially identify which genes are responsible for the disease. Also consider the mechanism of action. Respond in a way that is structured well for a geneticist.
`;

agentRouter.post("/api/agent", async (req, res) => {
    const { userRequest, imageDataUrl, audioDataUrl, messages: prevMessages } = req.body ?? {};
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
            if (m?.role === "user" && typeof m?.text === "string") inputChain.push({ role: "user", content: m.text });
            else if (m?.role === "assistant" && typeof m?.text === "string") inputChain.push({ role: "assistant", content: m.text });
        }
    }
    inputChain.push({
        role: "user",
        content: [
            { type: "input_text", text: userRequest },
            imageDataUrl && { type: "input_image", image_url: imageDataUrl },
            audioDataUrl && { type: "input_audio", audio_url: audioDataUrl },
        ].filter(Boolean),
    });

    // Orchestrate tools non-streaming, then stream the final assistant answer
    const tools = [biomniTool, phenotypeTool, clinvarTool, pubmedTool];
    const completion: any = await (openai as any).responses.create({
        model: "gpt-5-nano-2025-08-07",
        instructions: systemMessage,
        input: inputChain,
        text: { verbosity: "low" },
        tools,
        tool_choice: "auto",
        parallel_tool_calls: false,
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
            try { writeEvent("tool", { status: "start", name, call_id: callId }); } catch {}
            console.log("[biomni] calling tool with prompt");
            let output = "";
            const response = await fetch(`http://127.0.0.1:5000/go`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: args.prompt }),
            });
            if (response.ok) {
                const data = await response.json().catch(async () => ({ final: await response.text().catch(() => "") }));
                output = typeof data?.final === "string" ? data.final : JSON.stringify(data?.final ?? "");
            } else {
                console.error("[biomni] non-OK", response.status);
            }
            inputChain.push({ type: "function_call", name, call_id: callId, arguments: argsStr });
            inputChain.push({ type: "function_call_output", call_id: callId, output });
            try { writeEvent("tool", { status: "end", name, call_id: callId }); } catch {}
        } else if (name === "phenotype_analyze") {
            try { writeEvent("tool", { status: "start", name, call_id: callId }); } catch {}
            const raw = await phenotypeAnalyze(args as PhenotypeParams);
            let output = raw;
            const parsed = JSON.parse(raw);
            writeEvent("hpo", parsed.hpo ?? []);
            output = JSON.stringify(parsed);
            inputChain.push({ type: "function_call", name, call_id: callId, arguments: argsStr });
            inputChain.push({ type: "function_call_output", call_id: callId, output });

            console.log("inputChain", inputChain);
            try { writeEvent("tool", { status: "end", name, call_id: callId }); } catch {}
        } else if (name === "clinvar") {
            try { writeEvent("tool", { status: "start", name, call_id: callId }); } catch {}
            console.log("[clinvar] calling tool with query");
            let out = "";
            const response = await fetch(`http://127.0.0.1:5000/clinvar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ search_query: args.search_query }),
            });
            const data = await response.json().catch(async () => ({ final: await response.text().catch(() => "") }));
            out = typeof data.final === "string" ? data.final : JSON.stringify(data.final);
            inputChain.push({ type: "function_call", name, call_id: callId, arguments: argsStr });
            inputChain.push({ type: "function_call_output", call_id: callId, output: out });

            console.log("inputChain", inputChain);
            try { writeEvent("tool", { status: "end", name, call_id: callId }); } catch {}
        } else if (name === "pubmed") {
            try { writeEvent("tool", { status: "start", name, call_id: callId }); } catch {}
            console.log("[pubmed] calling tool with query");
            let out = "";
            const response = await fetch(`http://127.0.0.1:5000/pubmed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ search_query: args.search_query }),
            });
            const data = await response.json().catch(async () => ({ final: await response.text().catch(() => "") }));
            out = typeof data.final === "string" ? data.final : JSON.stringify(data.final);
            inputChain.push({ type: "function_call", name, call_id: callId, arguments: argsStr });
            inputChain.push({ type: "function_call_output", call_id: callId, output: out });

            console.log("inputChain", inputChain);
            try { writeEvent("tool", { status: "end", name, call_id: callId }); } catch {}
        }
    }

    console.log("end inputChain", inputChain);
    // Final: stream the assistant's answer based on the updated message chain
    const finalStream: any = await (openai as any).responses.stream({
        model: "gpt-5-2025-08-07",
        instructions: systemMessage,
        input: inputChain,
        // text: { verbosity: "low" },
        tool_choice: "none",
    });
    finalStream.on("response.output_text.delta", (e: any) => {
        if (e?.delta) writeData(e.delta);
    });
    finalStream.on("response.error", (e: any) => {
        writeEvent("error", e?.error?.message || "stream_error");
        try { res.end(); } catch {}
    });
    finalStream.on("response.completed", () => {
        writeEvent("done", "[DONE]");
        try { res.end(); } catch {}
    });
});
