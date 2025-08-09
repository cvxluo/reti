"use client";
import Chat from "@/components/Chat";
import { useState } from "react";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<
    "Converse" | "Upload Data"
  >("Converse");
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
              >
                <span className="text-xs text-stone-800">{selectedOption}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3 w-3 text-stone-600"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.104l3.71-3.874a.75.75 0 111.08 1.04l-4.24 4.43a.75.75 0 01-1.08 0l-4.24-4.43a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isMenuOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 mt-1 w-36 rounded-md border border-stone-300/70 bg-white p-1 shadow-lg"
                >
                  <button
                    type="button"
                    className="w-full text-left cursor-default rounded px-2 py-1.5 text-xs hover:bg-stone-100"
                    role="menuitem"
                    onClick={() => {
                      setSelectedOption("Converse");
                      setIsMenuOpen(false);
                    }}
                  >
                    Converse
                  </button>
                  <button
                    type="button"
                    className="w-full text-left cursor-default rounded px-2 py-1.5 text-xs hover:bg-stone-100"
                    role="menuitem"
                    onClick={() => {
                      setSelectedOption("Upload Data");
                      setIsMenuOpen(false);
                    }}
                  >
                    Upload Data
                  </button>
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
