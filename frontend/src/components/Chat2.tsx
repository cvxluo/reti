"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant" | "function_call_output";
  content: string;
};


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

    const new_messages = [...messages, { role: "user" as const, content: text }];

    setInput("");
    setMessages(new_messages);
    setBusy(true);

    const response = await callAgent(new_messages);
    setMessages(response.messages);
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-5xl h-[calc(100vh-120px)] rounded-2xl border border-stone-300/70 bg-stone-50 shadow-sm flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble message={message} />
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
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl p-3 text-sm ${
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-white border border-stone-300/70 text-stone-900"
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}