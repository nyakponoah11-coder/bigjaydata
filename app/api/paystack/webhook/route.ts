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

    // Verify HMAC SHA512 signature only if secret key is a real production key
    const isMockSecret = !secretKey || secretKey.includes("sample") || secretKey.includes("placeholder") || secretKey.includes("test_sample");
    if (!isMockSecret && signature) {
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

      let metadata = data.metadata;
      if (typeof metadata === "string") {
        try {
          metadata = JSON.parse(metadata);
        } catch {}
      }

      if (metadata && typeof metadata === "object") {
        phone = metadata.phone || metadata.phoneNumber || metadata.recipient_phone || "";
        network = metadata.network || "";
        package_size = metadata.package_size || metadata.package || metadata.size || "";

        const customFields = metadata.custom_fields;
        if (Array.isArray(customFields)) {
          for (const field of customFields) {
            const varName = (field.variable_name || field.name || "").toLowerCase();
            if (varName === "phone" || varName === "phonenumber") phone = field.value || phone;
            if (varName === "network") network = field.value || network;
            if (varName === "package_size" || varName === "package" || varName === "size") package_size = field.value || package_size;
          }
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

        const finalDelivery = deliveryResult.success ? "delivered" : "failed";
        await db.updateOrderStatus(
          existingOrder.id,
          finalDelivery,
          deliveryResult.raw_response || deliveryResult,
          {
            payment_status: "paid",
            delivery_status: finalDelivery,
          }
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
          payment_status: "paid",
          delivery_status: "processing",
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

        const finalDelivery = deliveryResult.success ? "delivered" : "failed";
        await db.updateOrderStatus(
          newOrder.id,
          finalDelivery,
          deliveryResult.raw_response || deliveryResult,
          {
            payment_status: "paid",
            delivery_status: finalDelivery,
          }
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
