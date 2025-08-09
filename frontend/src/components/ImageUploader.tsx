"use client";

import { useEffect, useState } from "react";

export default function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
  }

  function clearSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
  }

  return (
    <div className="w-full max-w-xl">
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
          <button onClick={clearSelection} className="btn btn-link text-sm">
            Remove
          </button>
        )}
      </div>

      {previewUrl && (
        <div className="mt-4">
          <img
            src={previewUrl}
            alt={file?.name || "Selected image"}
            className="h-32 w-32 object-cover rounded-xl border floating-icon"
          />
          <div className="mt-2 text-xs text-gray-600 truncate">
            {file?.name} ({Math.round((file?.size || 0) / 1024)} KB)
          </div>
        </div>
      )}
    </div>
  );
}
