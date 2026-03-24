import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface RefineBody {
  originalPrompt: string;
  feedbackHistory: string[];
}

const SYSTEM_PROMPT = `You rewrite text-to-image prompts for a sterling silver ring jewelry generator.

You will receive the ORIGINAL base prompt and a list of ALL user feedback requests (in order). Your job is to produce a single refined prompt that starts from the original and applies every piece of feedback.

Rules:
1. Your output is ONLY the rewritten prompt. No explanation, no quotes, no markdown.
2. The prompt MUST begin with the word "CHARJEWEL".
3. Start from the original prompt every time. Apply all feedback on top of it.
4. Be extremely specific and concrete in your descriptions. Instead of vague words like "detailed" or "intricate", describe exactly what something looks like (shape, pattern, texture, placement).
5. If the user asks for a specific shape or element (e.g. "lightning bolt"), describe it precisely: material, size relative to the ring, where it sits, how it's rendered.
6. Keep the prompt focused. Do not add details the user didn't ask for. Do not embellish.
7. Always end with: "close-up professional jewelry photography, white seamless background, studio lighting, sharp focus, photorealistic, high resolution"`;

export async function POST(req: NextRequest) {
  let body: RefineBody;
  try {
    body = await req.json() as RefineBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.originalPrompt || !body.feedbackHistory?.length) {
    return NextResponse.json({ error: "Missing originalPrompt or feedbackHistory" }, { status: 400 });
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
          content: `Original prompt:\n${body.originalPrompt}\n\nUser feedback (apply all of these):\n${body.feedbackHistory.map((f, i) => `${i + 1}. ${f}`).join("\n")}`,
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
