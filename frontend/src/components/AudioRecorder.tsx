"use client";

import { useEffect, useRef, useState } from "react";

export default function AudioRecorder() {
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const chunksRef = useRef<BlobPart[]>([]);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  function startTimer() {
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => Math.min(s + 1, 120));
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = "audio/webm;codecs=opus";
      const mimeType = (window as any).MediaRecorder?.isTypeSupported?.(
        preferred
      )
        ? preferred
        : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setRecording(false);
        stopTimer();
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setRecorder(mr);
      setRecording(true);
      startTimer();
    } catch (e: any) {
      alert(e?.message || "Microphone permission denied");
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function reset() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setSeconds(0);
  }

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center gap-3">
        {!recording ? (
          <button
            onClick={startRecording}
            className="rounded bg-black text-white px-4 py-2"
          >
            Record
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="rounded bg-red-600 text-white px-4 py-2"
          >
            Stop
          </button>
        )}
        <span className="text-sm text-gray-600">{seconds}s</span>
        <button
          onClick={reset}
          className="ml-auto text-sm text-gray-500 underline"
        >
          Re-record
        </button>
      </div>

      {blobUrl && (
        <div className="mt-4">
          <audio controls src={blobUrl} className="w-full" />
        </div>
      )}
    </div>
  );
}
