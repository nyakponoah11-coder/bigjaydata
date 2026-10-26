import { db, Settings } from "./db";
import { sendCustomerSMS } from "./sms";
import { sendAgentEmail } from "./email";

export interface SecurityIncident {
  id: string;
  type:
    | "unverified_payment"
    | "demo_reference"
    | "forged_reference"
    | "underpayment"
    | "tampering"
    | "brute_force"
    | "manual_block";
  severity: "critical" | "high" | "medium" | "low";
  ip: string;
  phone?: string;
  reference?: string;
  paystack_ref?: string;
  amount_claimed?: number;
  amount_received?: number;
  details: string;
  timestamp: string;
  blocked: boolean;
  alert_sent: boolean;
  alert_error?: string;
}

export interface BlockedEntity {
  id: string;
  target: string; // IP address or phone number
  type: "ip" | "phone";
  reason: string;
  blocked_at: string;
  attempts: number;
  last_attempt_at: string;
}

// In-memory global storage fallback
const globalSec = globalThis as unknown as {
  __bmgh_blocked_entities?: BlockedEntity[];
  __bmgh_security_incidents?: SecurityIncident[];
};

if (!globalSec.__bmgh_blocked_entities) {
  globalSec.__bmgh_blocked_entities = [];
}
if (!globalSec.__bmgh_security_incidents) {
  globalSec.__bmgh_security_incidents = [];
}

/**
 * Extracts real client IP address from standard reverse proxy and cloud headers.
 */
export function getClientIp(req: Request): string {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    const cfIp = req.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();
  } catch {}
  return "127.0.0.1";
}

/**
 * Checks if an IP or phone number is currently blocked.
 */
export async function isEntityBlocked(
  ip: string,
  phone?: string
): Promise<{ blocked: boolean; reason?: string; target?: string }> {
  const cleanIp = (ip || "").trim();
  const cleanPhone = (phone || "").replace(/\s+/g, "").trim();

  const blockedList = await getBlockedEntities();

  const ipMatch = blockedList.find(
    (b) => b.type === "ip" && b.target === cleanIp
  );
  if (ipMatch) {
    ipMatch.attempts = (ipMatch.attempts || 0) + 1;
    ipMatch.last_attempt_at = new Date().toISOString();
    return { blocked: true, reason: ipMatch.reason, target: cleanIp };
  }

  if (cleanPhone) {
    const phoneMatch = blockedList.find(
      (b) =>
        b.type === "phone" &&
        (b.target === cleanPhone ||
          b.target.slice(-9) === cleanPhone.slice(-9))
    );
    if (phoneMatch) {
      phoneMatch.attempts = (phoneMatch.attempts || 0) + 1;
      phoneMatch.last_attempt_at = new Date().toISOString();
      return { blocked: true, reason: phoneMatch.reason, target: cleanPhone };
    }
  }

  return { blocked: false };
}

/**
 * Retrieves all currently blocked entities (IPs and phones).
 */
export async function getBlockedEntities(): Promise<BlockedEntity[]> {
  try {
    const settings = await db.getSettings();
    const raw = (settings as any).blocked_entities;
    if (Array.isArray(raw)) {
      return raw;
    }
  } catch {}
  return globalSec.__bmgh_blocked_entities || [];
}

/**
 * Saves blocked entities back to settings store.
 */
async function saveBlockedEntities(list: BlockedEntity[]): Promise<void> {
  globalSec.__bmgh_blocked_entities = list;
  try {
    await db.updateSettings({
      blocked_entities: list,
    } as any);
  } catch (err) {
    console.warn("[Security] Could not persist blocked entities to settings:", err);
  }
}

/**
 * Blocks an IP or phone number.
 */
