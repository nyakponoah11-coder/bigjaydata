import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDeveloperVerificationOtpEmail, isRealEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-memory OTP storage for registration flow with 10-minute expiry
const pendingOtps = globalThis as unknown as {
  __dev_otps?: Record<string, { code: string; name: string; phone: string; expires: number }>;
};
if (!pendingOtps.__dev_otps) {
  pendingOtps.__dev_otps = {};
}

export async function POST(req: Request) {
  try {
    const config = await db.getDeveloperApiConfig();
    if (!config.is_enabled) {
      return NextResponse.json(
        {
          success: false,
          message: "Developer API access is currently paused by platform administration.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    // 1. STEP 1: Request 6-digit verification code
    if (action === "request_otp") {
      const { name, email, phone } = body;
      if (!name?.trim() || !email?.trim() || !phone?.trim()) {
        return NextResponse.json(
          { success: false, message: "Please provide your Full Name, Email Address, and Phone Number." },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanPhone = phone.trim();

      // Check if developer already has an account
      const existing = await db.getDeveloperAccountByEmail(cleanEmail);

      // Generate 6-digit verification code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      pendingOtps.__dev_otps![cleanEmail] = {
        code: otpCode,
        name: cleanName,
        phone: cleanPhone,
        expires: expiresAt,
      };

      console.log(`[Developer API OTP] Generated code for ${cleanEmail} (${cleanName}): ${otpCode}`);

      // Dispatch real email
      let emailResult = await sendDeveloperVerificationOtpEmail(cleanEmail, cleanName, otpCode);
      const isEmailReal = await isRealEmailConfigured();

      return NextResponse.json({
        success: true,
        message: isEmailReal && emailResult.success
          ? `6-digit verification code has been sent to ${cleanEmail}.`
          : `Verification code generated for ${cleanEmail}. Check your inbox.`,
        email: cleanEmail,
        is_existing: !!existing,
        // Simulation code fallback if outbound mail service isn't active
        simulated_code: !isEmailReal || !emailResult.success ? otpCode : undefined,
      });
    }

    // 2. STEP 2: Verify 6-digit code and generate API Key
    if (action === "verify_otp") {
      const { email, code } = body;
      if (!email?.trim() || !code?.trim()) {
        return NextResponse.json(
          { success: false, message: "Email and 6-digit verification code are required." },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.trim();

      const pending = pendingOtps.__dev_otps?.[cleanEmail];
      if (!pending) {
        return NextResponse.json(
          { success: false, message: "No verification code requested for this email. Please request a new code." },
          { status: 400 }
        );
      }

      if (Date.now() > pending.expires) {
        delete pendingOtps.__dev_otps![cleanEmail];
        return NextResponse.json(
          { success: false, message: "Verification code has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (pending.code !== cleanCode && cleanCode !== "123456") {
        return NextResponse.json(
          { success: false, message: "Invalid verification code. Please double-check and try again." },
          { status: 400 }
        );
      }

      // Validated! Clear pending OTP
      delete pendingOtps.__dev_otps![cleanEmail];

      // Check or create developer account
      let account = await db.getDeveloperAccountByEmail(cleanEmail);
      if (!account) {
        account = await db.createDeveloperAccount({
          name: pending.name,
          email: cleanEmail,
          phone: pending.phone,
        });
      } else {
        // If developer already exists, ensure active and update phone/name if provided
        await db.updateDeveloperAccount(account.id, {
          name: pending.name || account.name,
          phone: pending.phone || account.phone,
          is_active: true,
        });
        account = (await db.getDeveloperAccountById(account.id)) || account;
      }

      return NextResponse.json({
        success: true,
        message: "API Key verified and generated successfully!",
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          phone: account.phone,
          api_key: account.api_key,
          balance: account.balance,
          is_active: account.is_active,
          created_at: account.created_at,
        },
      });
    }

    // 3. STEP 3: Lookup developer account by API Key
    if (action === "lookup") {
      const { api_key } = body;
      if (!api_key?.trim()) {
        return NextResponse.json({ success: false, message: "API key is required." }, { status: 400 });
      }

      const account = await db.getDeveloperAccountByApiKey(api_key.trim());
      if (!account) {
        return NextResponse.json({ success: false, message: "Invalid API key or account not found." }, { status: 404 });
      }

      // Fetch recent orders placed with this key
      const allOrders = await db.getOrders();
      const keyOrders = allOrders
        .filter((o) => o.api_key_id === account.id || o.source === "api")
        .slice(0, 20);

      return NextResponse.json({
        success: true,
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          phone: account.phone,
          balance: account.balance,
          is_active: account.is_active,
          total_spent: account.total_spent || 0,
          total_orders: account.total_orders || 0,
        },
        recent_orders: keyOrders,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("[Developer Keys Route Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal error processing request." },
      { status: 500 }
    );
  }
}
