import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  getBlockedEntities,
  getSecurityIncidents,
  blockEntity,
  unblockEntity,
  sendWhatsAppSecurityAlert,
} from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authError = await requireAdminAuth(request);
    if (authError) return authError;

    const [blocked, incidents, settings] = await Promise.all([
      getBlockedEntities(),
      getSecurityIncidents(100),
      db.getSettings(),
    ]);

    return NextResponse.json({
      success: true,
      blocked,
      incidents,
      config: {
        whatsapp_security_phone: (settings as any).whatsapp_security_phone || settings.whatsapp_number || "",
        whatsapp_security_webhook: (settings as any).whatsapp_security_webhook || "http://127.0.0.1:3001/send",
        whatsapp_callmebot_apikey: (settings as any).whatsapp_callmebot_apikey || "",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch security logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdminAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const { action } = body;

    // 1. Manually Block IP or Phone
    if (action === "block") {
      const { target, type, reason } = body;
      if (!target || !type) {
        return NextResponse.json(
          { success: false, message: "Target and type ('ip' or 'phone') are required." },
          { status: 400 }
        );
      }
      const item = await blockEntity(target, type, reason || "Manually blacklisted by admin");
      return NextResponse.json({ success: true, message: `Successfully blocked ${target}.`, item });
    }

    // 2. Unblock IP or Phone
    if (action === "unblock") {
      const { target, type } = body;
      if (!target || !type) {
        return NextResponse.json(
          { success: false, message: "Target and type are required." },
          { status: 400 }
        );
      }
      const removed = await unblockEntity(target, type);
      return NextResponse.json({
        success: true,
        message: removed ? `Unblocked ${target}.` : `${target} was not in the blocked list.`,
      });
    }

    // 3. Test WhatsApp Alert Ping
    if (action === "test_alert") {
      const testIncident = {
        id: `test-${Date.now()}`,
        type: "manual_block" as const,
        severity: "low" as const,
        ip: "127.0.0.1 (Admin Test)",
        phone: body.test_phone || "0550000000",
        details: "This is a live test notification from your BigJay Data Firewall to confirm your WhatsApp alert pipeline is working.",
        timestamp: new Date().toISOString(),
        blocked: false,
        alert_sent: false,
      };

      const result = await sendWhatsAppSecurityAlert(testIncident);
      return NextResponse.json({
        success: result.success,
        channel: result.channel,
        message: result.success
          ? `Test alert dispatched successfully via ${result.channel}!`
          : `Alert dispatch failed: ${result.error}`,
        error: result.error,
      });
    }

    // 4. Update WhatsApp Alert Configuration
    if (action === "update_config") {
      const { whatsapp_security_phone, whatsapp_security_webhook, whatsapp_callmebot_apikey } = body;
      const cleanPhone = (whatsapp_security_phone || "").trim();
      const updated = await db.updateSettings({
        whatsapp_security_phone: cleanPhone,
        whatsapp_security_webhook: (whatsapp_security_webhook || "").trim(),
        whatsapp_callmebot_apikey: (whatsapp_callmebot_apikey || "").trim(),
        ...(cleanPhone ? { whatsapp_number: cleanPhone } : {}),
      } as any);

      return NextResponse.json({
        success: true,
        message: "WhatsApp security notification settings saved successfully.",
        config: {
          whatsapp_security_phone: (updated as any).whatsapp_security_phone || updated.whatsapp_number || cleanPhone,
          whatsapp_security_webhook: (updated as any).whatsapp_security_webhook || "",
          whatsapp_callmebot_apikey: (updated as any).whatsapp_callmebot_apikey || "",
        },
      });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Security action failed" },
      { status: 500 }
    );
  }
}
