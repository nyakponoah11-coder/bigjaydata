import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminRequest, requireAdminAuth } from "@/lib/admin-auth";

export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const settings = await db.getSettings();
    const config = await db.getAgentStoreConfig();
    const isAdmin = await verifyAdminRequest(request);

    if (isAdmin) {
      const envDatamartKey = (process.env.DATAMART_API_KEY || process.env.DATAMART_KEY || "").trim();
      const envDatamartSecret = (process.env.DATAMART_API_SECRET || process.env.DATAMART_SECRET || "").trim();
      const envPaystackPublic = (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "").trim();
      const envPaystackSecret = (process.env.PAYSTACK_SECRET_KEY || "").trim();

      // Authenticated admin: Expose settings for editing, prioritizing Vercel environment variables
      return NextResponse.json({
        success: true,
        settings: {
          ...settings,
          datamart_api_key: envDatamartKey || settings.datamart_api_key || "",
          datamart_api_secret: envDatamartSecret || (settings as any).datamart_api_secret || "",
          datamart_api_url: process.env.DATAMART_API_URL || settings.datamart_api_url || "https://api.datamartgh.shop/api/developer",
          paystack_public_key: envPaystackPublic || settings.paystack_public_key || "",
          paystack_secret_key: envPaystackSecret || settings.paystack_secret_key || "",
        },
        env_configured: {
          datamart_key: Boolean(envDatamartKey),
          datamart_secret: Boolean(envDatamartSecret),
          paystack_public: Boolean(envPaystackPublic),
          paystack_secret: Boolean(envPaystackSecret),
        },
        agent_store_enabled: config.is_enabled,
        registration_fee: config.registration_fee || 0,
        cached: false,
      });
    }

    // STRICT WHITELIST: Only expose non-sensitive public frontend metadata to guests.
    // NEVER expose datamart_api_key, datamart_api_url, paystack_secret_key, AI keys, or SMTP passwords.
    const publicSettings = {
      id: settings.id,
      store_name: settings.store_name || "Data Ease",
      support_phone: settings.support_phone || "",
      whatsapp_number: settings.whatsapp_number || "",
      whatsapp_channel_url: settings.whatsapp_channel_url || "",
      email: settings.email || "",
      announcement_text: settings.announcement_text || "",
      announcement_active: settings.announcement_active ?? false,
      paystack_public_key: settings.paystack_public_key || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
      currency: "GHS",
      netflix_price: settings.netflix_price || 25,
      netflix_enabled: settings.netflix_enabled !== false,
    };

    return NextResponse.json(
      {
        success: true,
        settings: publicSettings,
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
    const authError = await requireAdminAuth(request);
    if (authError) return authError;

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
