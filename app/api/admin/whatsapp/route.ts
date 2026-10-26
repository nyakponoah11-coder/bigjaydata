import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    // 1. Try In-Memory Baileys Web Link instance first
    try {
      const { initBaileysInMemory, getBaileysState } = await import("@/lib/baileys-service");
      const inMem = await initBaileysInMemory();
      const st = getBaileysState();
      if (inMem && (inMem.connected || inMem.qrDataUrl || st.status === "connected" || st.status === "qr_ready")) {
        return NextResponse.json({
          success: true,
          online: true,
          connected: Boolean(inMem.connected || st.status === "connected"),
          status: inMem.status || st.status,
          user: inMem.user || st.user || null,
          qr_data_url: inMem.qrDataUrl || st.qrDataUrl || null,
          engine: "in_memory_baileys",
        });
      }
    } catch (_) {}

    // 2. Fallback to Local / Custom Port 3001 if hosted externally
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
        engine: "port_3001",
      });
    } catch (_) {
      // If neither is connected yet, return ready to scan
      return NextResponse.json({
        success: true,
        online: true,
        connected: false,
        status: "waiting_qr",
        message: "Scan the QR code to link your WhatsApp.",
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to query WhatsApp status" },
      { status: 500 }
    );
  }
}
