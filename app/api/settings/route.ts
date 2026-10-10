import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const settings = await db.getSettings();
    // Don't expose secret key directly to client
    const safeSettings = {
      ...settings,
      paystack_secret_key: settings.paystack_secret_key ? "••••••••" : "",
    };
    const config = await db.getAgentStoreConfig();
    return NextResponse.json({
      success: true,
      settings: safeSettings,
      agent_store_enabled: config.is_enabled,
    });
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
