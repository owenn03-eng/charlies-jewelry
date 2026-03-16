"use client";

import { useState, useEffect } from "react";
import PhotoUploader from "@/components/admin/PhotoUploader";
import TrainingPanel from "@/components/admin/TrainingPanel";
import PricingConfig from "@/components/admin/PricingConfig";

interface Config {
  laborFee: number;
  shippingFee: number;
  markupMultiplier: number;
  replicateModelId: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [config, setConfig] = useState<Config | null>(null);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  async function handleAuth() {
    setAuthError(false);
    try {
      const res = await fetch("/api/config", {
        headers: { "x-admin-password": password },
      });
      // /api/config GET is public, but we verify password by posting a no-op
      const verifyRes = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({}),
      });
      if (verifyRes.status === 401) {
        setAuthError(true);
        return;
      }
      const data = await res.json() as Config;
      setConfig(data);
      setAuthenticated(true);
    } catch {
      setAuthError(true);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-stone-800">Admin Access</h1>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {authError && <p className="text-sm text-red-600">Incorrect password.</p>}
          <button
            onClick={handleAuth}
            className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-stone-800">Admin Panel</h1>
        <p className="text-stone-500 text-sm mt-1">Manage AI model training and pricing</p>
      </header>

      {/* Photo Upload */}
      <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">1. Upload Training Photos</h2>
        <PhotoUploader
          password={password}
          onUploaded={(url) => setUploadedUrls((prev) => [...prev, url])}
        />
        {uploadedUrls.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {uploadedUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="Uploaded reference" className="h-20 w-full object-cover rounded-lg" />
            ))}
          </div>
        )}
      </section>

      {/* Model Training */}
      <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">2. Train AI Model</h2>
        <TrainingPanel
          password={password}
          uploadedUrls={uploadedUrls}
          currentModelId={config?.replicateModelId ?? ""}
          onModelUpdated={(modelId) => setConfig((c) => c ? { ...c, replicateModelId: modelId } : c)}
        />
      </section>

      {/* Pricing */}
      <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">3. Pricing Settings</h2>
        {config && (
          <PricingConfig
            password={password}
            config={config}
            onSaved={(updated) => setConfig(updated)}
          />
        )}
      </section>

      <div className="text-center">
        <a href="/" className="text-sm text-amber-700 underline">Back to ring configurator</a>
      </div>
    </div>
  );
}
