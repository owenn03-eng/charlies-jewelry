import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig, SiteConfig } from "@/lib/config";

function isAuthorized(req: NextRequest): boolean {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "Failed to read config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as Partial<SiteConfig>;
    const current = await getConfig();
    const updated: SiteConfig = {
      laborFee: body.laborFee ?? current.laborFee,
      shippingFee: body.shippingFee ?? current.shippingFee,
      markupMultiplier: body.markupMultiplier ?? current.markupMultiplier,
      replicateModelId: body.replicateModelId ?? current.replicateModelId,
    };
    await saveConfig(updated);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
