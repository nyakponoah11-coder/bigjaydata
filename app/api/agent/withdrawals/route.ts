import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWithdrawalOtpEmail, isRealEmailConfigured } from "@/lib/email";

// In-memory OTP storage fallback
const withdrawalOtps = new Map<string, { code: string; expires: number }>();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agent_id");

    if (!agentId) {
      return NextResponse.json({ success: false, message: "Agent ID is required" }, { status: 400 });
    }

    const withdrawals = await db.getAgentWithdrawals(agentId);
    return NextResponse.json({ success: true, withdrawals });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, agent_id } = body;

    if (!agent_id) {
      return NextResponse.json({ success: false, message: "Agent ID is required" }, { status: 400 });
    }

    const agent = await db.getAgentById(agent_id);
    if (!agent) {
      return NextResponse.json({ success: false, message: "Agent account not found" }, { status: 404 });
    }

    // Step 1: Request OTP code sent to agent's registered email
    if (action === "request_otp") {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      withdrawalOtps.set(agent_id, { code, expires });
      await db.updateAgent(agent_id, { withdrawal_otp: code, withdrawal_otp_expires: expires });

      const reqAmount = Number(body.amount) || 5.0;
      const hasRealEmail = await isRealEmailConfigured();
      await sendWithdrawalOtpEmail(agent.email, agent.name, code, reqAmount);

      return NextResponse.json({
        success: true,
        has_real_email: hasRealEmail,
        dev_code: hasRealEmail ? undefined : code,
        message: hasRealEmail
          ? `A 6-digit verification code has been dispatched to ${agent.email}. Please check your inbox and spam folder.`
          : `Payout verification code generated. (Email gateway in simulation mode. Test code: ${code})`,
      });
    }

    // Step 2: Submit withdrawal with verification code
    if (action === "submit_withdrawal") {
      const { amount, momo_number, momo_network, verification_code } = body;

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount < 5.0) {
        return NextResponse.json(
          { success: false, message: "Minimum withdrawal amount is GHS 5.00." },
          { status: 400 }
        );
      }

      if (numAmount > agent.wallet_balance) {
        return NextResponse.json(
          {
            success: false,
            message: `Insufficient wallet balance. You only have GHS ${agent.wallet_balance.toFixed(2)} available.`,
          },
          { status: 400 }
        );
      }

      if (!momo_number || !momo_network) {
        return NextResponse.json(
          { success: false, message: "Please provide your MoMo number and network." },
          { status: 400 }
        );
      }

      const cleanCode = String(verification_code).trim();
      const savedOtp = withdrawalOtps.get(agent_id);

      const validInDb =
        agent.withdrawal_otp &&
        agent.withdrawal_otp === cleanCode &&
        Date.now() <= (agent.withdrawal_otp_expires || 0);

      const validInMemory =
        savedOtp &&
        savedOtp.code === cleanCode &&
        Date.now() <= savedOtp.expires;

      if (!validInDb && !validInMemory) {
        const isExpired =
          (agent.withdrawal_otp_expires && Date.now() > agent.withdrawal_otp_expires) ||
          (savedOtp && Date.now() > savedOtp.expires);

        return NextResponse.json(
          {
            success: false,
            message: isExpired
              ? "Verification code has expired. Please request a new code."
              : "Invalid verification code entered. Please check and retry.",
          },
          { status: 400 }
        );
      }

      // Remove OTP once successfully verified
      withdrawalOtps.delete(agent_id);
      await db.updateAgent(agent_id, { withdrawal_otp: null, withdrawal_otp_expires: null });

      // Create withdrawal and deduct wallet balance
      const withdrawal = await db.createAgentWithdrawal({
        agent_id,
        amount: numAmount,
        momo_number: String(momo_number).trim(),
        momo_network: String(momo_network).trim(),
        verification_code: cleanCode,
        note: `Payout request for ${numAmount.toFixed(2)} GHS to ${momo_network} ${momo_number}`,
      });

      return NextResponse.json({
        success: true,
        withdrawal,
        new_balance: agent.wallet_balance,
        message: `Payout request for GHS ${numAmount.toFixed(2)} submitted successfully!`,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Withdrawal failed" },
      { status: 500 }
    );
  }
}
