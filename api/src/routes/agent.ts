import { Router } from "express";
import { openai } from "../lib/openai.js";

export const agentRouter = Router();

const biomniTool = {
  type: "function" as const,
  name: "biomni",
  description: "Use Biomni to diagnose the patient",
  strict: true,
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

agentRouter.post("/api/agent", async (req, res) => {

    const { userRequest } = req.body;

    console.log("recieved request", userRequest);

    const systemMessage = `You are an expert medical assistant. You are attempting to diagnose a patient based on their phenotype.
    You have access to the following tools:
    - use Biomni to diagnose the patient`

    const completion = await openai.responses.create({
        model: 'gpt-5-2025-08-07',
        instructions: systemMessage,
        input: [
            {
                role: 'user',
                content: [
                    { type: 'input_text', text: userRequest }],
            }
        ],
        tools: [biomniTool],
        tool_choice: 'auto',
        parallel_tool_calls: false,
      });

      for (const tool_call of completion.output) {
        if (tool_call.type != "function_call") {
            continue
        }

        const toolCallId = tool_call.id;
        const toolCallArguments = tool_call.arguments;
        console.log("tool call id", toolCallId);
        console.log("tool call arguments", toolCallArguments);

      }

      const text = (completion as any).output_text ?? '';
      res.json({ text });
});
