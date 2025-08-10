"use client";
import { useState, useEffect } from "react";
import Chat from "@/components/Chat";
import IGVBrowser from "@/components/IGVBrowser";
import Chat2 from "@/components/Chat2";
import ButterflyIcon from "@/components/ButterflyIcon";
import AnimatedButterfly from "@/components/AnimatedButterfly";

export default function Home() {
  const [showButterfly, setShowButterfly] = useState(true);
  const [butterflyFlying, setButterflyFlying] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [hasSubmittedMessage, setHasSubmittedMessage] = useState(false);
  const [showIGV, setShowIGV] = useState(false);

  useEffect(() => {
    // Start the animation sequence after component mounts
    const timer1 = setTimeout(() => {
      setButterflyFlying(true);
    }, 1000); // Butterfly hovers for 1 second

    const timer2 = setTimeout(() => {
      setShowContent(true);
    }, 2000); // Content starts appearing as butterfly flies away

    const timer3 = setTimeout(() => {
      setShowButterfly(false);
    }, 4000); // Remove butterfly from DOM after animation completes

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <>
      {showButterfly && <AnimatedButterfly isFlying={butterflyFlying} />}

      <main
        className={`min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 text-stone-900 transition-all duration-1000 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <header className="border-b border-stone-200/80 bg-gradient-to-r from-emerald-50 via-white to-teal-50 backdrop-blur-sm shadow-sm">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ButterflyIcon />
              <span className="text-xl font-semibold tracking-tight text-stone-900">
                reti
              </span>
            </div>
            <div className="text-sm text-stone-400 font-medium">
              built on gpt-5, with gpt-5.
            </div>
          </div>
        </header>

        <section
          className={`mx-auto px-4 py-8 transition-all duration-700 ${
            showIGV ? "max-w-7xl" : "max-w-5xl"
          }`}
        >
          <div
            className={`transition-all duration-700 ${
              showIGV ? "flex gap-6" : ""
            } h-[calc(100vh-200px)]`}
          >
            {/* Chat Interface */}
            <div
              className={`transition-all duration-700 min-w-0 h-full flex flex-col ${
                showIGV ? "flex-1" : "w-full"
              }`}
            >
              <Chat
                onMessageSent={() => {
                  setHasSubmittedMessage(true);
                }}
              />
            </div>

            {/* IGV Section - only show after button is clicked */}
            {showIGV && (
              <div className="flex-1 min-w-0 flex flex-col animate-in slide-in-from-right duration-700">
                <div className="h-full flex flex-col">
                  <div className="rounded-lg border border-stone-300/60 bg-white shadow-sm overflow-hidden h-full flex flex-col">
                    <div className="px-4 py-3 border-b border-stone-200 flex-shrink-0">
                      <h2 className="text-base font-semibold tracking-tight">
                        Genomic Viewer
                      </h2>
                    </div>
                    <div className="p-2 flex-1 overflow-hidden flex flex-col">
                      <div className="h-full w-full">
                        <IGVBrowser />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Small button that appears after message is sent but before IGV is shown */}
          {hasSubmittedMessage && !showIGV && (
            <div className="flex justify-center mt-4 animate-in fade-in duration-500">
              <button
                onClick={() => setShowIGV(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-white font-medium shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-105"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Explore Genetics
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
