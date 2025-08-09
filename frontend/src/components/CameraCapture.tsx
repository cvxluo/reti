"use client";

import { useEffect, useRef, useState } from "react";

type CameraCaptureProps = {
  onCapture: (file: File) => void;
  onClose: () => void;
};

/**
 * Lightweight camera capture overlay that requests camera access, shows
 * a live preview, and returns a captured JPEG as a File via onCapture.
 */
export default function CameraCapture({
  onCapture,
  onClose,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (cancelled) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Camera permission denied";
        setError(msg);
      }
    }
    init();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        onCapture(file);
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg overflow-hidden">
        <div className="relative bg-black">
          {/* Video preview */}
          <video
            ref={videoRef}
            className="w-full h-72 object-contain bg-black"
            playsInline
            muted
          />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm p-4 text-center">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 p-3 border-t">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-300/70 bg-white px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={capture}
            className="ml-auto rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm"
          >
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}
