import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/:path*"],
};

const INTRUSION_PATTERNS = [
  // 1. PowerShell & Windows Command Execution
  /\b(?:powershell(?:\.exe)?|pwsh(?:\.exe)?|invoke-expression|\biex\b|downloadstring|downloadfile|system\.management\.automation|invoke-webrequest|\biwr\b|start-process|set-executionpolicy|new-object\s+net\.webclient|invoke-command|get-process|get-service|get-wmiobject|get-ciminstance|get-content|powershell\s+-[a-zA-Z])\b/i,
  /\b(?:cmd(?:\.exe)?\s*\/(?:c|k)|certutil(?:\.exe)?\s*-(?:urlcache|decode|f)|bitsadmin(?:\.exe)?|rundll32(?:\.exe)?|cscript(?:\.exe)?|wscript(?:\.exe)?|regsvr32(?:\.exe)?|vssadmin|wmic(?:\.exe)?|whoami(?:\.exe)?|systeminfo(?:\.exe)?|tasklist(?:\.exe)?|ipconfig\s*\/all|net\s+(?:user|localgroup|share))\b/i,

  // 2. Linux Shell / OS Command Injection
  /(?:\/bin\/(?:bash|sh|zsh|dash)|(?:^|[;&|`\n])\s*(?:bash|sh|zsh)\s+-c|(?:^|[;&|`\n])\s*(?:curl|wget)\s+https?:\/\/|\|\s*(?:bash|sh|zsh)\b)/i,
  /(?:;\s*(?:rm\s+-rf|cat\s+\/etc|whoami|uname\s+-a|killall|ncat|netcat|nc\s+-e|\/dev\/tcp\/))/i,
  /(?:\b(?:eval|passthru|shell_exec|proc_open|popen|system)\s*\(|child_process(?:\.exec|\.spawn))/i,

  // 3. System Probing & Secret Extraction ("Questioning the System")
  /(?:\b(?:ignore\s+(?:all\s+)?previous\s+instructions|system\s+prompt|reveal\s+(?:your\s+)?secret|dump\s+database|show\s+(?:all\s+)?passwords|database\s+password|supabase_service_role|paystack_secret|datamart_key|datamart_api_key|arkesel_api_key|admin_secret_key|access_token|process\.env|show\s+me\s+the\s+keys)\b)/i,

  // 4. SQL Injection
  /(?:\bunion\s+(?:all\s+)?select\b|\b(?:and|or)\s+['"]?1['"]?\s*=\s*['"]?1\b|\bwaitfor\s+delay\b|\bpg_sleep\s*\(|\bbenchmark\s*\(|;\s*drop\s+(?:table|database|schema)\b|information_schema\.(?:tables|columns)|xp_cmdshell)/i,

  // 5. Path Traversal & Sensitive File Harvesting
  /(?:\.\.[\/\\]\.\.[\/\\]|\/etc\/(?:passwd|shadow|hosts)|[a-zA-Z]:\\windows\\system32|win\.ini)/i,
  /(?:(?:\/|\b)\.env(?:\.local|\.production|\.backup)?\b|(?:\/|\b)\.git(?:\/|\\|\b)|wp-config\.php|phpmyadmin|actuator\/env|swagger-ui|\/shell\b)/i,
];

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "Unknown IP";
}

// Edge-safe async background alert
function dispatchEdgeAlert(url: string, ip: string, snippet: string) {
  try {
    const adminPhones = ["233547100951", "233592753424"];
    const arkeselKey = (process.env.ARKESEL_API_KEY || process.env.VITE_ARKESEL_API_KEY || "").trim();
    const waToken = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.ACCESS_TOKEN || "").trim();
    const waPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.PHONE_ID || "").trim();
    const timeStr = new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra" });

    if (waToken && waPhoneId) {
      const waMsg =
        "🚨 *BIGJAYDATA — SECURITY INTRUSION ALERT* 🚨\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "⚠️ *Intrusion or probing attempt blocked at the edge!*\n\n" +
        "• *Target:* " + url.slice(0, 80) + "\n" +
        "• *Attacker IP:* " + ip + "\n" +
        "• *Trigger:* \"" + snippet + "\"\n" +
        "• *Time:* " + timeStr + "\n" +
        "• *Status:* 🛡️ BLOCKED with 403 Forbidden.";

      for (const phone of adminPhones) {
        fetch("https://graph.facebook.com/v20.0/" + waPhoneId + "/messages", {
          method: "POST",
          headers: { Authorization: "Bearer " + waToken, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: waMsg } }),
        }).catch(() => null);
      }
    }

    if (arkeselKey) {
      const smsMsg = "🚨 BIGJAYDATA SECURITY ALERT: Blocked intrusion from " + ip + " on " + url.slice(0, 40) + ". Trigger: \"" + snippet.slice(0, 35) + "\". BLOCKED!";
      for (const phone of adminPhones) {
        fetch("https://sms.arkesel.com/api/v2/sms/send", {
          method: "POST",
          headers: { "api-key": arkeselKey, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ sender: "BigJayData", message: smsMsg, recipients: [phone] }),
        }).catch(() => null);
      }
    }
  } catch (_) {}
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".mp4")
  ) {
    return NextResponse.next();
  }

  const url = pathname + req.nextUrl.search;
  const userAgent = req.headers.get("user-agent") || "";
  const referer = req.headers.get("referer") || "";
  const testString = url + " " + userAgent + " " + referer;

  for (const pattern of INTRUSION_PATTERNS) {
    if (pattern.test(testString)) {
      const clientIp = getClientIp(req);
      const matched = testString.match(pattern);
      const snippet = matched ? matched[0].slice(0, 80) : "Threat pattern matched";
      const incidentId = "SEC-" + Date.now().toString(36).toUpperCase();

      console.warn("[BIGJAYDATA WAF] Blocked threat from " + clientIp + " on " + url);
      dispatchEdgeAlert(url, clientIp, snippet);

      return new NextResponse(
        JSON.stringify({
          status: "blocked",
          error: "Forbidden: Security violation detected by BigJayData Firewall.",
          incident_id: incidentId,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }
  }

  return NextResponse.next();
}
