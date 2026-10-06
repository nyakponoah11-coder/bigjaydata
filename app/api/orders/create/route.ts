import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, network, package_size, phone, amount, paystack_ref } = body;

    if (!reference || !network || !package_size || !phone || amount === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required order parameters" },
        { status: 400 }
      );
    }

    // 1. Create order in Supabase / DB with status 'pending'
    const newOrder = await db.createOrder({
      reference,
      network: network.toLowerCase(),
      package_size,
      phone,
      amount: Number(amount),
      paystack_ref: paystack_ref || null,
      status: "pending",
      datamart_response: { status: "pending", initiated_at: new Date().toISOString() },
    });

    console.log(`[Order Created] ${reference} - Pending DataMart dispatch`);

    // 2. Immediately call DataMart API to deliver data
    let deliveryResult;
    try {
      deliveryResult = await sendDataMartDelivery({
        network,
        package_size,
        phone,
        reference,
      });
    } catch (dmErr: any) {
      console.error("[DataMart] Direct dispatch error:", dmErr);
      deliveryResult = {
        success: false,
        message: dmErr?.message || "Delivery exception",
        raw_response: { error: String(dmErr) },
      };
    }

    // 3. Update order status based on DataMart result
    const finalStatus = deliveryResult.success ? "delivered" : "failed";
    const updatedOrder = await db.updateOrderStatus(
      newOrder.id,
      finalStatus,
      deliveryResult.raw_response || deliveryResult
    );

    return NextResponse.json({
      success: true,
      order: updatedOrder || newOrder,
      delivery: deliveryResult,
    });
  } catch (error: any) {
    console.error("[API orders/create] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
