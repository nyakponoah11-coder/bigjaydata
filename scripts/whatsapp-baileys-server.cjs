/**
 * BigJayData — Baileys WhatsApp Security Alert Server
 *
 * Runs a standalone WhatsApp Web client using @whiskeysockets/baileys.
 * Displays a live QR code (in terminal and at http://localhost:3001) for linking your WhatsApp.
 * Listens on port 3001 for incoming intrusion alerts from BigJayData Firewall.
 *
 * Usage:
 *   node scripts/whatsapp-baileys-server.cjs
 *   or: npm run whatsapp-bot
 */

const http = require("http");
const path = require("path");
const fs = require("fs");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require("qrcode");

const PORT = process.env.WHATSAPP_BOT_PORT || 3001;
const AUTH_DIR = path.join(__dirname, "..", "baileys_auth");

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let currentQrRaw = null;
let currentQrDataUrl = null;
let connectionState = "initializing"; // "initializing" | "qr_ready" | "connecting" | "connected" | "disconnected"
let connectedUser = null;

function formatJid(phone) {
  let clean = String(phone || "").replace(/\D/g, "");
  if (clean.startsWith("0") && clean.length === 10) {
    clean = "233" + clean.slice(1);
  } else if (!clean.startsWith("233") && clean.length === 9) {
    clean = "233" + clean;
  }
  return clean + "@s.whatsapp.net";
}