export async function blockEntity(
  target: string,
  type: "ip" | "phone",
  reason: string
): Promise<BlockedEntity> {
  const cleanTarget = type === "ip" ? target.trim() : target.replace(/\s+/g, "").trim();
  const all = await getBlockedEntities();

  const existing = all.find(
    (b) => b.type === type && (b.target === cleanTarget || (type === "phone" && b.target.slice(-9) === cleanTarget.slice(-9)))
  );

  const now = new Date().toISOString();
  if (existing) {
    existing.attempts = (existing.attempts || 0) + 1;
    existing.last_attempt_at = now;
    existing.reason = reason;
    await saveBlockedEntities(all);
    return existing;
  }

  const newBlock: BlockedEntity = {
    id: `blk-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    target: cleanTarget,
    type,
    reason,
    blocked_at: now,
    attempts: 1,
    last_attempt_at: now,
  };

  all.unshift(newBlock);
  await saveBlockedEntities(all);
  return newBlock;
}

/**
 * Unblocks an IP or phone number.
 */
export async function unblockEntity(target: string, type: "ip" | "phone"): Promise<boolean> {
  const cleanTarget = type === "ip" ? target.trim() : target.replace(/\s+/g, "").trim();
  let all = await getBlockedEntities();
  const initialLen = all.length;

  all = all.filter(
    (b) => !(b.type === type && (b.target === cleanTarget || (type === "phone" && b.target.slice(-9) === cleanTarget.slice(-9))))
  );

  if (all.length !== initialLen) {
    await saveBlockedEntities(all);
    return true;
  }
  return false;
}

/**
 * Retrieves past security incidents.
 */
export async function getSecurityIncidents(limit = 100): Promise<SecurityIncident[]> {
  try {
    const settings = await db.getSettings();
    const raw = (settings as any).security_incidents;
    if (Array.isArray(raw)) {
      return raw.slice(0, limit);
    }
  } catch {}
  return (globalSec.__bmgh_security_incidents || []).slice(0, limit);
}

/**
 * Saves security incidents list.
 */
async function saveSecurityIncidents(list: SecurityIncident[]): Promise<void> {
  const trimmed = list.slice(0, 150); // Keep last 150 incidents
  globalSec.__bmgh_security_incidents = trimmed;
  try {
    await db.updateSettings({
      security_incidents: trimmed,
    } as any);
  } catch (err) {
    console.warn("[Security] Could not persist security incidents to settings:", err);
  }
}

/**
 * Records an unauthorized intrusion attempt, automatically blocks the attacker's IP and phone,
 * and immediately sends a WhatsApp / SMS alert to the merchant.
 */
export async function recordSecurityIncidentAndAlert(
  data: Omit<SecurityIncident, "id" | "timestamp" | "blocked" | "alert_sent">
): Promise<SecurityIncident> {
  const cleanIp = (data.ip || "127.0.0.1").trim();
  const cleanPhone = data.phone ? data.phone.replace(/\s+/g, "").trim() : undefined;
  const now = new Date().toISOString();

  // 1. Automatically block the attacker's IP
  if (cleanIp && cleanIp !== "127.0.0.1" && cleanIp !== "::1") {
    await blockEntity(cleanIp, "ip", `Auto-blocked: ${data.details}`);
  }

  // 2. Automatically block the attacker's phone number if provided
  if (cleanPhone && cleanPhone.length >= 9) {
    await blockEntity(cleanPhone, "phone", `Auto-blocked: ${data.details}`);
  }

  // 3. Construct security incident record
  const incident: SecurityIncident = {
    ...data,
    id: `sec-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: now,
    blocked: true,
    alert_sent: false,
  };

  // 4. Send Instant WhatsApp Notification to Admin
  const alertResult = await sendWhatsAppSecurityAlert(incident);
  incident.alert_sent = alertResult.success;
  if (!alertResult.success && alertResult.error) {
    incident.alert_error = alertResult.error;
  }

  // 5. Append to incidents history
  const allIncidents = await getSecurityIncidents(150);
  allIncidents.unshift(incident);
  await saveSecurityIncidents(allIncidents);

  console.warn(
    `[FIREWALL ALERT] Intrusion blocked: IP=${cleanIp}, Phone=${cleanPhone || "N/A"}, Vector=${data.type}, WhatsAppAlert=${alertResult.success ? "SENT" : "FAILED (" + alertResult.error + ")"}`
  );

  return incident;
}

