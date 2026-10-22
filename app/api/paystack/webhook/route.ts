import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    const settings = await db.getSettings();
    let secretKey = (settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || "").trim().replace(/['"]/g, "").replace(/^Bearer\s+/i, "");

    // Verify HMAC SHA512 signature only if secret key is a real production key
    const isMockSecret = !secretKey || secretKey.length < 20 || secretKey.includes("sample") || secretKey.includes("placeholder") || secretKey.includes("test_sample");
    if (isMockSecret) {
      console.warn("[Paystack Webhook] Paystack secret key is unconfigured or sample. Ignoring webhook event.");
      return NextResponse.json({ message: "Secret key not configured" }, { status: 400 });
    }

    if (!signature) {
      console.warn("[Paystack Webhook] Missing x-paystack-signature header");
      return NextResponse.json({ message: "Missing signature" }, { status: 401 });
    }

    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.warn("[Paystack Webhook] Signature mismatch received");
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
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
      let storeSlug = "";

      let metadata = data.metadata;
      if (typeof metadata === "string") {
        try {
          metadata = JSON.parse(metadata);
        } catch {}
      }

      if (metadata && typeof metadata === "object") {
        phone =
          metadata.phone ||
          metadata.phone_number ||
          metadata.phoneNumber ||
          metadata.recipient_phone ||
          metadata.mobile ||
          "";
        network = metadata.network || metadata.telco || "";
        package_size = metadata.package_size || metadata.package || metadata.size || metadata.capacity || "";
        storeSlug = metadata.store_slug || metadata.slug || metadata.agent || "";

        const customFields = metadata.custom_fields;
        if (Array.isArray(customFields)) {
          for (const field of customFields) {
            const rawVar = (field.variable_name || field.name || field.display_name || "").toLowerCase().replace(/[\s-_]/g, "");
            const val = field.value || "";
            if (rawVar.includes("phone") || rawVar.includes("recipient") || rawVar.includes("mobile")) {
              phone = phone || val;
            }
            if (rawVar.includes("network") || rawVar.includes("telco")) {
              network = network || val;
            }
            if (rawVar.includes("package") || rawVar.includes("size") || rawVar.includes("capacity")) {
              package_size = package_size || val;
            }
            if (rawVar.includes("slug") || rawVar.includes("store")) {
              storeSlug = storeSlug || val;
            }
          }
        }
      }

      // Robust fallback: Recover phone from customer email if email is cleanPhone@customer...
      if (!phone && data.customer) {
        if (data.customer.phone) {
          phone = data.customer.phone;
        } else if (data.customer.email && data.customer.email.includes("@customer.")) {
          const emailPrefix = data.customer.email.split("@")[0].replace(/[^0-9]/g, "");
          if (emailPrefix.length >= 9) {
            phone = emailPrefix;
          }
        }
      }

      // Normalize phone number
      if (phone) {
        phone = phone.replace(/[^0-9]/g, "");
        if (phone.startsWith("233") && phone.length === 12) {
          phone = "0" + phone.slice(3);
        }
      }

      // Fallback network detection from Ghana mobile phone prefix if missing
      if (!network && phone && phone.length >= 3) {
        const p3 = phone.slice(0, 3);
        if (["024", "054", "055", "059", "025"].includes(p3)) network = "mtn";
        else if (["020", "050"].includes(p3)) network = "telecel";
        else if (["027", "057", "026", "056"].includes(p3)) network = "at";
      }

      // Normalization helper
      const norm = (s: string) => (s || "").toLowerCase().replace(/[\s\-_]/g, "");

      // Check if order already exists in DB
      const existingOrder = await db.getOrderByReference(reference);

      // Resolve agent for profit crediting
      let resolvedAgent: any = null;
      if (storeSlug) {
        try {
          resolvedAgent = await db.getAgentBySlug(storeSlug);
        } catch {}
      }
      if (!resolvedAgent && existingOrder?.datamart_response?.agent_id) {
        try {
          resolvedAgent = await db.getAgentById(existingOrder.datamart_response.agent_id);
        } catch {}
      }
      if (!resolvedAgent && existingOrder?.datamart_response?.store_slug) {
        try {
          resolvedAgent = await db.getAgentBySlug(existingOrder.datamart_response.store_slug);
        } catch {}
      }
      if (!resolvedAgent && reference) {
        try {
          const prefix = reference.split("-")[0]?.toLowerCase();
          if (prefix && prefix !== "bmgh") {
            const allAgents = await db.getAgents();
            resolvedAgent =
              allAgents.find((a) => {
                const slugPrefix = a.store_slug.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
                return slugPrefix === prefix || a.store_slug.toLowerCase() === prefix;
              }) || null;
          }
        } catch {}
      }

      const activeNet = network || existingOrder?.network || "";
      const activePkg = package_size || existingOrder?.package_size || "";
      const activePhone = phone || existingOrder?.phone || "";
      const activeAmt = amount || Number(existingOrder?.amount || 0);

      let webhookBaseCost = 0;
      let webhookAgentProfit = 0;
      if (resolvedAgent && activeAmt > 0) {
        try {
          const agentProducts = await db.getAgentProducts(resolvedAgent.id);
          const matched = agentProducts.find(
            (p) =>
              (p.network || "").toLowerCase().trim() === activeNet.toLowerCase().trim() &&
              norm(p.size) === norm(activePkg)
          );
          if (matched && Number(matched.base_price) > 0) {
            webhookBaseCost = Number(matched.base_price);
          } else {
            const baseProducts = await db.getAgentBaseProducts();
            const bp = baseProducts.find(
              (b) =>
                (b.network || "").toLowerCase().trim() === activeNet.toLowerCase().trim() &&
                norm(b.size) === norm(activePkg)
            );
            if (bp && Number(bp.base_price) > 0) {
              webhookBaseCost = Number(bp.base_price);
            }
          }

          if (!webhookBaseCost && activeAmt > 0) {
            webhookBaseCost = Math.max(1, Number((activeAmt * 0.85).toFixed(2)));
          }
          webhookAgentProfit = Math.max(0, Number((activeAmt - webhookBaseCost).toFixed(2)));
        } catch (calcErr) {
          console.warn("[Paystack Webhook] Agent profit calculation warning:", calcErr);
        }
      }

      if (existingOrder) {
        // Avoid duplicate dispatch if already fulfilled
        if (existingOrder.status === "delivered") {
          console.log(`[Paystack Webhook] Order ${reference} already marked delivered.`);

          // Ensure agent order exists and has profit credited even if marked delivered
          if (resolvedAgent) {
            try {
              const existingAgOrders = await db.getAgentOrders(resolvedAgent.id);
              const hasAg = existingAgOrders.some((o) => o.reference === reference);
              if (!hasAg) {
                await db.createAgentOrder({
                  agent_id: resolvedAgent.id,
                  reference,
                  network: activeNet.toLowerCase(),
                  package_size: activePkg,
                  phone: activePhone,
                  amount: activeAmt,
                  base_price: webhookBaseCost,
                  agent_profit: webhookAgentProfit,
                  paystack_ref: paystackRef,
                  payment_status: "paid",
                  delivery_status: "delivered",
                  status: "delivered",
                });
              }
            } catch (err) {}
          }
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

        const finalDelivery = deliveryResult.success ? (deliveryResult.status || "processing") : "failed";
        const mergedResp = {
          ...(typeof existingOrder.datamart_response === "object" ? existingOrder.datamart_response : {}),
          ...(typeof deliveryResult.raw_response === "object" ? deliveryResult.raw_response : { result: deliveryResult }),
          ...(resolvedAgent
            ? {
                agent_id: resolvedAgent.id,
                agent_profit: webhookAgentProfit,
                store_slug: resolvedAgent.store_slug,
                source: "agent",
              }
            : {}),
        };
        await Promise.all([
          db.updateOrderStatus(
            existingOrder.id,
            finalDelivery,
            mergedResp,
            {
              payment_status: "paid",
              delivery_status: finalDelivery,
            }
          ),
          db.updateAgentOrderStatus(reference, finalDelivery, deliveryResult.raw_response || deliveryResult),
        ]);

        if (resolvedAgent) {
          try {
            const existingAgOrders = await db.getAgentOrders(resolvedAgent.id);
            const hasAg = existingAgOrders.some((o) => o.reference === reference);
            if (!hasAg) {
              await db.createAgentOrder({
                agent_id: resolvedAgent.id,
                reference,
                network: activeNet.toLowerCase(),
                package_size: activePkg,
                phone: activePhone,
                amount: activeAmt,
                base_price: webhookBaseCost,
                agent_profit: webhookAgentProfit,
                paystack_ref: paystackRef,
                payment_status: "paid",
                delivery_status: finalDelivery,
                status: finalDelivery,
              });
            }
          } catch (agentErr) {
            console.error("[Paystack Webhook] Agent order creation on existing order error:", agentErr);
          }
        }
      } else if (activePhone && activePkg) {
        // Background creation if checkout closed before client trigger
        console.log(`[Paystack Webhook] Creating and dispatching new order ${reference} (phone: ${activePhone}, net: ${activeNet}, pkg: ${activePkg})...`);

        const newOrder = await db.createOrder({
          reference,
          network: activeNet.toLowerCase(),
          package_size: activePkg,
          phone: activePhone,
          amount: activeAmt,
          paystack_ref: paystackRef,
          payment_status: "paid",
          delivery_status: "processing",
          status: "pending",
          datamart_response: {
            status: "pending",
            source: "paystack_webhook",
            store_slug: storeSlug || (resolvedAgent ? resolvedAgent.store_slug : ""),
            ...(resolvedAgent ? { agent_id: resolvedAgent.id, agent_profit: webhookAgentProfit } : {}),
          },
        });

        const deliveryResult = await sendDataMartDelivery({
          network: activeNet,
          package_size: activePkg,
          phone: activePhone,
          reference,
          idempotency_key: reference,
        });

        const finalDelivery = deliveryResult.success ? (deliveryResult.status || "processing") : "failed";
        await db.updateOrderStatus(
          newOrder.id,
          finalDelivery,
          deliveryResult.raw_response || deliveryResult,
          {
            payment_status: "paid",
            delivery_status: finalDelivery,
          }
        );

        if (resolvedAgent) {
          try {
            await db.createAgentOrder({
              agent_id: resolvedAgent.id,
              reference,
              network: activeNet.toLowerCase(),
              package_size: activePkg,
              phone: activePhone,
              amount: activeAmt,
              base_price: webhookBaseCost,
              agent_profit: webhookAgentProfit,
              paystack_ref: paystackRef,
              payment_status: "paid",
              delivery_status: finalDelivery,
              status: finalDelivery,
            });
          } catch (agentErr) {
            console.error("[Paystack Webhook] Agent order creation error:", agentErr);
          }
        }
      }
    }

    // Always acknowledge receipt to Paystack
    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("[Paystack Webhook] Error handling webhook:", error);
    return NextResponse.json({ message: "Webhook handler error" }, { status: 500 });
  }
}
