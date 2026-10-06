import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";

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
      return NextResponse.json({ success: true, orders: [order] });
    }

    // Otherwise search by phone number
    const phoneOrders = await db.getOrdersByPhone(trimmed);

    return NextResponse.json({
      success: true,
      orders: phoneOrders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to search orders" },
      { status: 500 }
    );
  }
}
