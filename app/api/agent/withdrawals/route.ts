import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWithdrawalOtpEmail, isRealEmailConfigured } from "@/lib/email";
import { disbursePaystackTransfer } from "@/lib/paystack";

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
      await sendWithdrawalOtpEmail(agent.email, agent.name, code, reqAmount);

      return NextResponse.json({
        success: true,
        message: `A 6-digit verification code has been sent to your registered email (${agent.email}). Please check your inbox and spam folder.`,
      });
    }

    // Step 2: Submit withdrawal with verification code
    if (action === "submit_withdrawal") {
      const { amount, momo_number, momo_network, verification_code, instant_paystack } = body;

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
      let payoutNote = `Payout request for ${numAmount.toFixed(2)} GHS to ${momo_network} ${momo_number}`;
      let finalStatus: "pending" | "completed" = "pending";
      let paystackTransferCode: string | undefined = undefined;

      const storeConfig = await db.getAgentStoreConfig();
      const shouldAttemptPaystack = Boolean(storeConfig.auto_paystack_payout || instant_paystack);

      if (shouldAttemptPaystack) {
        const transferRes = await disbursePaystackTransfer({
          amount: numAmount,
          recipient_phone: String(momo_number).trim(),
          recipient_name: agent.name || agent.store_name || "Agent",
          network: String(momo_network).trim(),
          reason: `FastData Agent Payout - ${agent.store_name}`,
        });

        if (transferRes.success) {
          finalStatus = "completed";
          paystackTransferCode = transferRes.transfer_code;
          payoutNote += ` | Paid via Paystack (${transferRes.transfer_code || "Success"})`;
        } else {
          payoutNote += ` | Paystack attempt: ${transferRes.message} (Queued for admin payout)`;
        }
      }

      const withdrawal = await db.createAgentWithdrawal({
        agent_id,
        amount: numAmount,
        momo_number: String(momo_number).trim(),
        momo_network: String(momo_network).trim(),
        verification_code: cleanCode,
        note: payoutNote,
      });

      if (finalStatus === "completed") {
        await db.updateWithdrawalStatus(withdrawal.id, "completed", payoutNote, {
          paystack_transfer_code: paystackTransferCode,
          paystack_status: "success",
        });
        withdrawal.status = "completed";
      }

      const refreshedAgent = await db.getAgentById(agent_id);

      return NextResponse.json({
        success: true,
        withdrawal,
        new_balance: refreshedAgent ? refreshedAgent.wallet_balance : Math.max(0, Number((agent.wallet_balance - numAmount).toFixed(2))),
        paystack_disbursed: finalStatus === "completed",
        message: finalStatus === "completed"
          ? `Payout of GHS ${numAmount.toFixed(2)} sent directly to your ${momo_network.toUpperCase()} (${momo_number}) via Paystack!`
          : `Payout request for GHS ${numAmount.toFixed(2)} submitted successfully! (Pending review)`,
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
