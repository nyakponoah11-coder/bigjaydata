import { NextResponse } from "next/server";
import { db, isMaskedSecret, isValidPaystackSecret } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { public_key, secret_key } = body;

    const settings = await db.getSettings();

    // If secret_key is masked or missing or invalid, read from active settings or environment
    if (!secret_key || isMaskedSecret(secret_key) || !isValidPaystackSecret(secret_key)) {
      secret_key = settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || "";
    }
    if (!public_key || isMaskedSecret(public_key)) {
      public_key = settings.paystack_public_key || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
    }

    let cleanPubKey = String(public_key || "").trim();
    let cleanSecKey = String(secret_key || "").trim();

    // Strip wrapping quotes
    if ((cleanSecKey.startsWith('"') && cleanSecKey.endsWith('"')) || (cleanSecKey.startsWith("'") && cleanSecKey.endsWith("'"))) {
      cleanSecKey = cleanSecKey.slice(1, -1).trim();
    }
    if ((cleanPubKey.startsWith('"') && cleanPubKey.endsWith('"')) || (cleanPubKey.startsWith("'") && cleanPubKey.endsWith("'"))) {
      cleanPubKey = cleanPubKey.slice(1, -1).trim();
    }
    // Strip accidental 'Bearer ' prefix
    if (cleanSecKey.toLowerCase().startsWith("bearer ")) {
      cleanSecKey = cleanSecKey.slice(7).trim();
    }

    if (!cleanPubKey) {
      return NextResponse.json(
        { success: false, message: "Paystack Public Key (starts with pk_) is required." },
        { status: 400 }
      );
    }
    if (!cleanSecKey || isMaskedSecret(cleanSecKey) || !isValidPaystackSecret(cleanSecKey)) {
      return NextResponse.json(
        { success: false, message: "A valid Paystack Secret Key (starts with sk_live_ or sk_test_) is required." },
        { status: 400 }
      );
    }

    // Safety check 1: Swapped keys
    if (cleanPubKey.startsWith("sk_")) {
      return NextResponse.json(
        { success: false, message: "Swapped keys: You entered a Secret Key (sk_...) in the Public Key field! Please put your pk_ key in the Public Key field." },
        { status: 400 }
      );
    }
    if (cleanSecKey.startsWith("pk_")) {
      return NextResponse.json(
        { success: false, message: "Swapped keys: You entered a Public Key (pk_...) in the Secret Key field! Please enter your Secret Key (starts with sk_)." },
        { status: 400 }
      );
    }

    // Safety check 2: Mode mismatch (e.g. pk_live vs sk_test)
    const pubIsLive = cleanPubKey.includes("_live_");
    const secIsLive = cleanSecKey.includes("_live_");
    const pubIsTest = cleanPubKey.includes("_test_");
    const secIsTest = cleanSecKey.includes("_test_");

    if (pubIsLive && secIsTest) {
      return NextResponse.json(
        { success: false, message: "Mode mismatch: Your Public Key is LIVE (pk_live_...) but your Secret Key is TEST (sk_test_...). Both keys must be from the same mode (both live or both test)." },
        { status: 400 }
      );
    }
    if (pubIsTest && secIsLive) {
      return NextResponse.json(
        { success: false, message: "Mode mismatch: Your Public Key is TEST (pk_test_...) but your Secret Key is LIVE (sk_live_...). Both keys must be from the same mode (both live or both test)." },
        { status: 400 }
      );
    }

    // Call Paystack API to verify the secret key is valid and active
    const response = await fetch("https://api.paystack.co/transaction/totals", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanSecKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    const resJson = await response.json();

    if (response.ok && resJson.status === true) {
      const mode = secIsLive ? "Live Mode" : "Test Mode";
      return NextResponse.json({
        success: true,
        mode,
        message: `Paystack keys verified successfully! Connected to your Paystack account (${mode}).`,
      });
    }

    // Paystack rejected the key
    return NextResponse.json({
      success: false,
      message: `Paystack rejected the Secret Key: "${resJson.message || "Invalid key"}". Please check your Paystack Dashboard > Settings > API Keys & Webhooks.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to reach Paystack servers." },
      { status: 500 }
    );
  }
}
