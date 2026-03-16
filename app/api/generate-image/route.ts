import { NextRequest, NextResponse } from "next/server";
import { getReplicateClient, buildRingPrompt, buildNegativePrompt } from "@/lib/replicate";
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

  const prompt = buildRingPrompt(body.bandStyle, body.finish, body.initials);
  const negativePrompt = buildNegativePrompt();

  try {
    const replicate = getReplicateClient();

    // Model ID format: "owner/model:version"
    const output = await replicate.run(config.replicateModelId as `${string}/${string}:${string}`, {
      input: {
        prompt,
        negative_prompt: negativePrompt,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        width: 1024,
        height: 1024,
      },
    });

    // Replicate returns an array of image URLs or a single URL
    const imageUrl = Array.isArray(output)
      ? (output as unknown as string[])[0]
      : (output as unknown as string);

    if (!imageUrl) {
      return NextResponse.json({ error: "No image returned from model" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("generate-image error:", err);
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  }
}
