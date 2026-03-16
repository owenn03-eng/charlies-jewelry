import { NextResponse } from "next/server";
import { getSilverSpotPrice } from "@/lib/silver-price";

export async function GET() {
  try {
    const price = await getSilverSpotPrice();
    return NextResponse.json({ price });
  } catch (err) {
    console.error("silver-price API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch silver price" },
      { status: 500 }
    );
  }
}
