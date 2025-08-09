"use client";
import Chat from "@/components/Chat";
import { useState } from "react";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <main className="min-h-screen bg-stone-100 text-stone-900">
      <header className="border-b border-stone-300/60 bg-stone-100/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500/70" />
            <span className="text-lg font-semibold tracking-tight">reti</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-stone-200/60"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              ></button>
              {isMenuOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 mt-1 w-36 rounded-md border border-stone-300/70 bg-white p-1 shadow-lg"
                >
                  <div
                    className="cursor-default rounded px-2 py-1.5 text-xs hover:bg-stone-100"
                    role="menuitem"
                  >
                    Converse
                  </div>
                  <div
                    className="cursor-default rounded px-2 py-1.5 text-xs hover:bg-stone-100"
                    role="menuitem"
                  >
                    Upload Data
                  </div>
                </div>
              ) : null}
            </div>
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
