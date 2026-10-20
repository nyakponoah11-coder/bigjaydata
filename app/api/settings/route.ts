import { NextResponse } from "next/server";
import { db, isValidPaystackSecret } from "@/lib/db";

export const revalidate = 120;

const SECRET_MASK = "••••••••••••••••";

export async function GET() {
  try {
    const settings = await db.getSettings();
    const config = await db.getAgentStoreConfig();

    const hasValidSecret = Boolean(
      (settings.paystack_secret_key && isValidPaystackSecret(settings.paystack_secret_key)) ||
      (process.env.PAYSTACK_SECRET_KEY && isValidPaystackSecret(process.env.PAYSTACK_SECRET_KEY))
    );

    // Don't expose secret key directly to client
    const safeSettings = {
      ...settings,
      paystack_public_key: settings.paystack_public_key || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
      paystack_secret_key: hasValidSecret ? SECRET_MASK : "",
    };

    return NextResponse.json(
      {
        success: true,
        settings: safeSettings,
        agent_store_enabled: config.is_enabled,
        registration_fee: config.registration_fee || 0,
        cached: true,
        source: "bigjdb_cache",
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
          "X-Cache-Source": "bigjdb-memory",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = await db.updateSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
