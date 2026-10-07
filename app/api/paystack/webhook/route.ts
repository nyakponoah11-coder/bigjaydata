import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    const settings = await db.getSettings();
    const secretKey = settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || "";

    // If secret key is configured, verify HMAC SHA512 signature
    if (secretKey && signature) {
      const hash = crypto
        .createHmac("sha512", secretKey)
        .update(rawBody)
        .digest("hex");

      if (hash !== signature) {
        console.warn("[Paystack Webhook] Signature mismatch received");
        return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    // Paystack event for successful payment
    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;
      const amount = Number(data.amount) / 100;
      const paystackRef = data.id ? String(data.id) : reference;

      // Extract metadata custom fields passed during checkout
      let phone = "";
      let network = "";
      let package_size = "";

      const customFields = data.metadata?.custom_fields;
      if (Array.isArray(customFields)) {
        for (const field of customFields) {
          if (field.variable_name === "phone") phone = field.value;
          if (field.variable_name === "network") network = field.value;
          if (field.variable_name === "package_size") package_size = field.value;
        }
      }

      // Check if order already exists in DB
      const existingOrder = await db.getOrderByReference(reference);

      if (existingOrder) {
        // Avoid duplicate dispatch if already fulfilled
        if (existingOrder.status === "delivered") {
          console.log(`[Paystack Webhook] Order ${reference} already marked delivered.`);
          return NextResponse.json({ status: "success", message: "Order already delivered" });
        }

        // If order was pending, dispatch through DataMart
        console.log(`[Paystack Webhook] Dispatching order ${reference} to DataMart API...`);
        const deliveryResult = await sendDataMartDelivery({
          network: existingOrder.network,
          package_size: existingOrder.package_size,
          phone: existingOrder.phone,
          reference: existingOrder.reference,
          idempotency_key: existingOrder.reference,
        });

        await db.updateOrderStatus(
          existingOrder.id,
          deliveryResult.success ? "delivered" : "failed",
          deliveryResult.raw_response || deliveryResult
        );
      } else if (phone && network && package_size) {
        // Background creation if checkout closed before client trigger
        console.log(`[Paystack Webhook] Creating and dispatching new order ${reference}...`);
        const newOrder = await db.createOrder({
          reference,
          network: network.toLowerCase(),
          package_size,
          phone,
          amount,
          paystack_ref: paystackRef,
          status: "pending",
          datamart_response: { status: "pending", source: "paystack_webhook" },
        });

        const deliveryResult = await sendDataMartDelivery({
          network,
          package_size,
          phone,
          reference,
          idempotency_key: reference,
        });

        await db.updateOrderStatus(
          newOrder.id,
          deliveryResult.success ? "delivered" : "failed",
          deliveryResult.raw_response || deliveryResult
        );
      }
    }

    // Always acknowledge receipt to Paystack
    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("[Paystack Webhook] Error handling webhook:", error);
    return NextResponse.json({ message: "Webhook handler error" }, { status: 500 });
  }
}
