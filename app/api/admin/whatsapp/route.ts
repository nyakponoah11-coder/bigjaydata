import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const botBase = process.env.WHATSAPP_BOT_URL
      ? process.env.WHATSAPP_BOT_URL.replace(/\/send$/, "")
      : "http://127.0.0.1:3001";

    try {
      const [statusRes, qrRes] = await Promise.all([
        fetch(`${botBase}/status`, { signal: AbortSignal.timeout(2000), cache: "no-store" }),
        fetch(`${botBase}/qr`, { signal: AbortSignal.timeout(2000), cache: "no-store" }),
      ]);

      const statusData = await statusRes.json().catch(() => ({}));
      const qrData = await qrRes.json().catch(() => ({}));

      return NextResponse.json({
        success: true,
        online: true,
        connected: Boolean(statusData.connected),
        status: statusData.status || "unknown",
        user: statusData.user || null,
        qr_data_url: qrData.qr_data_url || null,
      });
    } catch (_) {
      return NextResponse.json({
        success: true,
        online: false,
        connected: false,
        status: "offline",
        message: "Baileys WhatsApp Bot Server is not running on port 3001.",
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to query WhatsApp status" },
      { status: 500 }
    );
  }
}
