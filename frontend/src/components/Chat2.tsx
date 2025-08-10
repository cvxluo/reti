"use client";

import { useEffect, useRef, useState } from "react";

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { id: string; type: "reasoning"; summary: any[] }
  | {
      id: string;
      type: "function_call";
      status: string;
      arguments: string;
      call_id: string;
      name: string;
    }
  | { type: "function_call_output"; call_id: string; output: string };


const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4001";

const callAgent = async (messages: Message[]) => {
  const response = await fetch(`${API_BASE}/api/agent2`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    return { messages: [...messages, { role: "assistant" as const, content: "Error calling agent" }] };
  }
  return (await response.json()) as { messages: Message[] };
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const new_messages: Message[] = [
      ...messages,
      { role: "user" as const, content: text },
    ];

    setInput("");
    setMessages(new_messages);
    setBusy(true);

    const response = await callAgent(new_messages);
    setMessages(response.messages);
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-5xl h-[calc(100vh-120px)] rounded-2xl border border-stone-300/70 bg-stone-50 shadow-sm flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={listRef}>
        {messages.map((message, i) => (
          <MessageBubble key={i} message={message} />
        ))}
        {busy && <div className="text-xs text-stone-500 px-2">Thinking…</div>}
      </div>
      <div className="border-t border-stone-300/70 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder="Type symptoms or a brief note…"
            className="flex-1 resize-none rounded-xl border border-stone-300/70 bg-white/70 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            className="rounded-xl bg-emerald-600 text-white text-sm px-4 py-2 disabled:opacity-50"
            disabled={!input.trim() || busy}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if ("role" in message) {
    const isUser = message.role === "user";
    if (message.role === "user" || message.role === "assistant") {
      return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[80%] rounded-2xl p-3 text-sm ${
              isUser
                ? "bg-emerald-600 text-white"
                : "bg-white border border-stone-300/70 text-stone-900"
            }`}
          >
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
        </div>
      );
    }
  }

  if ("type" in message) {
    if (message.type === "function_call") {
      const args = JSON.parse(message.arguments);
      return (
        <div className="flex justify-center">
          <div className="max-w-[80%] w-full rounded-2xl p-3 text-sm bg-stone-100 border border-stone-300/70 text-stone-600">
            <p className="font-mono text-xs">Tool Call: {message.name}</p>
            <pre className="whitespace-pre-wrap leading-relaxed text-xs bg-stone-200 p-2 rounded-md mt-2">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    if (message.type === "function_call_output") {
      let output_obj;
      try {
        output_obj = JSON.parse(message.output);
      } catch (e) {
        output_obj = message.output;
      }
      return (
        <div className="flex justify-center">
          <div className="max-w-[80%] w-full rounded-2xl p-3 text-sm bg-stone-100 border border-stone-300/70 text-stone-600">
            <p className="font-mono text-xs">
              Tool Output ({message.call_id.slice(0, 8)})
            </p>
            <pre className="whitespace-pre-wrap leading-relaxed text-xs bg-stone-200 p-2 rounded-md mt-2">
              {typeof output_obj === "string"
                ? output_obj
                : JSON.stringify(output_obj, null, 2)}
            </pre>
          </div>
        </div>
      );
    }
  }

  return null;
}