import { NextRequest, NextResponse } from "next/server";
import { getReplicateClient } from "@/lib/replicate";
import { getConfig, saveConfig } from "@/lib/config";
import { put } from "@vercel/blob";
import JSZip from "jszip";

// Extend timeout — downloading + zipping photos can take 30-60s
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

interface TrainBody {
  photoUrls: string[];
  triggerWord?: string;
}

async function buildZipUrl(photoUrls: string[]): Promise<string> {
  const zip = new JSZip();

  await Promise.all(
    photoUrls.map(async (url, i) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch photo: ${url}`);
      const buffer = await res.arrayBuffer();
      const ext = url.split(".").pop()?.split("?")[0] ?? "jpg";
      zip.file(`photo_${i + 1}.${ext}`, buffer);
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const blob = await put(`training-zips/training-${Date.now()}.zip`, zipBuffer, {
    access: "public",
    contentType: "application/zip",
  });
  return blob.url;
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
  const replicateModelName = process.env.REPLICATE_MODEL_NAME;
  if (!replicateModelName) {
    return NextResponse.json({ error: "REPLICATE_MODEL_NAME env var not set" }, { status: 500 });
  }

  try {
    // flux-dev-lora-trainer requires a zip file URL
    const zipUrl = await buildZipUrl(body.photoUrls);

    const replicate = getReplicateClient();
    const destination = replicateModelName as `${string}/${string}`;

    const training = await replicate.trainings.create(
      "ostris",
      "flux-dev-lora-trainer",
      "e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497",
      {
        destination,
        input: {
          input_images: zipUrl,
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

    const config = await getConfig();
    await saveConfig({ ...config, replicateModelId: `${destination}:PENDING-${training.id}` });

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

    if (training.status === "succeeded" && training.output) {
      const output = training.output as { version?: string };
      if (output.version) {
        const config = await getConfig();
        const stored = config.replicateModelId;
        const destination = stored.split(":PENDING-")[0];
        // output.version may be "owner/model:hash" — extract just the hash
        const versionHash = output.version.includes(":")
          ? output.version.split(":").pop()!
          : output.version;
        const fullModelId = `${destination}:${versionHash}`;
        await saveConfig({ ...config, replicateModelId: fullModelId });
        return NextResponse.json({ status: training.status, modelId: fullModelId });
      }
    }

    return NextResponse.json({ status: training.status });
  } catch (err) {
    console.error("training status error:", err);
    return NextResponse.json({ error: "Failed to get training status" }, { status: 500 });
  }
}
