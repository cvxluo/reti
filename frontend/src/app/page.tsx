"use client";
import Chat from "@/components/Chat";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-100 text-stone-900">
      <header className="border-b border-stone-300/60 bg-stone-100/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500/70" />
            <span className="text-lg font-semibold tracking-tight">reti</span>
          </div>
          <div className="text-[11px] text-stone-600">Prototype • No PHI</div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8">
        <Chat />
      </section>
    </main>
  );
}
