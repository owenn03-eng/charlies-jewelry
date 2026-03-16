import { NextRequest, NextResponse } from "next/server";
import { getReplicateClient, buildRingPrompt } from "@/lib/replicate";
import { getConfig } from "@/lib/config";

interface GenerateBody {
  bandStyle: string;
  finish: string;
  initials?: string;
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

  const prompt = buildRingPrompt(body.bandStyle, body.finish, body.initials);

  try {
    const replicate = getReplicateClient();

    // Flux-based models use guidance_scale ~3.5 and don't support negative_prompt
    const output = await replicate.run(config.replicateModelId as `${string}/${string}:${string}`, {
      input: {
        prompt,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        width: 1024,
        height: 1024,
      },
    });

    const imageUrl = Array.isArray(output)
      ? (output as unknown as string[])[0]
      : (output as unknown as string);

    if (!imageUrl) {
      return NextResponse.json({ error: "No image returned from model" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-image error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
