import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface RefineBody {
  currentPrompt: string;
  feedback: string;
}

const SYSTEM_PROMPT = `You rewrite text-to-image prompts for a sterling silver ring jewelry generator.

Rules:
1. Your output is ONLY the rewritten prompt. No explanation, no quotes, no markdown.
2. The prompt MUST begin with the word "CHARJEWEL".
3. Preserve all aspects of the current prompt that the user did not ask to change.
4. Apply the user's feedback as modifications to the current prompt.
5. Always end with: "close-up professional jewelry photography, white seamless background, studio lighting, sharp focus, photorealistic, high resolution"`;

export async function POST(req: NextRequest) {
  let body: RefineBody;
  try {
    body = await req.json() as RefineBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.currentPrompt || !body.feedback) {
    return NextResponse.json({ error: "Missing currentPrompt or feedback" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 503 });
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Current prompt:\n${body.currentPrompt}\n\nUser feedback:\n${body.feedback}`,
        },
      ],
    });

    const block = message.content[0];
    let refinedPrompt = block.type === "text" ? block.text.trim() : "";

    // Strip any wrapping quotes or backticks Claude might add
    refinedPrompt = refinedPrompt.replace(/^["`']+|["`']+$/g, "");

    // Safety net: ensure trigger word is present
    if (!refinedPrompt.startsWith("CHARJEWEL")) {
      refinedPrompt = `CHARJEWEL ${refinedPrompt}`;
    }

    return NextResponse.json({ refinedPrompt });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("refine-prompt error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
