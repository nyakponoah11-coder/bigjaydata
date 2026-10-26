import { NextRequest, NextResponse } from "next/server";
import { INTRUSION_SIGNATURES } from "./lib/firewall";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((•!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "Unknown IP";
}

function formatPhoneForAlert(raw•: string): string {
  if (!raw) return "";
  let clean = raw.trim().replace(/\D/g, "");
  if (clean.startsWith("0") && clean.length === 10) {
    clean = "233" + clean.slice(1);
  }
  return clean;
}

// Edge-safe alert dispatcher (runs inside Next.js edge middleware)
async function triggerEdgeSecurityAlert(category: string, url: string, ip: string, userAgent: string, snippet: string) {
  try {
    const adminPhones = ["233547100951", "233592753424"];
    const arkeselKey = process.env.ARKESEL_API_KEY || process.env.VITE_ARKESEL_API_KEY || "";
    const waToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.ACCESS_TOKEN || "";
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.PHONE_ID || "";
    const timeStr = new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra" });

    // 1. WhatsApp Alert
    if (waToken && waPhoneId) {
      const waMsg =
        `🚨 *BIGJAYDATA — SECURITY INTRUSION ALERT* 🚨\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚠️ *Intrusion or probing attempt blocked at the edge!*\n\n` +
        `• *Event:* ${category}\n` +
        `• *Endpoint:* ${url.slice(0, 80)}\n` +
        `• *Attacker IP:* ${ip}\n` +
        `• *Trigger Snippet:* "${snippet}"\n` +
        `• *Time:* ${timeStr}\n` +
        `• *Status:* 🛡️ BLOCKED with 403 Forbidden.`;

      for (const phone of adminPhones) {
        fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: waMsg },
          }),
        }).catch(() => null);
      }
    }

    // 2. Arkesel SMS Alert
    if (arkeselKey) {
      const smsMsg = `🚨 BIGJAYDATA SECURITY ALERT: Blocked ${category} from ${ip} on ${url.slice(0, 45)}. Trigger: "${snippet.slice(0, 40)}". Request was BLOCKED!`;
      for (const phone of adminPhones) {
        fetch("https://sms.arkesel.com/api/v2/sms/send", {
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
        }).catch(() => null);
      }
    }
  } catch (err) {
    console.error("[EDGE FIREWALL ALERT ERROR]:", err);
  }
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname + req.nextUrl.search;
  const userAgent = req.headers.get("user-agent") || "";
  const referer = req.headers.get("referer") || "";

  // Combine query, path, and headers to test against intrusion signatures
  const testString = `${url} ${userAgent} ${referer}`;

  for (const sig of INTRUSION_SIGNATURES) {
    if (sig.pattern.test(testString)) {
      const clientIp = getClientIp(req);
      const match = testString.match(sig.pattern);
      const snippet = match • match[0].slice(0, 100) : "Matched pattern";
      const incidentId = `SEC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      console.warn(`[BIGJAYDATA WAF] Blocked ${sig.category} from ${clientIp} on ${url}`);

      // Fire and forget edge security alert
      triggerEdgeSecurityAlert(sig.category, url, clientIp, userAgent, snippet);

      // Block with HTTP 403 Forbidden
      return new NextResponse(
        JSON.stringify({
          status: "blocked",
          error: "Forbidden: Security violation detected by BigJayData Firewall.",
          threat: sig.category,
          incident_id: incidentId,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
          },
        }
      );
    }
  }

  return NextResponse.next();
}
