"use client"; // This is a client component

import React, { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

interface IGVBrowserProps {
  options: IgvBrowserOptions;
}

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
      } catch (e) {
        console.error("Failed to fetch phenopackets", e);
        setError("Backend unavailable or no phenopackets found");
      }
      setLoading(false);
    };
    load();
  }, []);

  // Merge base options with a variant VCF track derived from selected file
  const mergedOptions = useMemo(() => {
    const chosen = files.find((f) => f.file === selected);
    const v = chosen?.variant ?? null;
    const defaultLocus =
      (options as any)?.locus ?? "chr8:127,736,588-127,739,371";
    const locus = v
      ? `${v.chrom}:${Number(v.pos) - 100}-${Number(v.pos) + 100}`
      : defaultLocus;
    const info = v
      ? [v.gene ? `GENE=${v.gene}` : null, v.hgvs ? `HGVS=${v.hgvs}` : null]
          .filter(Boolean)
          .join(";")
      : "";
    const vcfDataUri = v
      ? createVcfDataUri({
          chrom: v.chrom,
          pos: v.pos,
          ref: v.ref,
          alt: v.alt,
          info,
        })
      : null;

    const baseTracks = (options as any)?.tracks ?? [];
    const variantTrack = vcfDataUri
      ? [
          {
            name: `Patient Variant (${chosen?.id ?? chosen?.file})`,
            type: "variant",
            format: "vcf",
            url: vcfDataUri,
          },
        ]
      : [];

    return {
      ...(options as any),
      locus,
      tracks: [...baseTracks, ...variantTrack],
    } as any;
  }, [files, selected, options]);

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
            console.log("Created IGV browser");
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
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <label style={{ fontSize: 12, color: "#4b5563" }}>Phenopacket:</label>
        <select
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            padding: 6,
            borderRadius: 6,
            border: "1px solid #d6d3d1",
            background: "#fff",
            minWidth: 260,
          }}
          disabled={loading || !!error || files.length === 0}
        >
          <option value="" disabled>
            {loading
              ? "Loading phenopackets..."
              : error
              ? "Backend unavailable"
              : files.length === 0
              ? "No phenopackets found"
              : "Select a phenopacket"}
          </option>
          {files.map((f) => (
            <option key={f.file} value={f.file}>
              {f.id ?? f.file}
            </option>
          ))}
        </select>
        {error && (
          <span style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>
        )}
      </div>
      <Script
        src="https://cdn.jsdelivr.net/npm/igv@2.15.9/dist/igv.min.js"
        strategy="afterInteractive"
      />
      <div id="igv-div" style={{ width: "100%", height: "500px" }} />
    </>
  );
};

export default IGVBrowser;
