"use client";
import AudioRecorder from "@/components/AudioRecorder";
import ImageUploader from "@/components/ImageUploader";

export default function Home() {
  return (
    <main className="min-h-screen hero-gradient">
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Brand */}
        <div className="flex items-center justify-center">
          <div className="text-6xl md:text-7xl font-semibold tracking-tight text-indigo-200">
            reti
          </div>
        </div>

        {/* Hero */}
        <section className="mt-10 text-center">
          <h1 className="mt-2 text-5xl md:text-6xl font-semibold tracking-tight">
            A geneticist in your pocket
          </h1>
          <h2 className="mt-1 text-4xl md:text-5xl font-semibold tracking-tight text-white/75 px-3 md:px-6 py-2">
            without the five-figure bill
          </h2>
          <p className="mt-4 text-base md:text-lg text-gray-600 dark:text-gray-300">
            Record short audio and upload an image. That’s it — simple and fast.
          </p>
        </section>

        {/* Content Panel */}
        <section className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="glass panel p-6">
            <h2 className="text-lg font-medium mb-3">Record Audio</h2>
            <AudioRecorder />
            <div className="mt-4 text-xs text-gray-500">
              Limit: ~2 minutes. No PHI.
            </div>
          </div>

          <div className="glass panel p-6">
            <h2 className="text-lg font-medium mb-3">Upload Image</h2>
            <ImageUploader />
          </div>
        </section>

        {/* Footer hint intentionally removed for minimalism */}
      </div>
    </main>
  );
}
