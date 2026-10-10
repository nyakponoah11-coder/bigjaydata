import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getApiKey(req: Request): string | null {
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.substring(7).trim();
  }

  // Also support URL query ?api_key=... for convenience
  const { searchParams } = new URL(req.url);
  const qKey = searchParams.get("api_key");
  if (qKey) return qKey.trim();

  return null;
}

export async function GET(req: Request) {
  try {
    // 1. Check Master Switch
    const config = await db.getDeveloperApiConfig();
    if (!config.is_enabled) {
      return NextResponse.json(
        {
          success: false,
          error: "service_disabled",
          message: "Developer API service is temporarily disabled by platform administration.",
        },
        { status: 403 }
      );
    }

    // 2. Validate API Key
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "unauthorized",
          message: "API key is missing. Provide via 'x-api-key' header or 'Authorization: Bearer <key>'.",
        },
        { status: 401 }
      );
    }

    const developer = await db.getDeveloperAccountByApiKey(apiKey);
    if (!developer) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_key",
          message: "Invalid API key.",
        },
        { status: 401 }
      );
    }

    if (!developer.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: "account_suspended",
          message: "This developer API key has been suspended. Please contact platform support.",
        },
        { status: 403 }
      );
    }

    // 3. Fetch products
    const products = await db.getDeveloperApiProducts();
    const activeProducts = products
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        network: p.network.toLowerCase(),
        package_size: p.size,
        price: Number(p.api_price.toFixed(2)),
        currency: "GHS",
      }));

    return NextResponse.json({
      success: true,
      status: "active",
      currency: "GHS",
      count: activeProducts.length,
      packages: activeProducts,
    });
  } catch (error: any) {
    console.error("[Developer API Packages Error]:", error);
    return NextResponse.json(
      { success: false, error: "server_error", message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
