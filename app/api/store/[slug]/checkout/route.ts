import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();

    const config = await db.getAgentStoreConfig();
    if (!config.is_enabled) {
      return NextResponse.json(
        { success: false, message: "Agent stores are currently closed." },
        { status: 503 }
      );
    }

    const agent = await db.getAgentBySlug(cleanSlug);
    if (!agent || !agent.is_active) {
      return NextResponse.json(
        { success: false, message: "Store is inactive or not found." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { reference, network, package_size, phone, amount, paystack_ref } = body;

    if (!reference || !network || !package_size || !phone || amount === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required order parameters" },
        { status: 400 }
      );
    }

    // 1. Strict Paystack verification to avoid fake orders
    if (!paystack_ref || paystack_ref.startsWith("demo_") || paystack_ref.startsWith("test_")) {
      return NextResponse.json(
        { success: false, message: "Unverified payment reference." },
        { status: 400 }
      );
    }

    const verification = await verifyPaystackTransaction(paystack_ref);
    if (!verification.success) {
      return NextResponse.json(
        { success: false, message: `Payment verification failed: ${verification.message}` },
        { status: 402 }
      );
    }

    const paidAmount = Number(amount);
    if (verification.amount > 0 && verification.amount < paidAmount - 0.05) {
      return NextResponse.json(
        { success: false, message: "Amount paid is less than product price." },
        { status: 400 }
      );
    }

    // 2. Calculate agent profit = customer selling price - admin base cost
    const agentProducts = await db.getAgentProducts(agent.id);
    const matched = agentProducts.find(
      (p) =>
        p.network.toLowerCase() === network.toLowerCase() &&
        p.size.toLowerCase() === package_size.toLowerCase()
    );

    const baseCost = matched ? matched.base_price : paidAmount;
    const agentProfit = Math.max(0, Number((paidAmount - baseCost).toFixed(2)));

    // 3. Create Agent Order and credit wallet
    const agentOrder = await db.createAgentOrder({
      agent_id: agent.id,
      reference,
      network: network.toLowerCase(),
      package_size,
      phone,
      amount: paidAmount,
      base_price: baseCost,
      agent_profit: agentProfit,
      paystack_ref: verification.reference || paystack_ref,
      payment_status: "paid",
      delivery_status: "processing",
      status: "processing",
    });

    // 4. Create Master Order in system database
    let masterOrder = await db.getOrderByReference(reference);
    if (!masterOrder) {
      masterOrder = await db.createOrder({
        reference,
        network: network.toLowerCase(),
        package_size,
        phone,
        amount: paidAmount,
        paystack_ref: verification.reference || paystack_ref,
        payment_status: "paid",
        delivery_status: "processing",
        status: "processing",
        datamart_response: { agent_id: agent.id, agent_profit: agentProfit },
      });
    }

    // 5. Dispatch bundle via DataMart API
    let deliveryResult;
    try {
      deliveryResult = await sendDataMartDelivery({
        network: masterOrder.network,
        package_size: masterOrder.package_size,
        phone: masterOrder.phone,
        reference: masterOrder.reference,
        idempotency_key: masterOrder.reference,
      });
    } catch (dmErr: any) {
      console.error("[DataMart] Agent Store dispatch error:", dmErr);
      deliveryResult = {
        success: false,
        message: dmErr?.message || "Delivery exception",
        raw_response: { error: String(dmErr) },
      };
    }

    const finalDeliveryStatus = deliveryResult.success ? (deliveryResult.status || "processing") : "failed";

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
