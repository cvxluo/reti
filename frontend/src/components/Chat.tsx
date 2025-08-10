"use client";

import { useEffect, useRef, useState } from "react";
import CameraCapture from "./CameraCapture";
import ThinkingIndicator from "./ThinkingIndicator";

type HPO = { id: string; label: string; confidence: number };
type AgentResp = { text: string; hpo?: HPO[] };
type PhenotypeResp = { phenotype_text: string; hpo: HPO[] };

type Msg =
  | {
      id: string;
      role: "user";
      text?: string;
      imageUrl?: string;
      audioUrl?: string;
    }
  | { id: string; role: "assistant"; text: string; hpo?: HPO[] };

const API_BASE = "http://localhost:4001";

export default function Chat({
  onMessageSent,
}: {
  onMessageSent?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "intro-message",
      role: "assistant",
      text: "Hello! I'm Reti, your AI-powered genetic analysis assistant. I can help you analyze symptoms, images, and audio descriptions to identify potential genetic conditions using HPO (Human Phenotype Ontology) terms. Feel free to describe symptoms, upload photos, or record audio - I'm here to assist with your genetic analysis needs.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  async function callAgentStream(payload: {
    userRequest: string;
    imageDataUrl?: string;
    audioDataUrl?: string;
    onChunk: (text: string) => void;
    onHpo?: (hpo: HPO[]) => void;
  }): Promise<void> {
    console.log("calling agent @", `${API_BASE}/api/agent`);

    const r = await fetch(`${API_BASE}/api/agent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        userRequest: payload.userRequest,
        imageDataUrl: payload.imageDataUrl,
        audioDataUrl: payload.audioDataUrl,
      }),
    });
    if (!r.ok || !r.body) {
      const msg = await r.text().catch(() => "");
      throw new Error(msg || `${r.status} ${r.statusText}`);
    }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Parse SSE lines
      const parts = buffer.split(/\n\n/);
      buffer = parts.pop() ?? "";
      for (const frame of parts) {
        const lines = frame.split("\n");
        let event: string | null = null;
        let data = "";
        for (const ln of lines) {
          if (ln.startsWith("event:")) event = ln.slice(6).trim();
          else if (ln.startsWith("data:")) {
            // Preserve leading spaces in token deltas
            const raw = ln.startsWith("data: ") ? ln.slice(6) : ln.slice(5);
            data += (data ? "\n" : "") + raw;
          }
        }
        if (event === "hpo" && payload.onHpo) {
          try {
            payload.onHpo(JSON.parse(data));
          } catch {}
          continue;
        }
        if (event === "done") continue;
        if (data) payload.onChunk(data);
      }
    }
  }

  async function sendText() {
    const text = input.trim();
    if (!text || busy) return;

    const uid = crypto.randomUUID();
    setMessages((m) => [...m, { id: uid, role: "user", text }]);
    setInput("");
    setBusy(true);

    // Notify parent that a message was sent
    onMessageSent?.();

    try {
      const asstId = crypto.randomUUID();
      setMessages((m) => [...m, { id: asstId, role: "assistant", text: "" }]);
      let acc = "";
      let hpoAcc: HPO[] | undefined;
      await callAgentStream({
        userRequest: text,
        onChunk: (t) => {
          acc += t;
          setMessages((m) =>
            m.map((msg) =>
              msg.id === asstId ? { ...msg, text: acc, hpo: hpoAcc } : msg
            )
          );
        },
        onHpo: (h) => {
          hpoAcc = h;
          setMessages((m) =>
            m.map((msg) => (msg.id === asstId ? { ...msg, hpo: h } : msg))
          );
        },
      });
    } catch (e: unknown) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: e instanceof Error ? e.message : "Request failed",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  async function onPickImage(file: File) {
    const objectUrl = URL.createObjectURL(file);
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", imageUrl: objectUrl },
    ]);

    setBusy(true);

    // Notify parent that a message was sent
    onMessageSent?.();
    try {
      const imageDataUrl = await fileToDataUrl(file);

      const asstId = crypto.randomUUID();
      setMessages((m) => [...m, { id: asstId, role: "assistant", text: "" }]);

      let acc = "";
      let hpoAcc: HPO[] | undefined;

      await callAgentStream({
        userRequest: "Analyze this image",
        imageDataUrl,
        onChunk: (t) => {
          acc += t;
          setMessages((m) =>
            m.map((msg) =>
              msg.id === asstId ? { ...msg, text: acc, hpo: hpoAcc } : msg
            )
          );
        },
        onHpo: (h) => {
          hpoAcc = h;
          setMessages((m) =>
            m.map((msg) => (msg.id === asstId ? { ...msg, hpo: h } : msg))
          );
        },
      });
    } catch (e: unknown) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: e instanceof Error ? e.message : "Image analysis failed",
        },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    }
  }

  // click once to start, click again to stop → transcribe → phenotype
  async function recordAudio() {
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

      mr.ondataavailable = (e) =>
        e.data && e.data.size > 0 && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setMediaRecorder(null);

        const blob = new Blob(chunks, { type: mr.mimeType });
        const objectUrl = URL.createObjectURL(blob);
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "user", audioUrl: objectUrl },
        ]);

        // Notify parent that a message was sent
        onMessageSent?.();

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
            // Add the transcript as a user message so user can see what was transcribed
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "user",
                text: `Audio Transcription: ${tj.transcript}`,
              },
            ]);
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
          setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
        }
      };

      mr.start();
      setMediaRecorder(mr);
      setIsRecording(true);
    } catch {
      alert("Microphone permission denied");
    }
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

  function openCamera() {
    setShowCamera(true);
  }
  function closeCamera() {
    setShowCamera(false);
  }

  return (
    <div className="h-full rounded-2xl border border-stone-300/70 bg-stone-50 shadow-sm flex flex-col">
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      >
        {/* Background "reti" text when only intro message exists */}
        {messages.length === 1 && messages[0]?.id === "intro-message" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-[15vw] font-bold text-stone-500/40 select-none">
              reti
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        {busy && <ThinkingIndicator />}
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
            🖼️
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
          <button
            onClick={openCamera}
            className="rounded-xl border border-stone-300/70 bg-white text-sm px-3 py-2 disabled:opacity-50"
            title="Open camera"
            disabled={busy}
          >
            📸
          </button>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={(file) => {
            onPickImage(file);
            closeCamera();
          }}
          onClose={closeCamera}
        />
      )}
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
        {"imageUrl" in msg && msg.imageUrl && (
          <img
            src={msg.imageUrl}
            alt="uploaded"
            className="mt-1 rounded-lg border w-48 h-36 object-cover"
          />
        )}
        {"audioUrl" in msg && msg.audioUrl && (
          <audio className="mt-2 w-56" controls src={msg.audioUrl} />
        )}
        {"hpo" in msg && (msg.hpo?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {msg.hpo!.map((t) => (
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

/* helpers */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}
