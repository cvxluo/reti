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
  

const systemMessage = `You are an expert medical assistant. You're attempting to help a patient fulfill their request.
You have access to the following tools:
- use Biomni, a subagent that has access to detailed medical databases and research papers, to get a detailed investigation
- use phenotype_analyze to generate a phenotype narrative and HPO array from provided text or image
- use Clinvar, a subagent that has access to the Clinvar database, to search for variants
`;

agentRouter.post("/api/agent", async (req, res) => {
    const { messages, userRequest, imageDataUrl, audioDataUrl } =
        req.body ?? {};
    console.log("received request", userRequest);

    console.log("messages", messages);

    const completion = await openai.responses.create({
        model: "gpt-5-2025-08-07",
        instructions: systemMessage,
        input: [
        {
            role: "user",
            content: [
            { type: "input_text", text: userRequest },
            imageDataUrl && { type: "input_image", image_url: imageDataUrl },
            audioDataUrl && { type: "input_audio", audio_url: audioDataUrl }, // if your SDK supports input_audio
            ].filter(Boolean),
        },
        ],

        text: { verbosity: "low" },
        tools: [biomniTool, phenotypeTool, clinvarTool],
        tool_choice: "auto",
        parallel_tool_calls: false,
    });

    for (const tool_call of completion.output) {
        if (tool_call.type !== "function_call") continue;

        console.log("tool call id", tool_call.id);
        console.log("tool call name", tool_call.name);
        console.log("tool call arguments", tool_call.arguments);

        if (tool_call.name === "biomni") {
        const args =
            typeof tool_call.arguments === "string"
            ? JSON.parse(tool_call.arguments)
            : tool_call.arguments;
        const response = await fetch(`http://127.0.0.1:5000/go`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: args.prompt }),
        });

        console.log("biomni raw response", response.status);
        const data = await response.json();
        console.log("biomni response", data);
        return res.json({ text: data.final });
        }

        if (tool_call.name === "phenotype_analyze") {
        const args =
            typeof tool_call.arguments === "string"
            ? JSON.parse(tool_call.arguments)
            : tool_call.arguments;
        const raw = await phenotypeAnalyze(args as PhenotypeParams);
        console.log("phenotype_analyze raw output", raw);
        try {
            const parsed = JSON.parse(raw);
            console.log("phenotype_analyze parsed output", parsed);
            return res.json(parsed);
        } catch {
            console.warn("phenotype_analyze output was not valid JSON");
        }
        }

        if (tool_call.name === "clinvar") {
        const args =
            typeof tool_call.arguments === "string"
            ? JSON.parse(tool_call.arguments)
            : tool_call.arguments;
        const response = await fetch(`http://127.0.0.1:5000/clinvar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ search_query: args.search_query }),
        });
        const data = await response.json();
        console.log("clinvar response", data);
        return res.json({ text: JSON.stringify(data.final) });
        }
    }

    const text = (completion as any).output_text ?? "";
    res.json({ text });
});
