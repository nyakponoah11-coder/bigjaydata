import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendLoginOtpEmail, isRealEmailConfigured } from "@/lib/email";

// In-memory fallback cache
const loginOtpCodes = new Map<string, { code: string; expires: number }>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // Step 2: Verify Login Code
    if (action === "verify_code") {
      const { agent_id, verification_code } = body;

      if (!agent_id || !verification_code) {
        return NextResponse.json(
          { success: false, message: "Agent ID and verification code are required." },
          { status: 400 }
        );
      }

      const agent = await db.getAgentById(agent_id);
      if (!agent) {
        return NextResponse.json(
          { success: false, message: "Agent account not found." },
          { status: 404 }
        );
      }

      if (!agent.is_active) {
        return NextResponse.json(
          { success: false, message: "Your agent account has been suspended. Please contact administration." },
          { status: 403 }
        );
      }

      const cleanCode = String(verification_code).trim();
      const inMemoryOtp = loginOtpCodes.get(agent_id);

      // Check DB stored OTP or memory fallback
      const validInDb =
        agent.login_otp &&
        agent.login_otp === cleanCode &&
        Date.now() <= (agent.login_otp_expires || 0);

      const validInMemory =
        inMemoryOtp &&
        inMemoryOtp.code === cleanCode &&
        Date.now() <= inMemoryOtp.expires;

      if (!validInDb && !validInMemory) {
        // Check if expired
        const isExpired =
          (agent.login_otp_expires && Date.now() > agent.login_otp_expires) ||
          (inMemoryOtp && Date.now() > inMemoryOtp.expires);

        return NextResponse.json(
          {
            success: false,
            message: isExpired
              ? "Verification code has expired. Please request a new code or sign in again."
              : "Invalid verification code. Please check and try again.",
          },
          { status: 400 }
        );
      }

      // Code matched! Invalidate code
      loginOtpCodes.delete(agent_id);
      await db.updateAgent(agent_id, { login_otp: null, login_otp_expires: null });

      return NextResponse.json({
        success: true,
        agent,
        token: `agtok_${agent.id}_${Date.now()}`,
      });
    }

    // Step 2b: Resend Login Code
    if (action === "resend_code") {
      const { agent_id } = body;
      if (!agent_id) {
        return NextResponse.json({ success: false, message: "Agent ID is required." }, { status: 400 });
      }

      const agent = await db.getAgentById(agent_id);
      if (!agent || !agent.is_active) {
        return NextResponse.json({ success: false, message: "Invalid agent account." }, { status: 400 });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000;
      loginOtpCodes.set(agent.id, { code, expires });
      await db.updateAgent(agent.id, { login_otp: code, login_otp_expires: expires });

      const hasRealEmail = await isRealEmailConfigured();
      await sendLoginOtpEmail(agent.email, agent.name, code);

      return NextResponse.json({
        success: true,
        has_real_email: hasRealEmail,
        dev_code: hasRealEmail ? undefined : code,
        message: hasRealEmail
          ? `A new 6-digit login verification code was sent to ${agent.email}.`
          : `Code regenerated. (Email gateway is in simulation mode. Test code: ${code})`,
      });
    }

    // Step 1: Initial Login with Identifier + Password
    const { identifier, password, direct_login } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Please provide your email/phone and password" },
        { status: 400 }
      );
    }

    const cleanInput = String(identifier).trim().toLowerCase();
    const cleanPass = String(password).trim();

    // Find agent by email, phone, or store slug
    const agents = await db.getAgents();
    const agent = agents.find(
      (a) =>
        a.email.toLowerCase() === cleanInput ||
        a.phone.replace(/[^0-9]/g, "") === cleanInput.replace(/[^0-9]/g, "") ||
        a.store_slug === cleanInput
    );

    if (!agent) {
      return NextResponse.json(
        { success: false, message: "No agent account found with these details." },
        { status: 404 }
      );
    }

    if (agent.password_hash !== cleanPass) {
      return NextResponse.json(
        { success: false, message: "Incorrect password or PIN." },
        { status: 401 }
      );
    }

    if (!agent.is_active) {
      return NextResponse.json(
        { success: false, message: "Your agent account has been suspended. Please contact platform administration." },
        { status: 403 }
      );
    }

    // Direct Login override (if user explicitly chooses password-only sign in)
    if (direct_login === true) {
      return NextResponse.json({
        success: true,
        agent,
        token: `agtok_${agent.id}_${Date.now()}`,
      });
    }

    // Generate 6-digit 2FA login verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    // Save in DB and memory
    loginOtpCodes.set(agent.id, { code, expires });
    await db.updateAgent(agent.id, { login_otp: code, login_otp_expires: expires });

    const hasRealEmail = await isRealEmailConfigured();
    await sendLoginOtpEmail(agent.email, agent.name, code);

    // Mask email for security display (e.g. ny***@gmail.com)
    const emailParts = agent.email.split("@");
    const maskedEmail =
      emailParts[0].length > 2
        ? emailParts[0].slice(0, 2) + "*".repeat(Math.max(1, emailParts[0].length - 2)) + "@" + emailParts[1]
        : agent.email;

    return NextResponse.json({
      success: true,
      requires_verification: true,
      has_real_email: hasRealEmail,
      agent_id: agent.id,
      agent_name: agent.name,
      masked_email: maskedEmail,
      dev_code: hasRealEmail ? undefined : code,
      message: hasRealEmail
        ? `A 6-digit verification code has been dispatched to ${maskedEmail}.`
        : `A 6-digit verification code was generated for ${maskedEmail}.`,
    });
  } catch (error: any) {
    console.error("[Agent Login Route Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Login failed" },
      { status: 500 }
    );
  }
}
