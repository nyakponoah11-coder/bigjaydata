import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";

export async function POST(request: Request) {
  try {
    const { order_id, reference } = await request.json();

    const order = reference
      ? await db.getOrderByReference(reference)
      : (await db.getOrders()).find((o) => o.id === order_id);

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const deliveryResult = await sendDataMartDelivery({
      network: order.network,
      package_size: order.package_size,
      phone: order.phone,
      reference: order.reference,
    });

    const newStatus = deliveryResult.success ? "delivered" : "failed";
    const updated = await db.updateOrderStatus(order.id, newStatus, deliveryResult.raw_response || deliveryResult);

    return NextResponse.json({
      success: deliveryResult.success,
      message: deliveryResult.message,
      order: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "DataMart dispatch failed" },
      { status: 500 }
    );
  }
}
