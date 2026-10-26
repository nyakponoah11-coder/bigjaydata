import path from "path";
import os from "os";
import fs from "fs";

type BaileysConnStatus = "idle" | "qr_ready" | "connecting" | "connected" | "disconnected" | "error";

interface BaileysGlobalState {
  sock?: any;
  qrDataUrl: string | null;
  qrRaw: string | null;
  status: BaileysConnStatus;
  user: string | null;
  started: boolean;
}

const g = globalThis as unknown as { __bmgh_baileys?: BaileysGlobalState };
if (!g.__bmgh_baileys) {
  g.__bmgh_baileys = {
    status: "idle",
    qrDataUrl: null,
    qrRaw: null,
    user: null,
    started: false,
  };
}

export function getBaileysState(): BaileysGlobalState {
  return g.__bmgh_baileys!;
}

export async function initBaileysInMemory(): Promise<{
  qrDataUrl: string | null;
  status: string;
  connected: boolean;
  user: string | null;
}> {
  const state = g.__bmgh_baileys!;

  // If already connected, return state
  if (state.status === "connected" && state.sock) {
    return {
      qrDataUrl: null,
      status: "connected",
      connected: true,
      user: state.user,
    };
  }

  // If QR already generated and waiting, return it
  if (state.qrDataUrl && state.status === "qr_ready") {
    return {
      qrDataUrl: state.qrDataUrl,
      status: "qr_ready",
      connected: false,
      user: null,
    };
  }

  // If already connecting, wait a brief moment for QR
  if (state.started && (state.status as string) === "connecting") {
    await new Promise((r) => setTimeout(r, 1500));
    return {
      qrDataUrl: state.qrDataUrl || null,
      status: state.status,
      connected: (state.status as string) === "connected",
      user: state.user,
    };
  }

  try {
    state.started = true;
    state.status = "connecting";

    // Dynamic import to prevent bundling issues on edge
    const baileys: any = await import("@whiskeysockets/baileys");
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;
    const pino = (await import("pino")).default;
    // @ts-ignore
    const QRCode = (await import("qrcode")).default || (await import("qrcode"));

    const authDir = path.join(os.tmpdir(), "bigjay_baileys_auth");
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { state: authState, saveCreds } = await useMultiFileAuthState(authDir);
    const versionRes = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));
    const version: [number, number, number] = (Array.isArray(versionRes?.version) && versionRes.version.length === 3)
      ? (versionRes.version as [number, number, number])
      : [2, 3000, 1015901307];

    const sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      auth: authState,
      browser: ["BigJayData Cloud", "Chrome", "1.0.0"],
    });

    state.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state.qrRaw = qr;
        state.status = "qr_ready";
        try {
          state.qrDataUrl = await QRCode.toDataURL(qr, { width: 360, margin: 2 });
        } catch (_) {}
      }

      if (connection === "open") {
        state.status = "connected";
        state.qrDataUrl = null;
        state.qrRaw = null;
        state.user = sock.user ? sock.user.id.split(":")[0] : "Connected";
        console.log(`[Baileys In-Memory] Connected as: ${state.user}`);
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        state.status = "disconnected";
        state.user = null;

        if (shouldReconnect) {
          setTimeout(() => initBaileysInMemory().catch(() => {}), 3000);
        } else {
          try {
            fs.rmSync(authDir, { recursive: true, force: true });
          } catch (_) {}
          state.started = false;
        }
      }
    });

    // Wait up to 3.5s for initial QR generation
    for (let i = 0; i < 7; i++) {
      if (state.qrDataUrl || (state.status as string) === "connected") break;
      await new Promise((r) => setTimeout(r, 500));
    }

    return {
      qrDataUrl: state.qrDataUrl || null,
      status: state.status,
      connected: (state.status as string) === "connected",
      user: state.user,
    };
  } catch (err: any) {
    console.error("[Baileys In-Memory Exception]:", err);
    state.status = "idle";
    state.started = false;
    return {
      qrDataUrl: null,
      status: "error",
      connected: false,
      user: null,
    };
  }
}

export async function sendBaileysMessage(recipient?: string, message?: string): Promise<boolean> {
  const state = g.__bmgh_baileys;
  if (!state || !state.sock || state.status !== "connected") {
    return false;
  }

  const alertText = message || "🚨 BIGJ DATA FIREWALL: Security Alert!";
  let sentAny = false;

  // Determine recipients
  const targets = new Set<string>();

  // 1. Scanned admin phone (self)
  if (state.user && state.user !== "Connected") {
    const selfNum = state.user.replace(/\D/g, "");
    if (selfNum) {
      targets.add(`${selfNum}@s.whatsapp.net`);
    }
  }

  // 2. Explicit recipient if passed
  if (recipient) {
    let clean = String(recipient).replace(/\D/g, "");
    if (clean.startsWith("0") && clean.length === 10) {
      clean = "233" + clean.slice(1);
    } else if (!clean.startsWith("233") && clean.length === 9) {
      clean = "233" + clean;
    }
    if (clean) {
      targets.add(`${clean}@s.whatsapp.net`);
    }
  }

  for (const jid of targets) {
    try {
      await state.sock.sendMessage(jid, { text: alertText });
      sentAny = true;
    } catch (e) {
      console.warn(`[Baileys In-Memory Send Error to ${jid}]:`, e);
    }
  }

  return sentAny;
}
