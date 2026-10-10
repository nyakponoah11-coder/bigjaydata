import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendLoginOtpEmail } from "@/lib/email";

// In-memory 2FA code storage: agentId -> { code, expires }
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

      const storedOtp = loginOtpCodes.get(agent_id);
      if (!storedOtp || Date.now() > storedOtp.expires) {
        return NextResponse.json(
          { success: false, message: "Verification code has expired. Please log in again." },
          { status: 400 }
        );
      }

      if (storedOtp.code !== String(verification_code).trim()) {
        return NextResponse.json(
          { success: false, message: "Invalid verification code. Please check your email and try again." },
          { status: 400 }
        );
      }

      // Code matched! Invalidate code
      loginOtpCodes.delete(agent_id);

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
      loginOtpCodes.set(agent.id, {
        code,
        expires: Date.now() + 10 * 60 * 1000,
      });

      await sendLoginOtpEmail(agent.email, agent.name, code);

      return NextResponse.json({
        success: true,
        message: `A new 6-digit login verification code has been dispatched to ${agent.email}.`,
      });
    }

    // Step 1: Initial Login with Identifier + Password
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Please provide your email/phone and password" },
        { status: 400 }
      );
    }

    const cleanInput = String(identifier).trim().toLowerCase();
    const cleanPass = String(password).trim();

    // Find agent by email or phone
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
        { success: false, message: "Your agent account has been suspended. Please contact the administrator." },
        { status: 403 }
      );
    }

    // Generate 6-digit 2FA login verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    loginOtpCodes.set(agent.id, {
      code,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Send email to agent's registered email
    await sendLoginOtpEmail(agent.email, agent.name, code);

    // Mask email for security display (e.g. jo***@domain.com)
    const emailParts = agent.email.split("@");
    const maskedEmail =
      emailParts[0].length > 2
        ? emailParts[0].slice(0, 2) + "*".repeat(Math.max(1, emailParts[0].length - 2)) + "@" + emailParts[1]
        : agent.email;

    return NextResponse.json({
      success: true,
      requires_verification: true,
      agent_id: agent.id,
      agent_name: agent.name,
      masked_email: maskedEmail,
      message: `A 6-digit verification code has been dispatched to ${maskedEmail}.`,
    });
  } catch (error: any) {
    console.error("[Agent Login Route Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Login failed" },
      { status: 500 }
    );
  }
}
