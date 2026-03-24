import { NextRequest, NextResponse } from "next/server";
import { getReplicateClient, buildRingPrompt } from "@/lib/replicate";
import { getConfig } from "@/lib/config";

interface GenerateBody {
  bandStyle?: string;
  finish?: string;
  initials?: string;
  customPrompt?: string;
}

export async function POST(req: NextRequest) {
  let body: GenerateBody;
  try {
    body = await req.json() as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const config = await getConfig();

  if (!config.replicateModelId) {
    return NextResponse.json(
      { error: "AI model not trained yet. Visit /admin to upload photos and train the model." },
      { status: 503 }
    );
  }

  if (config.replicateModelId.includes(":PENDING-")) {
    return NextResponse.json(
      { error: "Model is still training. Check /admin for status." },
      { status: 503 }
    );
  }

  // Fix malformed IDs where destination was duplicated: "owner/model:owner/model:hash"
  // Split on ":" and reconstruct as first-segment:last-segment
  const idParts = config.replicateModelId.split(":");
  const modelId = idParts.length > 2
    ? `${idParts[0]}:${idParts[idParts.length - 1]}`
    : config.replicateModelId;

  const prompt = body.customPrompt ?? buildRingPrompt(body.bandStyle ?? "plain", body.finish ?? "polished", body.initials);

  try {
    const replicate = getReplicateClient();

    // Flux-based models use guidance_scale ~3.5 and don't support negative_prompt
    const output = await replicate.run(modelId as `${string}/${string}:${string}`, {
      input: {
        prompt,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        width: 1024,
        height: 1024,
      },
    });

    // Replicate v1.x returns FileOutput objects with a .url() method; older versions return strings.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function toUrl(v: any): string {
      if (typeof v === "string") return v;
      if (v && typeof v.url === "function") return v.url() as string;
      if (v && typeof v.toString === "function") return v.toString() as string;
      return "";
    }
    const imageUrl = Array.isArray(output) ? toUrl(output[0]) : toUrl(output);

    if (!imageUrl) {
      return NextResponse.json({ error: "No image returned from model" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl, prompt });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-image error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
