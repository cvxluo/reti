import { Router } from "express";
import { openai } from "../lib/openai.js";
import { phenotypeAnalyze, PhenotypeParams } from "../lib/phenotype_tool.js";

export const agent2Router = Router();

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

/*
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
*/

const systemMessage = `You are an expert medical assistant. You're attempting to help a patient fulfill their request.
You have access to the following tools:
- use Biomni, a subagent that has access to detailed medical databases and research papers, to get a detailed investigation
`;

type Message = {
    role: "user" | "assistant";
    content: string;
}

agent2Router.post("/api/agent2", async (req, res) => {
    const { messages } = req.body ?? {};
    console.log("messages", messages);

    const response = await respondToMessages(messages);
    messages.push(...response);

    for (const tool_call of response) {
        if (tool_call.type !== "function_call") continue;

        console.log("tool_call", tool_call);

        if (tool_call.name === "biomni") {
            const response = await fetch(`http://127.0.0.1:5000/go`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: JSON.parse(tool_call.arguments).prompt }),
            });
            const data = await response.json();
            console.log("biomni response", data);
            const biomni_response = {
                role: "function_call_output",
                call_id: tool_call.id,
                output: data.final,
            }
            messages.push(biomni_response);

            const final_response = await respondToMessages(messages);
            messages.push(final_response);
        }
    }

    return res.json({ messages: messages });

});

const respondToMessages = async (messages: Message[]) => {
    const completion = await openai.responses.create({
        model: "gpt-5-2025-08-07",
        instructions: systemMessage,
        input: messages,
        text: { verbosity: "low" },
        tools: [biomniTool],
        tool_choice: "auto",
        parallel_tool_calls: false,
    });

    console.log("completion", completion.output);

    return completion.output;
}
