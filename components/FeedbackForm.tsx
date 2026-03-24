"use client";

import { useState } from "react";

interface FeedbackFormProps {
  onSubmit: (feedback: string) => void;
  loading: boolean;
  round: number;
}

export default function FeedbackForm({ onSubmit, loading, round }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (!feedback.trim() || loading) return;
    onSubmit(feedback.trim());
    setFeedback("");
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-stone-700">
          Refine your preview
        </label>
        {round > 0 && (
          <span className="text-xs text-stone-400">Refinement #{round}</span>
        )}
      </div>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="What would you change? e.g. make the band thinner, add more detail to the engraving..."
        rows={3}
        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !feedback.trim()}
        className="px-6 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
      >
        {loading ? "Refining…" : "Refine Preview"}
      </button>
    </div>
  );
}
