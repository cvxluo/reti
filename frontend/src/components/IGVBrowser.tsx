"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

interface IGVBrowserProps {
  options?: IgvBrowserOptions;
}

// Default IGV options
const defaultIgvOptions: IgvBrowserOptions = {
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

function createVcfDataUri(params: {
  chrom: string;
  pos: number | string;
  ref: string;
  alt: string;
  info?: string;
}): string {
  const { chrom, pos, ref, alt, info } = params;
  const header =
    "##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n";
  const row = `${chrom}\t${pos}\t.\t${ref}\t${alt}\t.\tPASS\t${info ?? ""}`;
  const text = header + row + "\n";
  return `data:text/plain;base64,${btoa(text)}`;
}

const IGVBrowser: React.FC<IGVBrowserProps> = ({ options }) => {
  const [files, setFiles] = useState<
    Array<{ file: string; id: string | null; variant: any | null }>
  >([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const browserRef = useRef<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch first 3 phenopackets from backend API (reti/api)
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetch("http://localhost:4001/api/phenopackets");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setFiles(data.files ?? []);
        if (data.files?.[0]) setSelected(data.files[0].file);
        // Auto-select first 3 files by default
        if (data.files?.length > 0) {
          const firstThree = new Set<string>(
            data.files.slice(0, 3).map((f: any) => f.file)
          );
          setSelectedFiles(firstThree);
        }
      } catch (e) {
        console.error("Failed to fetch phenopackets", e);
        setError("Backend unavailable or no phenopackets found");
      }
      setLoading(false);
    };
    load();
  }, []);

  // Handle file selection changes
  const handleFileToggle = (file: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(file)) {
      newSelected.delete(file);
    } else {
      newSelected.add(file);
    }
    setSelectedFiles(newSelected);
  };

  // Generate consistent colors for tracks
  const getTrackColor = (file: string) => {
    const colors = [
      "#1f77b4",
      "#ff7f0e",
      "#2ca02c",
      "#d62728",
      "#9467bd",
      "#8c564b",
      "#e377c2",
      "#7f7f7f",
      "#bcbd22",
      "#17becf",
    ];
    const index = files.findIndex((f) => f.file === file) % colors.length;
    return colors[index];
  };

  // Merge base options with a variant VCF track derived from selected file
  const mergedOptions = useMemo(() => {
    const selectedVariants = files
      .filter((f) => selectedFiles.has(f.file))
      .map((f) => f.variant)
      .filter(Boolean);

    // Use provided options or default options
    const baseOptions = options || defaultIgvOptions;

    // Calculate optimal locus based on all selected variants
    let locus = baseOptions.locus ?? "chr8:127,736,588-127,739,371";

    if (selectedVariants.length > 0) {
      const positions = selectedVariants.map((v) => Number(v.pos));
      const minPos = Math.min(...positions);
      const maxPos = Math.max(...positions);
      const chrom = selectedVariants[0].chrom;
      const padding = Math.max(1000, (maxPos - minPos) * 0.2);
      locus = `${chrom}:${minPos - padding}-${maxPos + padding}`;

      // Debug: Log the calculated locus
      console.log("Calculated locus for variants:", locus);
      console.log("Selected variants:", selectedVariants);
    }

    const baseTracks = Array.isArray(baseOptions.tracks)
      ? baseOptions.tracks
      : [];

    // Create variant tracks for each selected file
    const variantTracks = files
      .filter((f) => selectedFiles.has(f.file) && f.variant)
      .map((f) => {
        const v = f.variant;
        const info = [
          v.gene ? `GENE=${v.gene}` : null,
          v.hgvs ? `HGVS=${v.hgvs}` : null,
        ]
          .filter(Boolean)
          .join(";");

        return {
          name: `${f.id || f.file} - ${v.gene || "Unknown Gene"}`,
          type: "variant",
          format: "vcf",
          url: createVcfDataUri({
            chrom: v.chrom,
            pos: v.pos,
            ref: v.ref,
            alt: v.alt,
            info,
          }),
          height: 60,
          color: getTrackColor(f.file),
        };
      });

    return {
      ...baseOptions,
      locus,
      tracks: [...baseTracks, ...variantTracks],
    } as any;
  }, [files, selectedFiles, options]);

  useEffect(() => {
    let isCancelled = false;
    const tryInit = () => {
      const igvDiv = document.getElementById("igv-div");
      if (!isCancelled && igvDiv && typeof igv !== "undefined") {
        // Clear previous contents to avoid stacking canvases
        igvDiv.innerHTML = "";
        igv
          .createBrowser(igvDiv, mergedOptions)
          .then((browser: any) => {
            browserRef.current = browser ?? null;
            console.log(
              "Created IGV browser with",
              mergedOptions.tracks.length,
              "tracks"
            );

            // Force navigation to the calculated locus if it's different from default
            if (mergedOptions.locus !== (options as any)?.locus) {
              console.log("Navigating to variant locus:", mergedOptions.locus);
              browser.search(mergedOptions.locus);
            }
          })
          .catch((error: unknown) => {
            console.error("Error creating IGV browser:", error);
          });
      }
    };

    // In case the script hasn't loaded yet, poll briefly
    const intervalId = window.setInterval(() => {
      if (typeof igv !== "undefined") {
        window.clearInterval(intervalId);
        tryInit();
      }
    }, 100);

    // Also attempt immediately
    tryInit();

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [mergedOptions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* File Upload Section */}
      <div
        style={{
          marginBottom: 16,
          padding: "12px",
          border: "2px dashed #d1d5db",
          borderRadius: 8,
          background: "#f9fafb",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onClick={() => document.getElementById("file-upload")?.click()}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#9ca3af";
          e.currentTarget.style.background = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#d1d5db";
          e.currentTarget.style.background = "#f9fafb";
        }}
      >
        <input
          id="file-upload"
          type="file"
          accept=".vcf,.bam,.cram,.bed,.gff,.gtf,.txt,.csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              console.log(
                "File selected:",
                file.name,
                "Size:",
                file.size,
                "bytes"
              );
              // File is selected but not processed - just log it
              e.target.value = ""; // Reset input
            }
          }}
        />
        <div style={{ textAlign: "center", color: "#6b7280", fontSize: 14 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>📁</span>
          </div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            Upload Custom File
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Drag & drop or click to upload VCF, BAM, or other genomic files
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <label style={{ fontSize: 12, color: "#4b5563" }}>Phenopackets:</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {files.map((f) => {
            const isSelected = selectedFiles.has(f.file);
            const hasVariant = !!f.variant;
            return (
              <label
                key={f.file}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: `2px solid ${
                    isSelected ? getTrackColor(f.file) : "#d1d5db"
                  }`,
                  background: isSelected
                    ? `${getTrackColor(f.file)}10`
                    : "#f9fafb",
                  cursor: hasVariant ? "pointer" : "not-allowed",
                  opacity: hasVariant ? 1 : 0.5,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleFileToggle(f.file)}
                  disabled={!hasVariant}
                  style={{ margin: 0 }}
                />
                <span style={{ color: isSelected ? "#374151" : "#6b7280" }}>
                  {f.id ?? f.file}
                </span>
                {f.variant && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "#6b7280",
                      fontFamily: "monospace",
                    }}
                  >
                    {f.variant.chrom}:{f.variant.pos} {f.variant.ref}→
                    {f.variant.alt}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {error && (
          <span style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>
        )}
      </div>

      {/* Track Summary */}
      {selectedFiles.size > 0 && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px",
            background: "#f8fafc",
            borderRadius: 4,
            fontSize: 11,
            color: "#64748b",
          }}
        >
          <strong>Active Tracks:</strong> Alignment, Genes,{" "}
          {Array.from(selectedFiles)
            .map((file) => {
              const f = files.find((f) => f.file === file);
              return f?.variant
                ? `${f.id || f.file} (${f.variant.gene || "Unknown"})`
                : null;
            })
            .filter(Boolean)
            .join(", ")}
        </div>
      )}
      <Script
        src="https://cdn.jsdelivr.net/npm/igv@2.15.9/dist/igv.min.js"
        strategy="afterInteractive"
      />
      <div
        id="igv-div"
        style={{ width: "100%", flex: "1", minHeight: "400px" }}
      />
    </div>
  );
};

export default IGVBrowser;
