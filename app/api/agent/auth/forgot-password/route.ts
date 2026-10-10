import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail, isRealEmailConfigured } from "@/lib/email";

// In-memory reset code cache fallback
const resetCodes = new Map<string, { code: string; expires: number }>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // Phase 1: Request verification code to registered email
    if (action === "request_code") {
      const { identifier } = body;
      if (!identifier) {
        return NextResponse.json(
          { success: false, message: "Please provide your email, phone, or store slug." },
          { status: 400 }
        );
      }

      const cleanInput = String(identifier).trim().toLowerCase();
      const agents = await db.getAgents();
      const agent = agents.find(
        (a) =>
          a.email.toLowerCase() === cleanInput ||
          a.phone.replace(/[^0-9]/g, "") === cleanInput.replace(/[^0-9]/g, "") ||
          a.store_slug === cleanInput
      );

      if (!agent) {
        return NextResponse.json(
          { success: false, message: "No agent account found matching this email or phone number." },
          { status: 404 }
        );
      }

      // Generate secure 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 15 * 60 * 1000; // 15 mins expiry

      resetCodes.set(agent.id, { code, expires });
      await db.updateAgent(agent.id, { reset_otp: code, reset_otp_expires: expires });

      const hasRealEmail = await isRealEmailConfigured();
      await sendPasswordResetEmail(agent.email, agent.name, code, false);

      // Mask email for security display (e.g. jo***@domain.com)
      const emailParts = agent.email.split("@");
      const maskedEmail =
        emailParts[0].length > 2
          ? emailParts[0].slice(0, 2) + "*".repeat(Math.max(1, emailParts[0].length - 2)) + "@" + emailParts[1]
          : agent.email;

      return NextResponse.json({
        success: true,
        agent_id: agent.id,
        masked_email: maskedEmail,
        has_real_email: hasRealEmail,
        dev_code: hasRealEmail ? undefined : code,
        message: hasRealEmail
          ? `A 6-digit password reset code has been sent to ${maskedEmail}. Please check your inbox and spam folder.`
          : `Password reset code generated. (Email gateway in simulation mode. Test code: ${code})`,
      });
    }

    // Phase 2: Verify code and set new password
    if (action === "verify_and_reset") {
      const { agent_id, code, new_password } = body;

      if (!agent_id || !code || !new_password) {
        return NextResponse.json(
          { success: false, message: "All fields (agent ID, verification code, and new password) are required." },
          { status: 400 }
        );
      }

      const cleanPass = String(new_password).trim();
      if (cleanPass.length < 4) {
        return NextResponse.json(
          { success: false, message: "New password/PIN must be at least 4 characters long." },
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

      const cleanCode = String(code).trim();
      const stored = resetCodes.get(agent_id);

      const validInDb =
        agent.reset_otp &&
        agent.reset_otp === cleanCode &&
        Date.now() <= (agent.reset_otp_expires || 0);

      const validInMemory =
        stored &&
        stored.code === cleanCode &&
        Date.now() <= stored.expires;

      if (!validInDb && !validInMemory) {
        const isExpired =
          (agent.reset_otp_expires && Date.now() > agent.reset_otp_expires) ||
          (stored && Date.now() > stored.expires);

        return NextResponse.json(
          {
            success: false,
            message: isExpired
              ? "Reset code has expired. Please request a new code."
              : "Invalid verification code entered. Please check and try again.",
          },
          { status: 400 }
        );
      }

      // Code is valid! Update agent password and clear reset_otp
      await db.updateAgent(agent_id, {
        password_hash: cleanPass,
        reset_otp: null,
        reset_otp_expires: null,
      });
      resetCodes.delete(agent_id);

      return NextResponse.json({
        success: true,
        message: "Your password has been reset successfully! You can now sign in with your new password.",
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("[Agent Forgot Password API Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to process password reset." },
      { status: 500 }
    );
  }
}
