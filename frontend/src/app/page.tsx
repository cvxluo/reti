"use client";
import Chat from "@/components/Chat";
import IGVBrowser from "@/components/IGVBrowser";

export default function Home() {
  const igvOptions = {
    // Use a reference compatible with the CRAM (GRCh38)
    genome: "hg38",

    // Set the initial genomic location to display
    locus: "chr8:127,736,588-127,739,371",

    // Define the genomic data tracks to load
    tracks: [
      {
        name: "HG00103",
        url: "https://s3.amazonaws.com/1000genomes/data/HG00103/alignment/HG00103.alt_bwamem_GRCh38DH.20150718.GBR.low_coverage.cram",
        indexURL:
          "https://s3.amazonaws.com/1000genomes/data/HG00103/alignment/HG00103.alt_bwamem_GRCh38DH.20150718.GBR.low_coverage.cram.crai",
        format: "cram",
        type: "alignment",
      },
    ],
  };
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
      <div className="mx-auto max-w-5xl px-4 pb-10">
        <div className="rounded-lg border border-stone-300/60 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200">
            <h2 className="text-base font-semibold tracking-tight">
              Genomic Viewer
            </h2>
          </div>
          <div className="p-2">
            <IGVBrowser options={igvOptions} />
          </div>
        </div>
      </div>
    </main>
  );
}
