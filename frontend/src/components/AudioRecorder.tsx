"use client";

import { useEffect, useRef, useState } from "react";

type HPO = { id: string; label: string; confidence: number };
type PhenotypeResp = { phenotype_text: string; hpo: HPO[] };
type TranscribeResp = {
  transcript: string;
  lang: string;
  segments: { start: number; end: number; text: string }[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4001";

export default function AudioRecorder() {
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const chunksRef = useRef<BlobPart[]>([]);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // results + states
  const [transcript, setTranscript] = useState<string>("");
  const [phenotype, setPhenotype] = useState<PhenotypeResp | null>(null);
  const [loadingTranscribe, setLoadingTranscribe] = useState(false);
  const [loadingPhenotype, setLoadingPhenotype] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  function startTimer() {
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => Math.min(s + 1, 120)); // cap at 120s
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    try {
      setError(null);
      setTranscript("");
      setPhenotype(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const preferred = "audio/webm;codecs=opus";
      const mimeType = window.MediaRecorder?.isTypeSupported?.(preferred)
        ? preferred
        : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setRecording(false);
          stopTimer();
          stream.getTracks().forEach((t) => t.stop());

          // kick off API calls
          await sendToTranscribeAndPhenotype(blob, mimeType);
        } catch (e: unknown) {
          if (e instanceof Error) {
            setError(e.message);
          } else {
            setError("Failed after stopping recording");
          }
        }
      };

      mr.start();
      setRecorder(mr);
      setRecording(true);
      startTimer();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Microphone permission denied";
      setError(msg);
      alert(msg);
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function reset() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setSeconds(0);
    setTranscript("");
    setPhenotype(null);
    setError(null);
  }

  async function sendToTranscribeAndPhenotype(blob: Blob, mimeType: string) {
    // 1) /api/transcribe (multipart)
    setLoadingTranscribe(true);
    try {
      const fd = new FormData();
      // give it a filename to help the server infer ext
      const file = new File(
        [blob],
        mimeType.includes("webm") ? "audio.webm" : "audio.mp3",
        { type: mimeType }
      );
      fd.append("file", file);

      const r = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        body: fd,
      });
      if (!r.ok) {
        const msg = await r.text();
        throw new Error(
          `Transcribe failed: ${r.status} ${r.statusText} — ${msg}`
        );
      }
      const json = (await r.json()) as TranscribeResp;
      setTranscript(json.transcript ?? "");

      // 2) /api/phenotype (mode:"text")
      if (json.transcript) {
        setLoadingPhenotype(true);
        const rp = await fetch(`${API_BASE}/api/phenotype`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "text", text: json.transcript }),
        });
        if (!rp.ok) {
          const msg = await rp.text();
          throw new Error(
            `Phenotype failed: ${rp.status} ${rp.statusText} — ${msg}`
          );
        }
        const phen = (await rp.json()) as PhenotypeResp;
        setPhenotype(phen);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Upload/transcribe failed");
      }
    } finally {
      setLoadingTranscribe(false);
      setLoadingPhenotype(false);
    }
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        {!recording ? (
          <button onClick={startRecording} className="btn btn-primary">
            {blobUrl ? "Record Again" : "Record"}
          </button>
        ) : (
          <button onClick={stopRecording} className="btn btn-danger">
            Stop
          </button>
        )}
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {seconds}s
        </span>
        <button onClick={reset} className="ml-auto btn btn-link">
          Reset
        </button>
      </div>

      {blobUrl && (
        <div className="mt-2">
          <audio controls src={blobUrl} className="w-full" />
        </div>
      )}

      {(loadingTranscribe || loadingPhenotype) && (
        <div className="text-sm text-gray-600">
          {loadingTranscribe
            ? "Transcribing…"
            : loadingPhenotype
            ? "Generating phenotype…"
            : null}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 break-words">Error: {error}</div>
      )}

      {transcript && (
        <div>
          <div className="font-medium mb-1">Transcript</div>
          <div className="rounded-xl border p-3 text-sm leading-relaxed">
            {transcript}
          </div>
        </div>
      )}

      {phenotype && (
        <div className="space-y-2">
          <div className="font-medium">Phenotype</div>
          <div className="rounded-xl border p-3 text-sm leading-relaxed">
            {phenotype.phenotype_text}
          </div>
          {phenotype.hpo?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {phenotype.hpo.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center rounded-full border px-2 py-1 text-xs"
                  title={`${t.id} (${t.confidence.toFixed(2)})`}
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
