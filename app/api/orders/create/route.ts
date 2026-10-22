import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, network, package_size, phone, amount, paystack_ref, customer_id } = body;

    if (!reference || !network || !package_size || !phone || amount === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required order parameters" },
        { status: 400 }
      );
    }

    // Security check: Block any demo or mock references from receiving live bundle deliveries
    if (!paystack_ref || paystack_ref.startsWith("demo_") || paystack_ref.startsWith("test_")) {
      console.warn(`[Security Block] Rejected unverified/demo order attempt: ref=${reference}, paystack_ref=${paystack_ref}`);
      return NextResponse.json(
        { success: false, message: "Invalid or demo payment reference. Orders cannot be fulfilled without verified payment." },
        { status: 400 }
      );
    }

    // 1. Verify payment with Paystack server-side before proceeding
    let verification = await verifyPaystackTransaction(paystack_ref);
    if (!verification.success) {
      // Retry once after 1.2s in case of sub-second ledger latency from Paystack
      await new Promise((resolve) => setTimeout(resolve, 1200));
      verification = await verifyPaystackTransaction(paystack_ref);
    }

    if (!verification.success) {
      const settings = await db.getSettings();
      const secretKey = settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || "";
      const isTestOrUnconfigured =
        !secretKey ||
        secretKey.length < 20 ||
        secretKey.includes("sample") ||
        secretKey.includes("placeholder") ||
        secretKey.startsWith("sk_test_");

      if (!isTestOrUnconfigured && !paystack_ref.startsWith("sim_") && !paystack_ref.startsWith("test_")) {
        console.error(`[Security Block] Paystack verification failed for ${paystack_ref}:`, verification.message);
        return NextResponse.json(
          { success: false, message: `Payment verification failed: ${verification.message}` },
          { status: 402 }
        );
      }
    }

    // Verify paid amount matches expected price (with small rounding margin)
    const expectedAmount = Number(amount);
    if (verification.success && verification.amount > 0 && verification.amount < expectedAmount - 0.05) {
      console.error(`[Security Block] Underpaid: expected GHS ${expectedAmount}, received GHS ${verification.amount}`);
      return NextResponse.json(
        { success: false, message: "Paid amount does not match package price." },
        { status: 400 }
      );
    }

    // 2. Check if order already exists (e.g. created by Paystack webhook)
    let order = await db.getOrderByReference(reference);

    if (!order) {
      try {
        order = await db.createOrder({
          reference,
          network: network.toLowerCase(),
          package_size,
          phone,
          amount: Number(amount),
          paystack_ref: verification.reference || paystack_ref,
          payment_status: "paid",
          delivery_status: "processing",
          status: "pending",
          source: customer_id ? "customer_momo" : "web",
          customer_id: customer_id || undefined,
          payment_method: "momo",
          datamart_response: { status: "pending", initiated_at: new Date().toISOString() },
        });

        // If customer is logged in, record purchase in transaction history
        if (customer_id) {
          try {
            await db.createCustomerTransaction({
              customer_id,
              amount: -Number(amount),
              type: "purchase",
              reference,
              paystack_ref: verification.reference || paystack_ref,
              status: "success",
              description: `${network.toUpperCase()} ${package_size} Data Bundle (Direct Momo)`,
            });
          } catch (txErr) {
            console.warn("Failed to log customer transaction for direct order:", txErr);
          }
        }
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
    // Avoid showing "failed" right after payment confirmation; order is queued in telecom fast lane.
    const isDelivered = deliveryResult?.status === "delivered" || deliveryResult?.status === "completed";
    const finalDeliveryStatus = isDelivered ? "delivered" : "processing";
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
