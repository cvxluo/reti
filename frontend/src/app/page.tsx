"use client";
import AudioRecorder from "@/components/AudioRecorder";

export default function Home() {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Record Audio</h1>
      <AudioRecorder />
      <div className="mt-6 text-xs text-gray-500">
        Limit: ~2 minutes. No PHI.
      </div>
    </div>
  );
}
