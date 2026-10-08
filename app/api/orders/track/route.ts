import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncOrderWithDataMart } from "@/lib/datamart";

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

    // Check by reference first if it matches BIGJ format or is alphanumeric
    let order = await db.getOrderByReference(trimmed);

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
      return NextResponse.json({ success: true, orders: [order] });
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
      orders: syncedOrders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to search orders" },
      { status: 500 }
    );
  }
}
