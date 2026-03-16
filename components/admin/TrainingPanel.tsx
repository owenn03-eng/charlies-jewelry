"use client";

import { useState } from "react";

interface TrainingPanelProps {
  password: string;
  uploadedUrls: string[];
  currentModelId: string;
  onModelUpdated: (modelId: string) => void;
}

interface TrainResponse {
  trainingId?: string;
  destination?: string;
  status?: string;
  message?: string;
  error?: string;
}

interface StatusResponse {
  status?: string;
  modelId?: string;
  error?: string;
}

export default function TrainingPanel({ password, uploadedUrls, currentModelId, onModelUpdated }: TrainingPanelProps) {
  const [trainingId, setTrainingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  async function startTraining() {
    setMessage(null);
    setStatus("starting");
    try {
      const res = await fetch("/api/train-model", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ photoUrls: uploadedUrls }),
      });
      const data = await res.json() as TrainResponse;
      if (data.trainingId) {
        setTrainingId(data.trainingId);
        setStatus(data.status ?? "processing");
        setMessage(data.message ?? "Training started.");
        pollStatus(data.trainingId);
      } else {
        setStatus("failed");
        setMessage(data.error ?? "Failed to start training.");
      }
    } catch {
      setStatus("failed");
      setMessage("Network error starting training.");
    }
  }

  function pollStatus(id: string) {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/train-model?trainingId=${id}`, {
          headers: { "x-admin-password": password },
        });
        const data = await res.json() as StatusResponse;
        setStatus(data.status ?? null);
        if (data.status === "succeeded" && data.modelId) {
          onModelUpdated(data.modelId);
          setMessage(`Training complete! Model ready: ${data.modelId}`);
          clearInterval(interval);
          setPolling(false);
        } else if (data.status === "failed" || data.status === "canceled") {
          setMessage("Training failed. Check Replicate dashboard for details.");
          clearInterval(interval);
          setPolling(false);
        }
      } catch {
        // keep polling
      }
    }, 30000); // poll every 30s
  }

  const canTrain = uploadedUrls.length >= 5;

  return (
    <div className="space-y-4">
      <div className="text-sm text-stone-600 space-y-1">
        <p>Photos uploaded: <strong>{uploadedUrls.length}</strong> {uploadedUrls.length < 5 && <span className="text-red-500">(minimum 5 required)</span>}</p>
        {currentModelId && !currentModelId.includes(":PENDING-") && (
          <p className="text-green-700">Active model: <code className="text-xs bg-stone-100 px-1 rounded">{currentModelId}</code></p>
        )}
        {currentModelId.includes(":PENDING-") && (
          <p className="text-amber-600">Model training in progress…</p>
        )}
      </div>

      {status && (
        <div className="text-sm bg-stone-100 rounded-lg px-4 py-3 space-y-1">
          <p>Status: <strong className="capitalize">{status}</strong></p>
          {message && <p className="text-stone-600">{message}</p>}
          {polling && <p className="text-xs text-stone-400 animate-pulse">Checking every 30 seconds…</p>}
        </div>
      )}

      <button
        onClick={startTraining}
        disabled={!canTrain || polling || status === "starting"}
        className="px-5 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
      >
        {polling ? "Training in progress…" : "Start Model Training"}
      </button>

      <p className="text-xs text-stone-400">
        Training takes 20–40 minutes and costs approximately $0.50–$2.00 on Replicate.
        You only need to do this once (or when you want to update with new photos).
      </p>
    </div>
  );
}