async function startBaileys() {
  console.log("\n=========================================================");
  console.log("🛡️  BIGJAYDATA — WHATSAPP SECURITY BOT (BAILEYS)");
  console.log("=========================================================");
  console.log("[Baileys] Loading authentication state from:", AUTH_DIR);

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

  connectionState = "connecting";

  sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    browser: ["BigJayData Security", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQrRaw = qr;
      connectionState = "qr_ready";
      try {
        currentQrDataUrl = await QRCode.toDataURL(qr, { width: 360, margin: 2 });
        // Also print ASCII QR in terminal
        const terminalQr = await QRCode.toString(qr, { type: "terminal", small: true });
        console.log("\n📱 SCAN THIS QR CODE WITH YOUR WHATSAPP TO LINK ALERTS:\n");
        console.log(terminalQr);
        console.log(`👉 Or open in browser: http://localhost:${PORT}\n`);
      } catch (err) {
        console.warn("[Baileys] QR render error:", err.message);
      }
    }

    if (connection === "connecting") {
      connectionState = "connecting";
      console.log("[Baileys] Connecting to WhatsApp network...");
    }

    if (connection === "open") {
      connectionState = "connected";
      currentQrRaw = null;
      currentQrDataUrl = null;
      connectedUser = sock.user ? sock.user.id.split(":")[0] : "Connected";
      console.log(`\n✅ WHATSAPP CONNECTED SUCCESSFULLY as: +${connectedUser}`);
      console.log(`🛡️  Security Intrusion Alert engine is now LIVE on http://localhost:${PORT}/send\n`);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      connectionState = "disconnected";
      connectedUser = null;

      console.warn(`[Baileys] Connection closed. Reason code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(startBaileys, 3000);
      } else {
        console.error("[Baileys] Device logged out! Clearing session directory. Re-scan required.");
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch (_) {}
        setTimeout(startBaileys, 2000);
      }
    }
  });
}

// Lightweight HTTP server for webhook alerts and QR viewing
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // 1. GET /status
  if (req.method === "GET" && pathname === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        connected: connectionState === "connected",
        status: connectionState,
        user: connectedUser,
        qr_ready: Boolean(currentQrDataUrl),
      })
    );
    return;
  }

  // 2. GET /qr
  if (req.method === "GET" && pathname === "/qr") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        connected: connectionState === "connected",
        status: connectionState,
        user: connectedUser,
        qr_data_url: currentQrDataUrl,
        qr_raw: currentQrRaw,
      })
    );
    return;
  }

  // 3. POST /send
  if (req.method === "POST" && (pathname === "/send" || pathname === "/api/send")) {
    let bodyText = "";
    req.on("data", (chunk) => {
      bodyText += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(bodyText || "{}");
        const recipient = payload.to || payload.phone || payload.recipient;
        const message = payload.message || payload.text;

        if (!recipient || !message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Fields 'to' and 'message' are required." }));
          return;
        }

        if (connectionState !== "connected" || !sock) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: "WhatsApp bot is not connected. Scan QR code at http://localhost:" + PORT,
              status: connectionState,
            })
          );
          return;
        }

        const jid = formatJid(recipient);
        console.log(`[Baileys Alert Dispatch] Sending alert message to: ${jid}`);
        const sent = await sock.sendMessage(jid, { text: message });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            messageId: sent?.key?.id,
            to: jid,
          })
        );
      } catch (err) {
        console.error("[Baileys Send Error]:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 4. Default: Live Web Dashboard with QR Code
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BigJayData — WhatsApp Security Link</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      background: #090d16;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 24px;
      padding: 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    h1 { font-size: 20px; font-weight: 800; margin: 0 0 8px 0; color: #fff; }
    p { font-size: 13px; color: #94a3b8; margin: 0 0 24px 0; line-height: 1.5; }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
    }
    .badge.connected { background: #064e3b; color: #34d399; border: 1px solid #059669; }
    .badge.waiting { background: #78350f; color: #fcd34d; border: 1px solid #d97706; }
    .badge.connecting { background: #1e3a8a; color: #93c5fd; border: 1px solid #2563eb; }
    .qr-box {
      background: #fff;
      padding: 16px;
      border-radius: 16px;
      display: inline-block;
      margin-bottom: 20px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
    }
    .qr-box img { display: block; max-width: 280px; height: auto; }
    .steps {
      text-align: left;
      background: #1f2937;
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 12px;
      color: #cbd5e1;
      margin-top: 20px;
    }
    .steps ol { margin: 0; padding-left: 20px; }
    .steps li { margin: 4px 0; }
  </style>
  <script>
    setInterval(async () => {
      try {
        const res = await fetch('/status');
        const data = await res.json();
        if (data.status === 'connected' && !document.getElementById('connected-banner')) {
          location.reload();
        }
      } catch(_) {}
    }, 3000);
  </script>
</head>
<body>
  <div class="card">
    <div style="font-size: 40px; margin-bottom: 12px;">🛡️📱</div>
    <h1>WhatsApp Security Alert Link</h1>
    <p>Link your WhatsApp account to receive instant real-time notifications whenever someone attempts unauthorized PowerShell scripts, SQL injection, or payment tampering.</p>

    ${
      connectionState === "connected"
        ? `<div id="connected-banner">
             <div class="badge connected">● Connected to WhatsApp</div>
             <p style="color: #34d399; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
               ✅ Linked as: +${connectedUser || "Admin"}
             </p>
             <p style="font-size: 12px; color: #94a3b8;">
               Intrusion firewall alerts will be delivered directly to your WhatsApp in real-time.
             </p>
           </div>`
        : connectionState === "qr_ready" && currentQrDataUrl
        ? `<div>
             <div class="badge waiting">● Scan QR Code to Link</div>
             <div class="qr-box">
               <img src="${currentQrDataUrl}" alt="WhatsApp QR Code">
             </div>
             <div class="steps">
               <strong>How to link:</strong>
               <ol>
                 <li>Open WhatsApp on your phone</li>
                 <li>Tap <b>Menu (⋮)</b> or <b>Settings</b> > <b>Linked Devices</b></li>
                 <li>Tap <b>Link a Device</b> and point camera at this screen</li>
               </ol>
             </div>
           </div>`
        : `<div>
             <div class="badge connecting">● Initializing Connection...</div>
             <p>Generating secure QR code, please wait a moment...</p>
           </div>`
    }
  </div>
</body>
</html>
  `);
});

server.listen(PORT, () => {
  console.log(`[Baileys HTTP Server] Running at: http://localhost:${PORT}`);
  startBaileys();
});
