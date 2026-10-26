import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { decodeAgentToken } from "@/lib/agent-link";
import { createNetflixOrder } from "@/lib/netflix";
import { getClientIp, isEntityBlocked, recordSecurityIncidentAndAlert } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const clientIp = getClientIp(req);
    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();

    const resolvedSlug = decodeAgentToken(cleanSlug);

    let agent = await db.getAgentBySlug(cleanSlug);
    if (!agent && resolvedSlug !== cleanSlug) {
      agent = await db.getAgentBySlug(resolvedSlug);
    }

    if (!agent || !agent.is_active) {
      return NextResponse.json(
        { success: false, message: "Store is inactive or not found." },
        { status: 404 }
      );
    }

    const config = await db.getAgentStoreConfig();
    if (!config.is_enabled && !agent.is_active) {
      return NextResponse.json(
        { success: false, message: "Agent stores are currently closed." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { reference, network, package_size, phone, amount, paystack_ref } = body;

    // 0. Firewall check: Reject blacklisted IP or Phone immediately
    const blockCheck = await isEntityBlocked(clientIp, phone);
    if (blockCheck.blocked) {
      console.warn(`[Firewall Block] Agent checkout denied blacklisted target: ${blockCheck.target} (${blockCheck.reason})`);
      return NextResponse.json(
        { success: false, message: "Access Denied: Your IP or Phone has been flagged and blocked due to security violations." },
        { status: 403 }
      );
    }

    if (!reference || !network || !package_size || !phone || amount === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required order parameters" },
        { status: 400 }
      );
    }

    const paidAmount = Number(amount);
    const norm = (s: string) => (s || "").toLowerCase().replace(/[\s\-_]/g, "");

    // 1. Calculate agent profit = customer selling price - admin base cost
    const agentProducts = await db.getAgentProducts(agent.id);
    const matched = agentProducts.find(
      (p) =>
        (p.network || "").toLowerCase().trim() === (network || "").toLowerCase().trim() &&
        norm(p.size) === norm(package_size)
    );

    const isNetflix = (network || "").toLowerCase().trim() === "netflix";
    let baseCost = matched ? Number(matched.base_price) : 0;
    if (isNetflix && !baseCost) {
      const settings = await db.getSettings();
      baseCost = Number(settings.netflix_agent_base_price || 18);
    } else if (!baseCost) {
      const baseProducts = await db.getAgentBaseProducts();
      const bp = baseProducts.find(
        (b) =>
          (b.network || "").toLowerCase().trim() === (network || "").toLowerCase().trim() &&
          norm(b.size) === norm(package_size)
      );
      if (bp && Number(bp.base_price) > 0) {
        baseCost = Number(bp.base_price);
      }
    }

    if (!baseCost && paidAmount > 0) {
      baseCost = Math.max(1, Number((paidAmount * 0.85).toFixed(2)));
    }

    const agentProfit = Math.max(0, Number((paidAmount - baseCost).toFixed(2)));

    // 2. Paystack verification - STRICT ZERO-TOLERANCE
    if (!paystack_ref || paystack_ref.startsWith("demo_") || paystack_ref.startsWith("test_") || paystack_ref.startsWith("sim_")) {
      console.warn(`[Security Block] Agent checkout rejected unverified/demo ref: ${reference}, paystack_ref: ${paystack_ref}`);
      await recordSecurityIncidentAndAlert({
        type: "demo_reference",
        severity: "critical",
        ip: clientIp,
        phone,
        reference,
        paystack_ref,
        amount_claimed: paidAmount,
        details: `Agent Store (${agent.store_slug}) checkout attempted with fake/demo payment reference: ${paystack_ref || "EMPTY"}.`,
      });

      return NextResponse.json(
        { success: false, message: "Valid payment reference is required to complete purchase. Your IP has been recorded." },
        { status: 400 }
      );
    }

    let verification = await verifyPaystackTransaction(paystack_ref);
    if (!verification.success) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      verification = await verifyPaystackTransaction(paystack_ref);
    }

    if (!verification.success) {
      console.error(`[Security Block] Agent checkout payment verification failed for ${paystack_ref}:`, verification.message);
      await recordSecurityIncidentAndAlert({
        type: "unverified_payment",
        severity: "critical",
        ip: clientIp,
        phone,
        reference,
        paystack_ref,
        amount_claimed: paidAmount,
        details: `Agent Store (${agent.store_slug}) payment verification failed (${verification.message}). Attacker attempting unpaid dispatch.`,
      });

      return NextResponse.json(
        { success: false, message: `Payment verification failed: ${verification.message}. Delivery aborted and incident logged.` },
        { status: 402 }
      );
    }

    // Verify paid amount matches expected price
    if (verification.amount <= 0 || verification.amount < paidAmount - 0.05) {
      console.error(`[Security Block] Agent checkout underpaid: expected GHS ${paidAmount}, received GHS ${verification.amount}`);
      await recordSecurityIncidentAndAlert({
        type: "underpayment",
        severity: "high",
        ip: clientIp,
        phone,
        reference,
        paystack_ref,
        amount_claimed: paidAmount,
        amount_received: verification.amount,
        details: `Agent Store (${agent.store_slug}) price tampering detected: expected GHS ${paidAmount}, received GHS ${verification.amount}.`,
      });

      return NextResponse.json(
        { success: false, message: "Paid amount does not match package price." },
        { status: 400 }
      );
    }

    const finalPaystackRef = verification.reference || paystack_ref;

    // 3. Check if master order already processed by Paystack webhook
    let existingOrder = await db.getOrderByReference(reference);

    // 4. Ensure Agent Order is recorded and wallet is credited
    const agentOrders = await db.getAgentOrders(agent.id);
    let agentOrder = agentOrders.find((o) => o.reference === reference);
    if (!agentOrder) {
      agentOrder = await db.createAgentOrder({
        agent_id: agent.id,
        reference,
        network: (network || "").toLowerCase(),
        package_size,
        phone,
        amount: paidAmount,
        base_price: baseCost,
        agent_profit: agentProfit,
        paystack_ref: finalPaystackRef,
        payment_status: "paid",
        delivery_status: existingOrder ? (existingOrder.delivery_status || "processing") : "processing",
        status: existingOrder ? (existingOrder.status || "processing") : "processing",
      });
    }

    // If already delivered by webhook, link profit metadata to master order if missing and return
    if (existingOrder && (existingOrder.delivery_status === "delivered" || existingOrder.status === "delivered")) {
      if (!existingOrder.datamart_response?.agent_id || !existingOrder.datamart_response?.agent_profit) {
        const mergedDatamart = {
          ...(typeof existingOrder.datamart_response === "object" ? existingOrder.datamart_response : {}),
          agent_id: agent.id,
          agent_profit: agentProfit,
          store_slug: agent.store_slug,
          source: "agent",
        };
        await db.updateOrderStatus(existingOrder.id, existingOrder.delivery_status, mergedDatamart, {
          payment_status: "paid",
          delivery_status: existingOrder.delivery_status,
        });
      }
      return NextResponse.json({
        success: true,
        reference,
        order: existingOrder,
        agent_order: agentOrder,
        delivery: existingOrder.datamart_response,
      });
    }

    // 5. Create Master Order in system database if not present
    let masterOrder = existingOrder || (await db.getOrderByReference(reference));
    if (!masterOrder) {
      masterOrder = await db.createOrder({
        reference,
        network: network.toLowerCase(),
        package_size,
        phone,
        amount: paidAmount,
        paystack_ref: finalPaystackRef,
        payment_status: "paid",
        delivery_status: "processing",
        status: "processing",
        datamart_response: { agent_id: agent.id, agent_profit: agentProfit, store_slug: agent.store_slug, source: "agent" },
      });
    }

    // 6. Dispatch order (Netflix via Data1 partner API, Data bundles via DataMart)
    let deliveryResult: any;

    if (isNetflix) {
      try {
        const netflixResult = await createNetflixOrder({
          customer_name: body.customer_name || agent.store_name,
          customer_phone: masterOrder.phone,
          customer_email: body.customer_email || `${masterOrder.phone}@${agent.store_slug}.com`,
          partner_reference: masterOrder.reference,
          duration_days: 30,
        });

        deliveryResult = netflixResult?.raw || netflixResult;
        const isDelivered = netflixResult?.success;
        const finalDeliveryStatus = isDelivered ? "delivered" : "processing";

        await Promise.all([
          db.updateOrderStatus(masterOrder.id, finalDeliveryStatus, deliveryResult, {
            payment_status: "paid",
            delivery_status: finalDeliveryStatus,
            netflix_email: netflixResult?.netflix_email,
            netflix_reference: netflixResult?.reference,
            service_type: "netflix",
            duration_days: 30,
          }),
          db.updateAgentOrderStatus(agentOrder.id, finalDeliveryStatus, deliveryResult),
        ]);

        return NextResponse.json({
          success: true,
          reference,
          order: masterOrder,
          agent_order: agentOrder,
          delivery: deliveryResult,
        });
      } catch (nfErr: any) {
        console.error("[Netflix Partner API] Agent store order error:", nfErr);
      }
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        deliveryResult = await sendDataMartDelivery({
          network: masterOrder.network,
          package_size: masterOrder.package_size,
          phone: masterOrder.phone,
          reference: masterOrder.reference,
          idempotency_key: masterOrder.reference,
        });
      } catch (dmErr: any) {
        console.error(`[DataMart] Agent Store dispatch error (attempt ${attempt}):`, dmErr);
        deliveryResult = {
          success: false,
          message: dmErr?.message || "Delivery exception",
          raw_response: { error: String(dmErr) },
        };
      }
      if (deliveryResult?.success) break;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }

    // Once payment is verified, delivery status is either delivered (instant) or processing (telecom fast lane queue).
    // It should never be marked as "failed" right after payment confirmation.
    const isDelivered = deliveryResult?.status === "delivered" || deliveryResult?.status === "completed";
    const finalDeliveryStatus = isDelivered ? "delivered" : "processing";

    await Promise.all([
      db.updateOrderStatus(masterOrder.id, finalDeliveryStatus, deliveryResult.raw_response || deliveryResult, {
        payment_status: "paid",
        delivery_status: finalDeliveryStatus,
      }),
      db.updateAgentOrderStatus(agentOrder.id, finalDeliveryStatus, deliveryResult.raw_response || deliveryResult),
    ]);

    return NextResponse.json({
      success: true,
      reference,
      order: masterOrder,
      agent_order: agentOrder,
      delivery: deliveryResult,
    });
  } catch (error: any) {
    console.error("[Agent Store Checkout] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
