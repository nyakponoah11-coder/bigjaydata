import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, network, package_size, phone, amount } = body;

    if (!customer_id || !network || !package_size || !phone || amount === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required order parameters." },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).replace(/[^0-9]/g, "");
    if (cleanPhone.length < 9) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid recipient phone number." },
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
        { success: false, message: "Your customer account is currently inactive." },
        { status: 403 }
      );
    }

    const orderAmount = Number(amount);
    if (orderAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid bundle price amount." },
        { status: 400 }
      );
    }

    if ((customer.wallet_balance || 0) < orderAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient wallet balance. You have GHS ${Number(customer.wallet_balance || 0).toFixed(2)}, but this bundle costs GHS ${orderAmount.toFixed(2)}. Please deposit funds or pay with Momo directly.`,
        },
        { status: 400 }
      );
    }

    const random8 = Math.floor(10000000 + Math.random() * 90000000);
    const reference = `BMGH-W${random8}`;

    // 1. Atomically debit customer wallet and log transaction
    const debitResult = await db.debitCustomerWallet(
      customer.id,
      orderAmount,
      reference,
      `${network.toUpperCase()} ${package_size} Data Bundle (Paid from Wallet)`
    );

    // 2. Create the order in the system
    let order = await db.createOrder({
      reference,
      network: network.toLowerCase(),
      package_size,
      phone: cleanPhone,
      amount: orderAmount,
      paystack_ref: "WALLET_BAL",
      payment_status: "paid",
      delivery_status: "processing",
      status: "pending",
      source: "customer_wallet",
      customer_id: customer.id,
      payment_method: "wallet",
      datamart_response: { status: "pending", initiated_at: new Date().toISOString() },
    });

    // 3. Dispatch bundle to line through DataMart delivery gateway
    try {
      const deliveryResult = await sendDataMartDelivery(order);
      if (deliveryResult && deliveryResult.success) {
        order =
          (await db.updateOrderStatus(
            order.reference,
            "delivered",
            deliveryResult.raw_response || deliveryResult,
            { delivery_status: "delivered" }
          )) || order;
      }
    } catch (deliveryErr: any) {
      console.warn("Automated delivery trigger notice:", deliveryErr?.message || deliveryErr);
    }

    const { password_hash, ...safeCustomer } = debitResult.customer;

    return NextResponse.json({
      success: true,
      message: "Order placed successfully using your wallet balance!",
      reference,
      order,
      new_balance: debitResult.new_balance,
      customer: safeCustomer,
    });
  } catch (error: any) {
    console.error("Wallet order error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to process order with wallet balance." },
      { status: 500 }
    );
  }
}