/**
 * Sends a high-priority security alert to the Admin's WhatsApp (with SMS fallback).
 */
export async function sendWhatsAppSecurityAlert(
  incident: SecurityIncident
): Promise<{ success: boolean; channel: string; error?: string }> {
  try {
    const settings = await db.getSettings();
    let adminPhone =
      (settings as any).whatsapp_security_phone ||
      settings.whatsapp_number ||
      settings.support_phone ||
      "";

    // 0. Try in-memory Baileys immediately (delivers directly to the admin who scanned the QR code)
    try {
      const { sendBaileysMessage, getBaileysState } = await import("./baileys-service");
      const bState = getBaileysState();
      if (!adminPhone && bState.user && bState.user !== "Connected") {
        adminPhone = bState.user.replace(/\D/g, "");
      }
      if (!adminPhone) {
        adminPhone = "0547100951";
      }

      const formattedTime = new Date(incident.timestamp).toLocaleString("en-GB", {
        timeZone: "Africa/Accra",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const alertMessage =
        `🚨 *BIGJ DATA FIREWALL ALERT* 🚨\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚠️ *Unauthorized Attack Blocked!*\n\n` +
        `👤 *Attacker Phone:* ${incident.phone || "Unknown / Not Provided"}\n` +
        `🌐 *Attacker IP:* ${incident.ip}\n` +
        `🛑 *Attack Vector:* ${incident.type.replace(/_/g, " ").toUpperCase()}\n` +
        `📝 *Details:* ${incident.details}\n` +
        (incident.reference ? `🔖 *Target Ref:* ${incident.reference}\n` : "") +
        (incident.paystack_ref ? `💳 *Supplied Ref:* ${incident.paystack_ref}\n` : "") +
        `⏰ *Time (Ghana):* ${formattedTime}\n\n` +
        `🔒 *AUTOMATIC DEFENSE:* Both the IP and Phone have been *AUTOMATICALLY BLOCKED* from placing any orders or accessing the platform.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`;

      const inMemSent = await sendBaileysMessage(adminPhone, alertMessage);
      if (inMemSent) {
        console.log("[WhatsApp Security Alert] Delivered via in-memory Baileys session to admin.");
        return { success: true, channel: "whatsapp_baileys" };
      }
    } catch (_) {}

    const cleanAdminPhone = (adminPhone || "0547100951").replace(/[^0-9]/g, "");

    const ghAdminPhone = cleanAdminPhone.startsWith("233")
      ? `+${cleanAdminPhone}`
      : cleanAdminPhone.startsWith("0")
      ? `+233${cleanAdminPhone.substring(1)}`
      : `+${cleanAdminPhone}`;

    const formattedTime = new Date(incident.timestamp).toLocaleString("en-GB", {
      timeZone: "Africa/Accra",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const alertMessage =
      `🚨 *BIGJ DATA FIREWALL ALERT* 🚨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ *Unauthorized Attack Blocked!*\n\n` +
      `👤 *Attacker Phone:* ${incident.phone || "Unknown / Not Provided"}\n` +
      `🌐 *Attacker IP:* ${incident.ip}\n` +
      `🛑 *Attack Vector:* ${incident.type.replace(/_/g, " ").toUpperCase()}\n` +
      `📝 *Details:* ${incident.details}\n` +
      (incident.reference ? `🔖 *Target Ref:* ${incident.reference}\n` : "") +
      (incident.paystack_ref ? `💳 *Supplied Ref:* ${incident.paystack_ref}\n` : "") +
      `⏰ *Time (Ghana):* ${formattedTime}\n\n` +
      `🔒 *AUTOMATIC DEFENSE:* Both the IP and Phone have been *AUTOMATICALLY BLOCKED* from placing any orders or accessing the platform.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;

    // 1. Try Custom / Local WhatsApp Webhook Bot (e.g. user's whatsapp-bot-server.cjs on port 3001)
    const customWebhook = (settings as any).whatsapp_security_webhook || process.env.WHATSAPP_BOT_URL || "http://127.0.0.1:3001/send";
    if (customWebhook) {
      try {
        const botRes = await fetch(customWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: ghAdminPhone.replace("+", ""),
            to: ghAdminPhone.replace("+", ""),
            message: alertMessage,
            text: alertMessage,
          }),
          signal: AbortSignal.timeout(3500),
        });
        if (botRes.ok) {
          console.log("[WhatsApp Security Alert] Successfully delivered via local/custom WhatsApp bot.");
          return { success: true, channel: "whatsapp_bot" };
        }
      } catch (botErr) {
        // Local bot might not be running on this port, gracefully fall through
      }
    }

    // 2. Try CallMeBot WhatsApp Gateway (free, zero-setup direct WhatsApp delivery)
    const callmebotApiKey = (settings as any).whatsapp_callmebot_apikey || process.env.CALLMEBOT_API_KEY || "";
    if (callmebotApiKey) {
      try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
          ghAdminPhone
        )}&text=${encodeURIComponent(alertMessage)}&apikey=${encodeURIComponent(callmebotApiKey)}`;

        const cmbRes = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (cmbRes.ok) {
          console.log("[WhatsApp Security Alert] Successfully delivered via CallMeBot.");
          return { success: true, channel: "callmebot" };
        }
      } catch (cmbErr: any) {
        console.warn("[WhatsApp Security Alert] CallMeBot error:", cmbErr?.message);
      }
    }

    // 3. Fallback: Dispatch transactional SMS to Admin Phone
    try {
      const smsShortAlert = `BIGJ FIREWALL: Blocked unauthorized attack from IP ${incident.ip} / Phone ${incident.phone || "N/A"} (${incident.type}). IP & Phone are now blocked.`;
      const smsRes = await sendCustomerSMS({
        phone: ghAdminPhone,
        message: smsShortAlert,
      });
      if (smsRes.success) {
        console.log("[WhatsApp Security Alert] SMS fallback alert sent to admin phone.");
        return { success: true, channel: "sms_fallback" };
      }
    } catch (smsErr) {
      console.warn("[WhatsApp Security Alert] SMS fallback error:", smsErr);
    }

    return {
      success: false,
      channel: "none",
      error: "WhatsApp bot/gateway not responding. Check your WhatsApp alert configuration in Admin Settings.",
    };
  } catch (err: any) {
    return { success: false, channel: "none", error: err?.message || String(err) };
  }
}

/**
 * Sends an urgent security alert email to the admin regarding an unauthorized admin login attempt.
 */
export async function sendAdminSecurityEmail(
  ip: string,
  attemptedEmail: string,
  userAgent: string,
  targetAdminEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await db.getSettings();
    const recipientEmail = targetAdminEmail || settings.email || "admin@bundlemartgh.com";
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return { success: false, error: "No recipient email configured" };
    }

    const formattedTime = new Date().toLocaleString("en-GB", {
      timeZone: "Africa/Accra",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 32px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); border: 1px solid #ef4444; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
          <h2 style="color: #fef2f2; margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">
            🚨 SECURITY ALERT: Unauthorized Admin Login Attempt
          </h2>
          <p style="color: #fecaca; margin: 8px 0 0 0; font-size: 13px; line-height: 1.5;">
            An unauthorized entity just attempted to log in to your <strong>BundleMartGh Admin Portal</strong> with invalid credentials.
          </p>
        </div>

        <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0;">
            Intrusion Incident Details
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #1e293b;">
              <td style="padding: 10px 0; color: #64748b;">Attacker IP:</td>
              <td style="padding: 10px 0; color: #ef4444; font-family: monospace; font-weight: bold; text-align: right;">${ip}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1e293b;">
              <td style="padding: 10px 0; color: #64748b;">Supplied Email:</td>
              <td style="padding: 10px 0; color: #f8fafc; font-weight: 600; text-align: right;">${attemptedEmail || "None"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1e293b;">
              <td style="padding: 10px 0; color: #64748b;">Ghana Time:</td>
              <td style="padding: 10px 0; color: #f8fafc; text-align: right;">${formattedTime}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1e293b;">
              <td style="padding: 10px 0; color: #64748b;">Device / User-Agent:</td>
              <td style="padding: 10px 0; color: #cbd5e1; font-size: 11px; text-align: right; max-width: 300px; word-break: break-all;">${userAgent || "Unknown"}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Firewall Status:</td>
              <td style="padding: 10px 0; color: #10b981; font-weight: bold; text-align: right;">Active Shield Protection</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
          <p style="color: #c7d2fe; font-size: 12px; margin: 0; line-height: 1.5;">
            🔒 <strong>Automatic Defense:</strong> The Edge Firewall tracks all failed attempts. If this IP repeatedly fails authentication, it will be automatically blacklisted from the entire platform.
          </p>
        </div>

        <p style="font-size: 11px; color: #475569; text-align: center; margin: 0;">
          BundleMartGh Automated Security Engine • Accra, Ghana
        </p>
      </div>
    `;

    const res = await sendAgentEmail({
      to: recipientEmail,
      subject: `🚨 [SECURITY ALERT] Unauthorized Admin Login Attempt Blocked (${ip})`,
      html,
    });

    return { success: res.success, error: res.message };
  } catch (err: any) {
    console.error("[Security Email Alert Error]:", err);
    return { success: false, error: err?.message };
  }
}

// In-memory counter for failed login attempts (tracked within 15-minute sliding windows)
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number }>();

/**
 * Handles failed admin login attempts: records incident, alerts admin via WhatsApp & Email,
 * and auto-blocks malicious IPs after 3 failed attempts.
 */
export async function recordAdminLoginFailure(
  ip: string,
  attemptedEmail: string,
  userAgent: string,
  realAdminEmail?: string
): Promise<{ count: number; isBlocked: boolean }> {
  const cleanIp = (ip || "127.0.0.1").trim();
  const now = Date.now();

  // 1. Track failed attempts for this IP within 15-minute window
  const prev = failedLoginAttempts.get(cleanIp);
  let count = 1;
  if (prev && now - prev.lastAttempt < 15 * 60 * 1000) {
    count = prev.count + 1;
  }
  failedLoginAttempts.set(cleanIp, { count, lastAttempt: now });

  const isBlocked = count >= 3;

  // 2. If 3 or more attempts, auto-block the IP!
  if (isBlocked && cleanIp !== "127.0.0.1" && cleanIp !== "::1") {
    await blockEntity(cleanIp, "ip", `Auto-blocked: ${count} consecutive failed admin login attempts`);
  }

  // 3. Log security incident
  const incident: SecurityIncident = {
    id: `sec-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    type: "brute_force",
    severity: "critical",
    ip: cleanIp,
    details: `Unauthorized admin login attempt #${count}. Attempted email: "${attemptedEmail}". Device: ${userAgent.substring(0, 100)}`,
    timestamp: new Date().toISOString(),
    blocked: isBlocked,
    alert_sent: false,
  };

  // 4. Send Instant WhatsApp Alert
  sendWhatsAppSecurityAlert(incident).catch((e) => {
    console.warn("[AdminAuth] WhatsApp alert dispatch error:", e?.message);
  });

  // 5. Send Instant Email Alert
  sendAdminSecurityEmail(cleanIp, attemptedEmail, userAgent, realAdminEmail).catch((e) => {
    console.warn("[AdminAuth] Email alert dispatch error:", e?.message);
  });

  // 6. Append to incidents feed
  try {
    const allIncidents = await getSecurityIncidents(150);
    allIncidents.unshift(incident);
    await saveSecurityIncidents(allIncidents);
  } catch {}

  return { count, isBlocked };
}
