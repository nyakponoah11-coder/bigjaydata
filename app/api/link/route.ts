import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWhatsAppSecurityAlert } from "@/lib/security";

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

    try {
      const [statusRes, qrRes] = await Promise.all([
        fetch(`${botBase}/status`, { signal: AbortSignal.timeout(1500), cache: "no-store" }),
        fetch(`${botBase}/qr`, { signal: AbortSignal.timeout(1500), cache: "no-store" }),
      ]);

      const statusData = await statusRes.json().catch(() => ({}));
      const qrData = await qrRes.json().catch(() => ({}));

      baileysOnline = true;
      baileysConnected = Boolean(statusData.connected);
      baileysUser = statusData.user || null;
      qrDataUrl = qrData.qr_data_url || null;
    } catch (_) {}

    const savedPhone =
      settings.whatsapp_security_phone ||
      settings.whatsapp_number ||
      settings.support_phone ||
      "";

    const isCallMeBotConfigured = Boolean(
      settings.whatsapp_callmebot_apikey && settings.whatsapp_callmebot_apikey.length >= 4
    );

    return NextResponse.json({
      success: true,
      phone: savedPhone,
      callmebot_configured: isCallMeBotConfigured,
      baileys_online: baileysOnline,
      baileys_connected: baileysConnected,
      baileys_user: baileysUser,
      qr_data_url: qrDataUrl,
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
    const { action, phone, apikey, test_phone } = body;

    if (action === "save") {
      const cleanPhone = String(phone || "").replace(/\s+/g, "").trim();
      const cleanKey = String(apikey || "").trim();

      if (!cleanPhone || cleanPhone.length < 9) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid WhatsApp phone number (e.g. 0551234567)." },
          { status: 400 }
        );
      }

      await db.updateSettings({
        whatsapp_security_phone: cleanPhone,
        whatsapp_callmebot_apikey: cleanKey,
      });

      // Automatically dispatch a test alert to confirm connection
      if (cleanKey) {
        try {
          await sendWhatsAppSecurityAlert({
            id: `verify-${Date.now()}`,
            type: "manual_block",
            severity: "low",
            ip: "Security Setup",
            phone: cleanPhone,
            details: "BigJayData WhatsApp Security Alerts have been successfully connected to this number!",
            timestamp: new Date().toISOString(),
            blocked: false,
            alert_sent: false,
          });
        } catch (_) {}
      }

      return NextResponse.json({
        success: true,
        message: "WhatsApp security preferences saved successfully!",
      });
    }

    if (action === "test") {
      const targetPhone = test_phone || phone;
      const testIncident = {
        id: `test-${Date.now()}`,
        type: "manual_block" as const,
        severity: "low" as const,
        ip: "Live Verification",
        phone: targetPhone || "0550000000",
        details: "This is a live test notification from BigJayData Firewall confirming your WhatsApp alerts are active.",
        timestamp: new Date().toISOString(),
        blocked: false,
        alert_sent: false,
      };

      const result = await sendWhatsAppSecurityAlert(testIncident);
      return NextResponse.json({
        success: result.success,
        channel: result.channel,
        message: result.success
          ? `Test alert dispatched successfully via ${result.channel}! Check your WhatsApp.`
          : `Alert dispatch failed: ${result.error}`,
        error: result.error,
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
