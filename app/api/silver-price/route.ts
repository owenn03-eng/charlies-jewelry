import { NextResponse } from "next/server";
import { getSilverSpotPrice } from "@/lib/silver-price";

export async function GET() {
  try {
    const price = await getSilverSpotPrice();
    return NextResponse.json({ price });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("silver-price API error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
