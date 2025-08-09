"use client";

import { useEffect, useRef, useState } from "react";

type HPO = { id: string; label: string; confidence: number };
type PhenotypeResp = { phenotype_text: string; hpo: HPO[] };

type Msg =
  | {
      id: string;
      role: "user";
      text?: string;
      imageUrl?: string;
      audioUrl?: string;
    }
  | { id: string; role: "assistant"; text: string; hpo: HPO[] };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4001";

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendText() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const uid = crypto.randomUUID();
    setMessages((m) => [...m, { id: uid, role: "user", text }]);
    await runPhenotypeFromText(text);
  }

  async function runPhenotypeFromText(text: string) {
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/phenotype`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "text", text }),
      });
      const json = (await r.json()) as PhenotypeResp;
      addAssistant(json);
    } catch (e: unknown) {
      addAssistant({ phenotype_text: "Sorry—text analysis failed.", hpo: [] });
    } finally {
      setBusy(false);
    }
  }

  function addAssistant(p: PhenotypeResp) {
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: p.phenotype_text,
        hpo: p.hpo,
      },
    ]);
  }

  async function onPickImage(file: File) {
    const url = URL.createObjectURL(file);
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", imageUrl: url },
    ]);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await fetch(`${API_BASE}/api/phenotype/upload-image`, {
        method: "POST",
        body: fd,
      });
      const json = (await r.json()) as PhenotypeResp;
      addAssistant(json);
    } catch {
      addAssistant({ phenotype_text: "Sorry—image analysis failed.", hpo: [] });
    } finally {
      setBusy(false);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  async function recordAudio() {
    // If already recording → stop
    if (isRecording && mediaRecorder) {
      try {
        mediaRecorder.stop();
      } catch {}
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = "audio/webm;codecs=opus";
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mime) ? mime : "audio/webm",
      });
      const chunks: BlobPart[] = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mr.onstop = async () => {
        // cleanup mic
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setMediaRecorder(null);

        // assemble blob
        const blob = new Blob(chunks, { type: mr.mimeType });
        const url = URL.createObjectURL(blob);
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "user", audioUrl: url },
        ]);

        // transcribe → phenotype
        setBusy(true);
        try {
          const fd = new FormData();
          fd.append(
            "file",
            new File([blob], "audio.webm", { type: blob.type })
          );
          const tr = await fetch(`${API_BASE}/api/transcribe`, {
            method: "POST",
            body: fd,
          });
          const tj = (await tr.json()) as { transcript?: string };
          if (tj.transcript) {
            await runPhenotypeFromText(tj.transcript);
          } else {
            addAssistant({
              phenotype_text: "No transcript produced.",
              hpo: [],
            });
          }
        } catch {
          addAssistant({
            phenotype_text: "Sorry—transcription failed.",
            hpo: [],
          });
        } finally {
          setBusy(false);
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        }
      };

      mr.start(); // begin recording
      setMediaRecorder(mr);
      setIsRecording(true);
    } catch {
      alert("Microphone permission denied");
    }
  }

  return (
    <div className="mx-auto max-w-5xl h-[calc(100vh-120px)] rounded-2xl border border-stone-300/70 bg-stone-50 shadow-sm flex flex-col">
      {/* conversation */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        {busy && <div className="text-xs text-stone-500 px-2">Thinking…</div>}
      </div>

      {/* input bar */}
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
                sendText();
              }
            }}
          />
          <button
            onClick={sendText}
            className="rounded-xl bg-emerald-600 text-white text-sm px-4 py-2 disabled:opacity-50"
            disabled={!input.trim() || busy}
          >
            Send
          </button>
          <button
            onClick={recordAudio}
            className={`rounded-xl border border-stone-300/70 text-sm px-3 py-2 disabled:opacity-50 ${
              isRecording ? "bg-red-500 text-white" : "bg-white"
            }`}
            title={isRecording ? "Stop recording" : "Record brief audio"}
            disabled={busy}
          >
            {isRecording ? "⏹" : "🎙️"}
          </button>

          <label className="rounded-xl border border-stone-300/70 bg-white text-sm px-3 py-2 cursor-pointer disabled:opacity-50">
            📷
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickImage(f);
              }}
              disabled={busy}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl p-3 text-sm ${
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-white border border-stone-300/70 text-stone-900"
        }`}
      >
        {msg.text && (
          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
        )}
        {msg.imageUrl && (
          <img
            src={msg.imageUrl}
            alt="uploaded"
            className="mt-1 rounded-lg border w-48 h-36 object-cover"
          />
        )}
        {msg.audioUrl && (
          <audio className="mt-2 w-56" controls src={msg.audioUrl} />
        )}
        {"hpo" in msg && msg.hpo?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {msg.hpo.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center rounded-full border border-stone-300 bg-stone-100 px-2 py-1 text-xs text-stone-700"
                title={`${t.id} (${t.confidence.toFixed(2)})`}
              >
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
