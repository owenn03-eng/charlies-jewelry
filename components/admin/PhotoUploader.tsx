"use client";

import { useState, useRef } from "react";

interface PhotoUploaderProps {
  password: string;
  onUploaded: (url: string) => void;
}

export default function PhotoUploader({ password, onUploaded }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    setMessage(null);
    let count = 0;
    let errors = 0;

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/upload-photo", {
          method: "POST",
          headers: { "x-admin-password": password },
          body: form,
        });
        const data = await res.json() as { url?: string; error?: string };
        if (data.url) {
          onUploaded(data.url);
          count++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    setUploading(false);
    if (errors > 0) {
      setMessage(`Uploaded ${count} photo(s), ${errors} failed.`);
    } else {
      setMessage(`Uploaded ${count} photo(s) successfully.`);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        Upload photos of your jewelry. At least 5 required; 15–20 recommended for best results.
        Use clear, well-lit close-ups on neutral backgrounds.
      </p>
      <div
        className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-stone-500 text-sm">
          {uploading ? "Uploading…" : "Click or drag & drop photos here"}
        </p>
        <p className="text-xs text-stone-400 mt-1">JPEG, PNG, WebP</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {message && <p className="text-sm text-stone-700">{message}</p>}
    </div>
  );
}
