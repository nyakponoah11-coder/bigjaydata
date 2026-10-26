import { supabaseAdmin } from "./supabase";

export interface SecurityAlertPayload {
  type: string;
  endpoint: string;
  ip?: string;
  userAgent?: string;
  details: string;
  severity: "critical" | "warning";
}

function formatPhoneForAlert(raw?: string): string {
  if (!raw) return "";
  let clean = raw.trim().replace(/\D/g, "");
  if (clean.startsWith("0") && clean.length === 10) {
    clean = "233" + clean.slice(1);
  }
  return clean;
}

export async function sendSecurityAlert(alert: SecurityAlertPayload): Promise<void> {
  try {
    const timeStr = new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra" });

    // 1. Log to database if security_logs table exists
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("security_logs").insert([
          {
            event_type: alert.type,
            endpoint: alert.endpoint,
            ip_address: alert.ip || "Unknown",
            user_agent: alert.userAgent || "Unknown",
            details: alert.details,
            severity: alert.severity,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (_) {}
    }

    // 2. Resolve admin recipient phones
    const adminCandidates = [
      "0547100951",
      "0592753424",
      process.env.ADMIN_ALERT_PHONE,
      process.env.SUPPORT_PHONE,
    ].filter(Boolean);

    const formattedPhones = [
      ...new Set(adminCandidates.map((p) => formatPhoneForAlert(p)).filter(Boolean)),
    ];

    if (formattedPhones.length === 0) return;

    const alertMessage =
      "🚨 *BIGJAYDATA — SECURITY INTRUSION ALERT* 🚨\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "⚠️ *Someone is attempting unauthorized access / tampering with BigJayData!*\n\n" +
      "• *Event:* " + alert.type + "\n" +
      "• *Target Endpoint:* " + alert.endpoint + "\n" +
      "• *Attacker IP:* " + (alert.ip || "Unknown") + "\n" +
      "• *Time:* " + timeStr + "\n" +
      "• *Details:* " + alert.details + "\n\n" +
      "🛡️ *Status:* BLOCKED by System Security Firewall.\n\n" +
      "👉 *Action Taken:* Request was terminated with HTTP 403 Forbidden. No confidential information or balance was disclosed.";

    // 3. Dispatch via WhatsApp Meta Cloud API (if configured)
    const waToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.PHONE_ID;

    if (waToken && waPhoneId) {
      for (const phone of formattedPhones) {
        try {
          await fetch("https://graph.facebook.com/v20.0/" + waPhoneId + "/messages", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + waToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: { body: alertMessage },
            }),
          });
        } catch (waErr) {
          console.warn("WhatsApp alert dispatch note for " + phone + ":", waErr);
        }
      }
    }

    // 4. Dispatch Guaranteed Instant Arkesel SMS
    const arkeselKey = (
      process.env.ARKESEL_API_KEY ||
      process.env.VITE_ARKESEL_API_KEY ||
      process.env.ARKESEL_KEY ||
      ""
    ).trim();

    if (arkeselKey) {
      const smsMsg = "🚨 BIGJAYDATA SECURITY ALERT: Blocked " + alert.type + " on " + alert.endpoint + " from IP " + (alert.ip || "Unknown") + ". Trigger: " + alert.details.slice(0, 75) + ". Intrusion was BLOCKED!";
      for (const phone of formattedPhones) {
        try {
          await fetch("https://sms.arkesel.com/api/v2/sms/send", {
            method: "POST",
            headers: {
              "api-key": arkeselKey,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              sender: "BigJayData",
              message: smsMsg,
              recipients: [phone],
            }),
          });
        } catch (smsErr) {
          console.warn("Arkesel SMS alert note for " + phone + ":", smsErr);
        }
      }
    }
  } catch (err) {
    console.error("[SECURITY ALERT DISPATCH ERROR]:", err);
  }
}
