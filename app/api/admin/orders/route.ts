import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendCustomerSMS } from "@/lib/sms";
import { sendDataMartDelivery, syncOrderWithDataMart } from "@/lib/datamart";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;
    const network = searchParams.get("network") || undefined;
    const status = searchParams.get("status") || undefined;
    const delivery_status = searchParams.get("delivery_status") || undefined;
    const payment_status = searchParams.get("payment_status") || undefined;
    const search = searchParams.get("search") || undefined;

    const orders = await db.getOrders({
      date,
      network,
      status,
      delivery_status,
      payment_status,
      search,
    });
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
    const {
      order_id,
      reference,
      status,
      delivery_status,
      payment_status,
      send_sms,
      sms_text,
      resend_datamart,
      sync_datamart,
      sync_all_active,
    } = body;

    // Batch sync all non-terminal orders with DataMart
    if (sync_all_active) {
      const allOrders = await db.getOrders();
      const active = allOrders.filter(
        (o) => !["cancelled", "refunded"].includes(o.delivery_status)
      );
      let updatedCount = 0;
      for (const ord of active) {
        try {
          const synced = await syncOrderWithDataMart(ord);
          if (synced.delivery_status !== ord.delivery_status) {
            updatedCount++;
          }
        } catch {}
      }
      const refreshed = await db.getOrders();
      return NextResponse.json({
        success: true,
        message: `Synced ${active.length} active orders (${updatedCount} updated)`,
        orders: refreshed,
      });
    }

    const targetRef = reference || order_id;
    if (!targetRef) {
      return NextResponse.json(
        { success: false, message: "Order ID or Reference is required" },
        { status: 400 }
      );
    }

    let order = await db.getOrderByReference(targetRef);
    if (!order) {
      order = await db.getOrderById(targetRef);
    }
    if (!order) {
      const all = await db.getOrders();
      order = all.find((o) => o.id === targetRef || o.reference.toLowerCase() === targetRef.toLowerCase()) || null;
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // If admin requested live sync from DataMart
    if (sync_datamart) {
      const synced = await syncOrderWithDataMart(order);
      return NextResponse.json({
        success: true,
        message: `Order live synced with DataMart: ${synced.delivery_status}`,
        order: synced,
      });
    }

    // If admin requested resend to DataMart
    if (resend_datamart) {
      const dmResult = await sendDataMartDelivery({
        network: order.network,
        package_size: order.package_size,
        phone: order.phone,
        reference: order.reference,
      });

      const finalDelivery = dmResult.success ? (dmResult.status || "processing") : "failed";
      const updated = await db.updateOrderStatus(
        order.id,
        finalDelivery,
        dmResult.raw_response || dmResult,
        {
          payment_status: order.payment_status || "paid",
          delivery_status: finalDelivery,
        }
      );

      return NextResponse.json({
        success: dmResult.success,
        message: dmResult.message,
        order: updated,
      });
    }

    // Status changes (delivery_status and/or payment_status)
    const newDeliveryStatus = delivery_status || status || order.delivery_status;
    const newPaymentStatus = payment_status || order.payment_status || "paid";

    const updatedOrder =
      (await db.updateOrderStatus(
        order.id,
        newDeliveryStatus,
        undefined,
        {
          delivery_status: newDeliveryStatus,
          payment_status: newPaymentStatus,
        }
      )) || order;

    // Optional SMS sending
    if (send_sms && updatedOrder.phone) {
      const defaultMsg =
        updatedOrder.delivery_status === "delivered"
          ? `Hello, your ${updatedOrder.network.toUpperCase()} ${updatedOrder.package_size} data bundle from BundleMartGh (${updatedOrder.reference}) has been delivered! Thank you for choosing us.`
          : `Hello, update on your BundleMartGh order (${updatedOrder.reference}): Delivery is ${updatedOrder.delivery_status}. For questions, contact support.`;

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
