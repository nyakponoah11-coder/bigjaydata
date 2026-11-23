import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Pre-registers a pending order right when the customer clicks "Pay".
 * Ensures the order exists in the database with full network, package, and phone
 * details BEFORE Paystack checkout opens. If the customer completes payment
 * and leaves/closes their browser before the redirect, the Paystack webhook
 * will find this pending order by reference and immediately dispatch it to DataMart!
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      reference,
      network,
      package_size,
      phone,
      amount,
      customer_id,
      customer_name,
      customer_email,
      store_slug,
      agent_id,
      service_type,
    } = body;

    const cleanRef = String(reference || "").trim();
    if (!cleanRef) {
      return NextResponse.json({ success: false, message: "Reference is required" }, { status: 400 });
    }

    const cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("233") && cleanPhone.length === 12
      ? "0" + cleanPhone.slice(3)
      : cleanPhone;

    // Check if order already exists
    const existing = await db.getOrderByReference(cleanRef);
    if (existing) {
      return NextResponse.json({ success: true, order: existing, already_exists: true });
    }

    let resolvedAgent = null;
    let agentProfit = 0;
    let basePrice = Number(amount) || 0;

    if (store_slug || agent_id) {
      try {
        resolvedAgent = agent_id ? await db.getAgentById(agent_id) : await db.getAgentBySlug(store_slug);
        if (resolvedAgent && Number(amount) > 0) {
          const baseProducts = await db.getAgentBaseProducts();
          const bp = baseProducts.find(
            (b) =>
              (b.network || "").toLowerCase().trim() === String(network || "").toLowerCase().trim() &&
              (b.size || "").toLowerCase().trim() === String(package_size || "").toLowerCase().trim()
          );
          if (bp && Number(bp.base_price) > 0) {
            basePrice = Number(bp.base_price);
            agentProfit = Math.max(0, Number((Number(amount) - basePrice).toFixed(2)));
          }
        }
      } catch {}
    }

    const newOrder = await db.createOrder({
      reference: cleanRef,
      network: String(network || "mtn").toLowerCase().trim(),
      package_size: String(package_size || "").trim(),
      phone: formattedPhone,
      amount: Number(amount) || 0,
      paystack_ref: cleanRef,
      payment_status: "pending",
      delivery_status: "pending",
      status: "pending",
      customer_id: customer_id || undefined,
      customer_name: customer_name || undefined,
      customer_email: customer_email || undefined,
      service_type: service_type || "data",
      payment_method: "paystack",
      datamart_response: {
        status: "pending_checkout",
        initiated_at: new Date().toISOString(),
        store_slug: store_slug || (resolvedAgent ? resolvedAgent.store_slug : undefined),
        agent_id: resolvedAgent ? resolvedAgent.id : undefined,
        agent_profit: agentProfit > 0 ? agentProfit : undefined,
        source: store_slug || agent_id ? "agent_store" : "direct_store",
      },
    });

    // If agent store order, also pre-register pending agent order
    if (resolvedAgent) {
      try {
        await db.createAgentOrder({
          agent_id: resolvedAgent.id,
          reference: cleanRef,
          network: String(network || "mtn").toLowerCase().trim(),
          package_size: String(package_size || "").trim(),
          phone: formattedPhone,
          amount: Number(amount) || 0,
          base_price: basePrice,
          agent_profit: agentProfit,
          paystack_ref: cleanRef,
          payment_status: "pending",
          delivery_status: "pending",
          status: "pending",
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Order pre-registered successfully",
      reference: cleanRef,
      order: newOrder,
    });
  } catch (err: any) {
    console.error("[Orders Initiate Error]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to pre-register order" },
      { status: 500 }
    );
  }
}
