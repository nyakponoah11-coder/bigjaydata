import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncOrderWithDataMart } from "@/lib/datamart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const forceSync = searchParams.get("sync") === "true" || searchParams.get("force") === "true";

    if (!query.trim()) {
      return NextResponse.json(
        { success: false, message: "Please provide order reference or phone number" },
        { status: 400 }
      );
    }

    const trimmed = query.trim();

    // Check by reference first if it matches
    let order = await db.getOrderByReference(trimmed);

    // If not found in master orders, search in agent orders
    if (!order) {
      const agentOrders = await db.getAgentOrders();
      const agOrder = agentOrders.find(
        (ao) => ao.reference.toLowerCase() === trimmed.toLowerCase()
      );
      if (agOrder) {
        order = {
          id: agOrder.id,
          reference: agOrder.reference,
          network: agOrder.network,
          package_size: agOrder.package_size,
          phone: agOrder.phone,
          amount: agOrder.amount,
          paystack_ref: agOrder.paystack_ref,
          payment_status: agOrder.payment_status || "paid",
          delivery_status: agOrder.delivery_status || agOrder.status || "delivered",
          status: agOrder.status || agOrder.delivery_status || "delivered",
          datamart_response: agOrder.datamart_response || {},
          created_at: agOrder.created_at,
        };
      }
    }

    if (order) {
      // Sync with DataMart if active or forceSync requested
      const isTerminal = ["cancelled", "refunded"].includes(order.delivery_status);
      if (!isTerminal || forceSync) {
        try {
          order = await syncOrderWithDataMart(order);
        } catch (syncErr) {
          console.warn("[Track API] DataMart live sync error:", syncErr);
        }
      }
      return NextResponse.json({ success: true, order, orders: [order] });
    }

    // Otherwise search by phone number
    const phoneOrders = await db.getOrdersByPhone(trimmed);

    // Concurrently sync any non-terminal orders with DataMart
    const syncedOrders = await Promise.all(
      phoneOrders.map(async (ord) => {
        const isTerminal = ["cancelled", "refunded"].includes(ord.delivery_status);
        if (!isTerminal || forceSync) {
          try {
            return await syncOrderWithDataMart(ord);
          } catch {
            return ord;
          }
        }
        return ord;
      })
    );

    return NextResponse.json({
      success: true,
      order: syncedOrders[0] || null,
      orders: syncedOrders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to search orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query || body.reference || body.phone || "").trim();

    if (!query) {
      return NextResponse.json(
        { success: false, message: "Please enter your order reference or mobile number." },
        { status: 400 }
      );
    }

    // 1. Check by Reference in master orders
    let order = await db.getOrderByReference(query);

    // 2. If not found in master orders, search agent orders
    if (!order) {
      const agentOrders = await db.getAgentOrders();
      const agOrder = agentOrders.find(
        (ao) =>
          ao.reference.toLowerCase() === query.toLowerCase() ||
          ao.phone.replace(/[^0-9]/g, "").endsWith(query.replace(/[^0-9]/g, "").slice(-9))
      );
      if (agOrder) {
        order = {
          id: agOrder.id,
          reference: agOrder.reference,
          network: agOrder.network,
          package_size: agOrder.package_size,
          phone: agOrder.phone,
          amount: agOrder.amount,
          paystack_ref: agOrder.paystack_ref,
          payment_status: agOrder.payment_status || "paid",
          delivery_status: agOrder.delivery_status || agOrder.status || "delivered",
          status: agOrder.status || agOrder.delivery_status || "delivered",
          datamart_response: agOrder.datamart_response || {},
          created_at: agOrder.created_at,
        };
      }
    }

    // 3. If still not found, check by phone in master orders
    if (!order) {
      const cleanPhone = query.replace(/[^0-9]/g, "");
      if (cleanPhone.length >= 9) {
        const phoneOrders = await db.getOrdersByPhone(cleanPhone);
        if (phoneOrders.length > 0) {
          order = phoneOrders[0];
        }
      }
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: "No transaction found matching this reference or phone number." },
        { status: 404 }
      );
    }

    // Live sync with DataMart if status is pending/processing
    if (order.delivery_status === "processing" || order.delivery_status === "pending") {
      try {
        order = await syncOrderWithDataMart(order);
      } catch (syncErr) {
        console.warn("[Track API] Live sync warning:", syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      order,
      orders: [order],
    });
  } catch (error: any) {
    console.error("[Track API POST] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to lookup order status" },
      { status: 500 }
    );
  }
}
