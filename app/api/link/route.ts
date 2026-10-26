import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWhatsAppSecurityAlert } from "@/lib/security";
import { initBaileysInMemory, getBaileysState, sendBaileysMessage } from "@/lib/baileys-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await db.getSettings();

    const botBase = process.env.WHATSAPP_BOT_URL
      ? process.env.WHATSAPP_BOT_URL.replace(/\/send$/, "")
      : "http://127.0.0.1:3001";

    let baileysOnline = false;
    let baileysConnected = false;
    let baileysUser: string | null = null;
    let qrDataUrl: string | null = null;
    let statusText = "connecting";

    // 1. First, check if external bot daemon is running on port 3001 or WHATSAPP_BOT_URL
    try {
      const [statusRes, qrRes] = await Promise.all([
        fetch(`${botBase}/status`, { signal: AbortSignal.timeout(1000), cache: "no-store" }),
        fetch(`${botBase}/qr`, { signal: AbortSignal.timeout(1000), cache: "no-store" }),
      ]);

      const statusData = await statusRes.json().catch(() => ({}));
      const qrData = await qrRes.json().catch(() => ({}));

      if (statusData && (statusData.connected || qrData.qr_data_url)) {
        baileysOnline = true;
        baileysConnected = Boolean(statusData.connected);
        baileysUser = statusData.user || null;
        qrDataUrl = qrData.qr_data_url || null;
        statusText = statusData.status || (baileysConnected ? "connected" : "qr_ready");
      }
    } catch (_) {}

    // 2. If external bot is not running, run directly in Next.js in-memory engine!
    if (!baileysConnected && !qrDataUrl) {
      try {
        const mem = await initBaileysInMemory();
        baileysOnline = true;
        baileysConnected = mem.connected;
        baileysUser = mem.user;
        qrDataUrl = mem.qrDataUrl;
        statusText = mem.status;
      } catch (memErr) {
        console.warn("[Baileys In-Memory Error]:", memErr);
      }
    }

    const savedPhone =
      settings.whatsapp_security_phone ||
      settings.whatsapp_number ||
      settings.support_phone ||
      "";

    return NextResponse.json({
      success: true,
      phone: savedPhone,
      baileys_online: baileysOnline,
      baileys_connected: baileysConnected,
      baileys_user: baileysUser,
      qr_data_url: qrDataUrl,
      status: statusText,
      maintenance_mode: Boolean(settings.maintenance_mode),
      maintenance_message:
        settings.maintenance_message ||
        "Our platform is currently offline for scheduled maintenance and security upgrades. All transactions and store purchases are temporarily paused.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to load link status" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, phone } = body;

    // 1. Toggle Emergency Maintenance Mode / Kill Switch
    if (action === "toggle_maintenance") {
      const { enabled, message } = body;
      const isMaint = Boolean(enabled);
      const customMsg = typeof message === "string" && message.trim() ? message.trim() : undefined;

      const updated = await db.updateSettings({
        maintenance_mode: isMaint,
        ...(customMsg ? { maintenance_message: customMsg } : {}),
      } as any);

      return NextResponse.json({
        success: true,
        maintenance_mode: Boolean(updated.maintenance_mode),
        message: isMaint
          ? "🚨 Emergency Maintenance Mode ACTIVATED! Entire platform & admin are now locked down and showing Under Maintenance."
          : "✅ System is ONLINE! Platform restored to normal operation.",
      });
    }

    // 2. Dispatch Live WhatsApp Test Alert
    if (action === "test") {
      const settings = await db.getSettings();
      const targetPhone =
        phone ||
        settings.whatsapp_security_phone ||
        settings.whatsapp_number ||
        "0547100951";

      const testMsg =
        "🚨 *BIGJAYDATA — SECURITY ALERT TEST* 🚨\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "✅ *WhatsApp Link Verified Successfully!*\n\n" +
        "• *Recipient:* " + targetPhone + "\n" +
        "• *Time:* " + new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra" }) + "\n" +
        "• *Status:* 🛡️ Intrusion Detection System is ACTIVE.\n\n" +
        "You will receive immediate alerts whenever unauthorized PowerShell scripts, command injections, or payment tampering are detected.";

      // Try in-memory Baileys send first
      let sent = await sendBaileysMessage(targetPhone, testMsg);

      // If in-memory wasn't connected, fallback to standard security dispatcher
      if (!sent) {
        const result = await sendWhatsAppSecurityAlert({
          id: `test-${Date.now()}`,
          type: "manual_block" as const,
          severity: "low" as const,
          ip: "Admin Test",
          phone: targetPhone,
          details: "Live test notification from BigJayData Security System.",
          timestamp: new Date().toISOString(),
          blocked: false,
          alert_sent: false,
        });
        sent = result.success;
      }

      return NextResponse.json({
        success: sent,
        message: sent
          ? "Test security alert sent to WhatsApp successfully!"
          : "Could not send test message. Please ensure your WhatsApp is scanned and connected.",
      });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
