import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

// In-memory reset code cache: agentId -> { code, expires }
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
      resetCodes.set(agent.id, {
        code,
        expires: Date.now() + 15 * 60 * 1000, // 15 mins expiry
      });

      // Send to agent's email without leaking code to the HTTP response
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
        message: `A 6-digit password reset code has been sent to ${maskedEmail}. Please check your inbox and spam folder.`,
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

      const stored = resetCodes.get(agent_id);
      if (!stored || Date.now() > stored.expires) {
        return NextResponse.json(
          { success: false, message: "Reset code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      if (stored.code !== String(code).trim()) {
        return NextResponse.json(
          { success: false, message: "Invalid verification code entered. Please check and try again." },
          { status: 400 }
        );
      }

      // Code is valid! Update agent password
      const agent = await db.getAgentById(agent_id);
      if (!agent) {
        return NextResponse.json(
          { success: false, message: "Agent account not found." },
          { status: 404 }
        );
      }

      await db.updateAgent(agent_id, { password_hash: cleanPass });
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
