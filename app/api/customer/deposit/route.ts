import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, paystack_ref, amount } = body;

    if (!customer_id || !paystack_ref) {
      return NextResponse.json(
        { success: false, message: "Customer ID and Paystack reference are required." },
        { status: 400 }
      );
    }

    const customer = await db.getCustomerById(customer_id);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account not found." },
        { status: 404 }
      );
    }

    if (!customer.is_active) {
      return NextResponse.json(
        { success: false, message: "Customer account is inactive. Please contact support." },
        { status: 403 }
      );
    }

    // Verify transaction with Paystack server-side
    const verification = await verifyPaystackTransaction(paystack_ref);
    if (!verification.success) {
      console.error(`[Customer Deposit] Paystack verification failed for ${paystack_ref}:`, verification.message);
      return NextResponse.json(
        { success: false, message: `Deposit verification failed: ${verification.message}` },
        { status: 402 }
      );
    }

    // Amount in GHS returned by Paystack
    const depositedAmount = verification.amount > 0 ? verification.amount : Number(amount || 0);

    if (depositedAmount < 20) {
      return NextResponse.json(
        { success: false, message: "Minimum deposit is GHS 20.00 (5 Gig equivalent)." },
        { status: 400 }
      );
    }

    const ref = `BMGH-DEP-${Math.floor(100000 + Math.random() * 900000)}`;

    const result = await db.creditCustomerWallet(
      customer.id,
      depositedAmount,
      ref,
      verification.reference || paystack_ref,
      `Wallet Deposit (Paystack ${verification.channel ? `via ${verification.channel.toUpperCase()}` : ""})`
    );

    const { password_hash, ...safeCustomer } = result.customer;

    return NextResponse.json({
      success: true,
      message: `Successfully deposited GHS ${depositedAmount.toFixed(2)} to your account wallet!`,
      new_balance: result.new_balance,
      customer: safeCustomer,
      reference: ref,
    });
  } catch (error: any) {
    console.error("Customer deposit error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to process wallet deposit." },
      { status: 500 }
    );
  }
}
