import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendCustomerSMS } from "@/lib/sms";
import { sendDataMartDelivery } from "@/lib/datamart";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;
    const network = searchParams.get("network") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const orders = await db.getOrders({ date, network, status, search });
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { order_id, reference, status, send_sms, sms_text, resend_datamart } = body;

    const targetRef = reference || order_id;
    if (!targetRef) {
      return NextResponse.json(
        { success: false, message: "Order ID or Reference is required" },
        { status: 400 }
      );
    }

    let order = await db.getOrderByReference(targetRef);
    if (!order) {
      const all = await db.getOrders();
      order = all.find((o) => o.id === targetRef) || null;
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // If admin requested resend to DataMart
    if (resend_datamart) {
      const dmResult = await sendDataMartDelivery({
        network: order.network,
        package_size: order.package_size,
        phone: order.phone,
        reference: order.reference,
      });

      const updated = await db.updateOrderStatus(
        order.id,
        dmResult.success ? "delivered" : "failed",
        dmResult.raw_response || dmResult
      );

      return NextResponse.json({
        success: true,
        message: dmResult.message,
        order: updated,
      });
    }

    // Status change
    let updatedOrder = order;
    if (status) {
      updatedOrder = (await db.updateOrderStatus(order.id, status)) || order;
    }

    // Optional SMS sending
    if (send_sms && updatedOrder.phone) {
      const defaultMsg =
        status === "delivered"
          ? `Hello, your ${updatedOrder.network.toUpperCase()} ${updatedOrder.package_size} data bundle from BundleMartGh (${updatedOrder.reference}) has been delivered! Thank you for choosing us.`
          : `Hello, update on your BundleMartGh order (${updatedOrder.reference}): Status changed to ${status}. For questions, contact support.`;

      await sendCustomerSMS({
        phone: updatedOrder.phone,
        message: sms_text || defaultMsg,
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Order action failed" },
      { status: 500 }
    );
  }
}
