import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { disbursePaystackTransfer } from "@/lib/paystack";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const { id, status, note, pay_with_paystack } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "Withdrawal ID and status are required" },
        { status: 400 }
      );
    }

    if (!["pending", "completed", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    const allWithdrawals = await db.getAgentWithdrawals();
    const targetWd = allWithdrawals.find((w) => w.id === id);
    if (!targetWd) {
      return NextResponse.json({ success: false, message: "Withdrawal request not found" }, { status: 404 });
    }

    let extra: { paystack_transfer_code?: string; paystack_status?: string; fee?: number; net_amount?: number } | undefined = undefined;
    let finalNote = note;

    if (pay_with_paystack && status === "completed") {
      const agent = await db.getAgentById(targetWd.agent_id);
      const recipientName = agent?.name || agent?.store_name || "Agent Partner";
      const storeConfig = await db.getAgentStoreConfig();

      let fee = targetWd.fee;
      let netPayout = targetWd.net_amount;

      if (netPayout === undefined || netPayout === null) {
        if (storeConfig.withdrawal_fee_enabled !== false) {
          const feeVal = Number(storeConfig.withdrawal_fee_value ?? 1.00);
          if (storeConfig.withdrawal_fee_type === "percent") {
            fee = Math.round((Number(targetWd.amount) * (feeVal / 100)) * 100) / 100;
          } else {
            fee = feeVal;
          }
          fee = Math.max(0, Math.min(fee, Number(targetWd.amount) - 1));
          netPayout = Math.max(1, Number((Number(targetWd.amount) - fee).toFixed(2)));
        } else {
          fee = 0;
          netPayout = Number(targetWd.amount);
        }
      }

      const transferResult = await disbursePaystackTransfer({
        amount: Number(netPayout),
        recipient_phone: targetWd.momo_number,
        recipient_name: recipientName,
        network: targetWd.momo_network,
        reason: `Agent Profit Payout - ${agent?.store_name || targetWd.agent_id}`,
      });

      if (!transferResult.success) {
        return NextResponse.json(
          {
            success: false,
            message: `Paystack Payout Failed: ${transferResult.message}`,
            details: transferResult,
          },
          { status: 400 }
        );
      }

      extra = {
        paystack_transfer_code: transferResult.transfer_code,
        paystack_status: transferResult.status,
        fee: Number(fee || 0),
        net_amount: Number(netPayout),
      };
      finalNote =
        (note ? note + " | " : "") +
        `Paid via Paystack Transfer: ${transferResult.transfer_code || "Success"} (Gross: GHS ${Number(targetWd.amount).toFixed(2)}, Fee: GHS ${Number(fee || 0).toFixed(2)}, Net Sent: GHS ${Number(netPayout).toFixed(2)})`;
    }

    const updated = await db.updateWithdrawalStatus(id, status, finalNote, extra);

    return NextResponse.json({
      success: true,
      withdrawal: updated,
      message: pay_with_paystack
        ? `Payout of GHS ${Number(extra?.net_amount || targetWd.amount).toFixed(2)} sent via Paystack Transfer!`
        : `Withdrawal status updated to ${status}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update withdrawal status" },
      { status: 500 }
    );
  }
}
