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

    // 1. Check if order already exists (e.g. created by Paystack webhook)
    let order = await db.getOrderByReference(reference);

    if (!order) {
      try {
        order = await db.createOrder({
          reference,
          network: network.toLowerCase(),
          package_size,
          phone,
          amount: Number(amount),
          paystack_ref: paystack_ref || null,
          payment_status: "paid",
          delivery_status: "processing",
          status: "pending",
          datamart_response: { status: "pending", initiated_at: new Date().toISOString() },
        });
      } catch (insertErr: any) {
        // If race condition where webhook inserted it simultaneously
        order = await db.getOrderByReference(reference);
        if (!order) throw insertErr;
      }
    }

    console.log(`[Order Ready] ${reference} - Payment: ${order.payment_status}, Delivery: ${order.delivery_status || order.status}`);

    // If already delivered (e.g. by webhook dispatch), return success immediately
    if (order.delivery_status === "delivered" || order.status === "delivered") {
      return NextResponse.json({
        success: true,
        order,
        delivery: order.datamart_response,
      });
    }

    // 2. Immediately call DataMart API to deliver data if still pending
    let deliveryResult;
    try {
      deliveryResult = await sendDataMartDelivery({
        network: order.network,
        package_size: order.package_size,
        phone: order.phone,
        reference: order.reference,
        idempotency_key: order.reference,
      });
    } catch (dmErr: any) {
      console.error("[DataMart] Direct dispatch error:", dmErr);
      deliveryResult = {
        success: false,
        message: dmErr?.message || "Delivery exception",
        raw_response: { error: String(dmErr) },
      };
    }

    // 3. Update order status based on DataMart result (Payment is 100% paid, delivery is separate)
    const finalDeliveryStatus = deliveryResult.success ? "delivered" : "failed";
    const updatedOrder = await db.updateOrderStatus(
      order.id,
      finalDeliveryStatus,
      deliveryResult.raw_response || deliveryResult,
      {
        payment_status: "paid",
        delivery_status: finalDeliveryStatus,
      }
    );

    return NextResponse.json({
      success: true,
      order: updatedOrder || order,
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
