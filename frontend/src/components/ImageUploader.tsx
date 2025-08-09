"use client";

import { useEffect, useState } from "react";

type HPO = { id: string; label: string; confidence: number };
type PhenotypeResp = { phenotype_text: string; hpo: HPO[] };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4001";

export default function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PhenotypeResp | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
  }

  function clearSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setResult(null);
    setError(null);
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);

      const r = await fetch(`${API_BASE}/api/phenotype/upload-image`, {
        method: "POST",
        body: fd,
      });

      if (!r.ok) {
        const msg = await r.text();
        throw new Error(`${r.status} ${r.statusText}: ${msg}`);
      }

      const json = (await r.json()) as PhenotypeResp;
      setResult(json);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Request failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <label className="btn btn-primary cursor-pointer">
          Choose Image
          <input
            type="file"
            accept="image/*"
            onChange={onChange}
            className="hidden"
          />
        </label>
        {file && (
          <>
            <button onClick={clearSelection} className="btn btn-link text-sm">
              Remove
            </button>
            <button
              onClick={analyze}
              className="btn btn-secondary"
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </>
        )}
      </div>

      {previewUrl && (
        <div className="mt-2 flex items-start gap-3">
          <img
            src={previewUrl}
            alt={file?.name || "Selected image"}
            className="h-32 w-32 object-cover rounded-xl border"
          />
          <div className="text-xs text-gray-600">
            <div className="truncate">{file?.name}</div>
            <div>{Math.round((file?.size || 0) / 1024)} KB</div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 break-words">Error: {error}</div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="font-medium">Phenotype</div>
          <div className="rounded-xl border p-3 text-sm leading-relaxed">
            {result.phenotype_text}
          </div>
          {result.hpo?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.hpo.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center rounded-full border px-2 py-1 text-xs"
                  title={`${t.id} (${t.confidence.toFixed(2)})`}
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
