import { Router } from "express";
import { openai } from "../lib/openai";

export const agentRouter = Router();

const biomniTool = {
    type: "function" as const,
    function: {
      name: "biomni",
      strict: true,
      description: "Use Biomni to diagnose the patient",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt to send to Biomni"
          },
        },
        required: ["prompt"],
        additionalProperties: false
      }
    }
  }

agentRouter.post("/api/agent", async (req, res) => {

    const { userRequest } = req.body;

    const systemMessage = {
        role: 'developer',
        content: `You are an expert medical assistant. You are attempting to diagnose a patient based on their phenotype.
        You have access to the following tools:
        - use Biomni to diagnose the patient`
    }
    const completion = await openai.chat.completions.create({
        model: 'gpt-5-2025-08-07',
        messages: [systemMessage, { role: 'user', content: userRequest, name: 'user_request' }],
        temperature: 0.1,
        max_tokens: 100000,
        tools: [biomniTool],
        tool_choice: 'auto',
        parallel_tool_calls: false,
      });

      res.json(completion.choices[0].message.tool_calls);
});
