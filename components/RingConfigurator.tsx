"use client";

import { useState, useEffect, useCallback } from "react";
import { calcRingWeightGrams, calcPrice, US_RING_SIZES, BAND_WIDTHS, BAND_THICKNESSES } from "@/lib/ring-weight";
import PriceQuote from "./PriceQuote";
import ImagePreview from "./ImagePreview";
import FeedbackForm from "./FeedbackForm";

const BAND_STYLES = ["plain", "engraved initials", "fully engraved"] as const;
type BandStyle = typeof BAND_STYLES[number];

const FINISH_TYPES = ["polished", "oxidized/blackened", "brushed matte"] as const;
type FinishType = typeof FINISH_TYPES[number];

interface Config {
  laborFee: number;
  shippingFee: number;
  markupMultiplier: number;
  replicateModelId: string;
}

export default function RingConfigurator() {
  const [bandStyle, setBandStyle] = useState<BandStyle>("plain");
  const [ringSize, setRingSize] = useState<number>(7);
  const [bandWidth, setBandWidth] = useState<number>(5);
  const [bandThickness, setBandThickness] = useState<number>(1.5);
  const [finish, setFinish] = useState<FinishType>("polished");
  const [initials, setInitials] = useState("");

  const [silverPrice, setSilverPrice] = useState<number | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [priceError, setPriceError] = useState(false);

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<string[]>([]);
  const [refinementRound, setRefinementRound] = useState(0);
  const [previousImage, setPreviousImage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/silver-price")
      .then((r) => r.json())
      .then((d: { price?: number }) => {
        if (d.price) setSilverPrice(d.price);
        else setPriceError(true);
      })
      .catch(() => setPriceError(true));

    fetch("/api/config")
      .then((r) => r.json())
      .then((d: Config) => setConfig(d))
      .catch(() => {/* config defaults used if unavailable */});
  }, []);

  // Reset feedback state when configurator options change
  useEffect(() => {
    setOriginalPrompt(null);
    setFeedbackHistory([]);
    setRefinementRound(0);
    setPreviousImage(null);
  }, [bandStyle, finish, bandWidth, bandThickness, ringSize]);

  const weightGrams = calcRingWeightGrams(ringSize, bandWidth, bandThickness);

  const totalPrice =
    silverPrice !== null && config !== null
      ? calcPrice(weightGrams, silverPrice, config.markupMultiplier, config.laborFee, config.shippingFee)
      : null;

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    setGeneratedImage(null);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bandStyle, finish, initials: bandStyle === "engraved initials" ? initials : undefined }),
      });
      const data = await res.json() as { imageUrl?: string; prompt?: string; error?: string };
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setOriginalPrompt(data.prompt ?? null);
        setFeedbackHistory([]);
        setRefinementRound(0);
        setPreviousImage(null);
      } else {
        setGenerateError(data.error ?? "Generation failed");
      }
    } catch {
      setGenerateError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }, [bandStyle, finish, initials]);

  const handleRefine = useCallback(async (feedback: string) => {
    if (!originalPrompt) return;

    const newHistory = [...feedbackHistory, feedback];
    setGenerating(true);
    setGenerateError(null);
    setPreviousImage(generatedImage);

    try {
      // Step 1: Get refined prompt from Claude (always from original + full history)
      const refineRes = await fetch("/api/refine-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalPrompt, feedbackHistory: newHistory }),
      });
      const refineData = await refineRes.json() as { refinedPrompt?: string; error?: string };
      if (refineData.error || !refineData.refinedPrompt) {
        setGenerateError(refineData.error ?? "Failed to refine prompt");
        return;
      }

      // Step 2: Generate image with the refined prompt
      const genRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt: refineData.refinedPrompt }),
      });
      const genData = await genRes.json() as { imageUrl?: string; prompt?: string; error?: string };
      if (genData.imageUrl) {
        setGeneratedImage(genData.imageUrl);
        setFeedbackHistory(newHistory);
        setRefinementRound((r) => r + 1);
        setPreviousImage(null);
      } else {
        setGenerateError(genData.error ?? "Generation failed");
      }
    } catch {
      setGenerateError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }, [originalPrompt, feedbackHistory, generatedImage]);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-10">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-stone-800">Custom Silver Ring</h1>
        <p className="mt-2 text-stone-500">Configure your ring and get an instant quote + AI preview</p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        {/* Band Style */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-stone-700">Band Style</label>
          <div className="flex flex-col gap-2">
            {BAND_STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setBandStyle(s)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                  bandStyle === s
                    ? "border-amber-600 bg-amber-50 text-amber-800"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {bandStyle === "engraved initials" && (
            <input
              type="text"
              maxLength={6}
              placeholder="Initials (e.g. J.M.)"
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              className="mt-2 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          )}
        </div>

        {/* Finish */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-stone-700">Finish</label>
          <div className="flex flex-col gap-2">
            {FINISH_TYPES.map((f) => (
              <button
                key={f}
                onClick={() => setFinish(f)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                  finish === f
                    ? "border-amber-600 bg-amber-50 text-amber-800"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Ring Size */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-stone-700">
            Ring Size (US) — <span className="font-normal text-stone-500">{ringSize}</span>
          </label>
          <select
            value={ringSize}
            onChange={(e) => setRingSize(Number(e.target.value))}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {US_RING_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Band Width */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-stone-700">Band Width</label>
          <div className="flex gap-2 flex-wrap">
            {BAND_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setBandWidth(w)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  bandWidth === w
                    ? "border-amber-600 bg-amber-50 text-amber-800"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                }`}
              >
                {w}mm
              </button>
            ))}
          </div>
        </div>

        {/* Band Thickness */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-stone-700">Band Thickness</label>
          <div className="flex gap-2 flex-wrap">
            {BAND_THICKNESSES.map((t) => (
              <button
                key={t}
                onClick={() => setBandThickness(t)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  bandThickness === t
                    ? "border-amber-600 bg-amber-50 text-amber-800"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                }`}
              >
                {t}mm
              </button>
            ))}
          </div>
        </div>
      </section>

      <PriceQuote
        totalPrice={totalPrice}
        weightGrams={weightGrams}
        silverPrice={silverPrice}
        config={config}
        error={priceError}
      />

      <div className="text-center">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-8 py-3 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          {generating ? "Generating preview…" : "Generate AI Preview"}
        </button>
        {generateError && (
          <p className="mt-2 text-sm text-red-600">{generateError}</p>
        )}
      </div>

      <ImagePreview imageUrl={generating && previousImage ? previousImage : generatedImage} loading={generating} />

      {generatedImage && !generating && (
        <FeedbackForm
          onSubmit={handleRefine}
          loading={generating}
          round={refinementRound}
        />
      )}
    </div>
  );
}
