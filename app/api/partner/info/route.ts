import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetflixConfig } from "@/lib/netflix";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getApiKey(req: Request): string | null {
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.substring(7).trim();
  }

  const { searchParams } = new URL(req.url);
  const qKey = searchParams.get("api_key");
  if (qKey) return qKey.trim();

  return null;
}

export async function GET(req: Request) {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return NextResponse.json(
        { status: "error", success: false, error: "unauthorized", message: "API key is required. Provide via 'x-api-key' header or '?api_key=' query." },
        { status: 401 }
      );
    }

    let partner = await db.getNetflixPartnerByApiKey(apiKey);

    if (!partner) {
      const dev = await db.getDeveloperAccountByApiKey(apiKey);
      if (dev) {
        const settings = await db.getSettings();
        partner = {
          id: dev.id,
          name: dev.name,
          email: dev.email,
          phone: dev.phone,
          api_key: dev.api_key,
          balance: dev.balance,
          base_price: Number(settings.netflix_agent_base_price || 18),
          is_active: dev.is_active,
          total_spent: dev.total_spent,
          total_orders: dev.total_orders,
          created_at: dev.created_at,
        };
      }
    }

    if (!partner) {
      return NextResponse.json(
        { status: "error", success: false, error: "invalid_key", message: "Invalid partner API key." },
        { status: 401 }
      );
    }

    if (!partner.is_active) {
      return NextResponse.json(
        { status: "error", success: false, error: "account_suspended", message: "This partner account has been suspended." },
        { status: 403 }
      );
    }

    const config = await getNetflixConfig();
    const effectiveBasePrice = partner.base_price > 0 ? partner.base_price : (config.agentBasePrice || 18);
    const availableAccounts = effectiveBasePrice > 0 ? Math.floor(partner.balance / effectiveBasePrice) : 0;

    return NextResponse.json({
      status: "success",
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        balance: Number(partner.balance.toFixed(2)),
        wallet_balance: Number(partner.balance.toFixed(2)),
        wholesale_price: effectiveBasePrice,
        base_price: effectiveBasePrice,
        currency: "GHS",
        available_accounts: availableAccounts,
        total_orders: partner.total_orders || 0,
        total_spent: Number((partner.total_spent || 0).toFixed(2)),
        is_active: partner.is_active,
      },
    });
  } catch (error: any) {
    console.error("[Partner Info GET Error]:", error);
    return NextResponse.json(
      { status: "error", success: false, error: "server_error", message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
