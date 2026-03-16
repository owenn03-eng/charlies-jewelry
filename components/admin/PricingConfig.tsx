"use client";

import { useState } from "react";

interface Config {
  laborFee: number;
  shippingFee: number;
  markupMultiplier: number;
  replicateModelId: string;
}

interface PricingConfigProps {
  password: string;
  config: Config;
  onSaved: (config: Config) => void;
}

export default function PricingConfig({ password, config, onSaved }: PricingConfigProps) {
  const [laborFee, setLaborFee] = useState(config.laborFee.toString());
  const [shippingFee, setShippingFee] = useState(config.shippingFee.toString());
  const [markup, setMarkup] = useState(config.markupMultiplier.toString());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({
          laborFee: parseFloat(laborFee),
          shippingFee: parseFloat(shippingFee),
          markupMultiplier: parseFloat(markup),
        }),
      });
      const data = await res.json() as Config & { error?: string };
      if (data.error) {
        setMessage(`Error: ${data.error}`);
      } else {
        onSaved(data);
        setMessage("Saved.");
      }
    } catch {
      setMessage("Network error saving config.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Labor fee ($)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={laborFee}
            onChange={(e) => setLaborFee(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Shipping & finishing fee ($)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={shippingFee}
            onChange={(e) => setShippingFee(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Silver markup multiplier</label>
          <input
            type="number"
            min="1"
            step="0.1"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-xs text-stone-400 mt-0.5">e.g. 3 = 3× spot price for material</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {saving ? "Saving…" : "Save Pricing"}
        </button>
        {message && <p className="text-sm text-stone-600">{message}</p>}
      </div>
    </div>
  );
}
