import { NextRequest, NextResponse } from "next/server";
import { getReplicateClient } from "@/lib/replicate";
import { getConfig, saveConfig } from "@/lib/config";

function isAuthorized(req: NextRequest): boolean {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

interface TrainBody {
  photoUrls: string[];
  triggerWord?: string;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TrainBody;
  try {
    body = await req.json() as TrainBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.photoUrls || body.photoUrls.length < 5) {
    return NextResponse.json(
      { error: "At least 5 photos are required for training" },
      { status: 400 }
    );
  }

  const triggerWord = body.triggerWord ?? "CHARJEWEL";
  const replicateUsername = process.env.REPLICATE_USERNAME;
  if (!replicateUsername) {
    return NextResponse.json({ error: "REPLICATE_USERNAME env var not set" }, { status: 500 });
  }

  try {
    const replicate = getReplicateClient();

    const modelName = `charlies-jewelry-${Date.now()}`;
    const destination = `${replicateUsername}/${modelName}` as `${string}/${string}`;

    // Replicate requires the destination model to exist before training
    await replicate.models.create(replicateUsername, modelName, {
      visibility: "private",
      hardware: "gpu-l40s",
    });

    // Start LoRA training
    const training = await replicate.trainings.create(
      "ostris",
      "flux-dev-lora-trainer",
      "e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497",
      {
        destination,
        input: {
          // flux-dev-lora-trainer accepts a newline-separated list of image URLs
          input_images: body.photoUrls.join("\n"),
          trigger_word: triggerWord,
          steps: 1000,
          lora_rank: 16,
          optimizer: "adamw8bit",
          batch_size: 1,
          resolution: "512,768,1024",
          autocaption: true,
          caption_dropout_rate: 0.05,
        },
      }
    );

    // Store the training ID and destination so admin can check status
    const config = getConfig();
    // We'll store the pending model info; once training completes the model version will be set
    saveConfig({ ...config, replicateModelId: `${destination}:PENDING-${training.id}` });

    return NextResponse.json({
      trainingId: training.id,
      destination,
      status: training.status,
      message: "Training started. This typically takes 20–40 minutes. Check the status below.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("train-model error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const trainingId = searchParams.get("trainingId");

  if (!trainingId) {
    return NextResponse.json({ error: "trainingId is required" }, { status: 400 });
  }

  try {
    const replicate = getReplicateClient();
    const training = await replicate.trainings.get(trainingId);

    // If training succeeded, extract the model version and save it
    if (training.status === "succeeded" && training.output) {
      const output = training.output as { version?: string };
      if (output.version) {
        const config = getConfig();
        // Extract destination from the stored pending model ID
        const stored = config.replicateModelId;
        const destination = stored.split(":PENDING-")[0];
        const fullModelId = `${destination}:${output.version}`;
        saveConfig({ ...config, replicateModelId: fullModelId });
        return NextResponse.json({ status: training.status, modelId: fullModelId });
      }
    }

    return NextResponse.json({ status: training.status });
  } catch (err) {
    console.error("training status error:", err);
    return NextResponse.json({ error: "Failed to get training status" }, { status: 500 });
  }
}
