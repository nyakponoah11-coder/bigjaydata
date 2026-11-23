import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendCustomerSMS } from "@/lib/sms";
import { sendDataMartDelivery, syncOrderWithDataMart, syncMultipleOrdersWithDataMart } from "@/lib/datamart";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authError = await requireAdminAuth(request);
    if (authError) return authError;

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
    }, true);

    // Auto-sync: Silently re-verify any recent in-flight orders in ~1s so the list is always fresh on load
    const processingOrders = orders
      .filter((o) => {
        const st = (o.delivery_status || o.status || "").toLowerCase().trim();
        const ageHours = (Date.now() - new Date(o.created_at || Date.now()).getTime()) / (1000 * 60 * 60);
        return (st === "processing" || st === "pending" || st === "waiting" || st === "queued") && ageHours <= 72;
      })
      .slice(0, 50);

    let finalOrders = orders;
    if (processingOrders.length > 0) {
      const { updatedCount } = await syncMultipleOrdersWithDataMart(processingOrders);
      if (updatedCount > 0) {
        finalOrders = await db.getOrders({
          date,
          network,
          status,
          delivery_status,
          payment_status,
          search,
        }, true);
      }
    }

    return NextResponse.json({ success: true, orders: finalOrders }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authError = await requireAdminAuth(request);
    if (authError) return authError;

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
      full_sync,
    } = body;

    // Batch / Full sync: Re-verify all orders live against DataMart in ~1 second via batch transactions feed!
    if (full_sync || sync_all_active) {
      const allOrders = await db.getOrders();
      // If full_sync, re-verify all orders from the past 14 days to correct any false statuses
      const targetOrders = full_sync
        ? allOrders.filter((o) => {
            const ageDays = (Date.now() - new Date(o.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24);
            return ageDays <= 14;
          })
        : allOrders.filter(
            (o) => !["cancelled", "refunded"].includes((o.delivery_status || "").toLowerCase().trim())
          );

      const { updatedCount } = await syncMultipleOrdersWithDataMart(targetOrders);
      const refreshed = await db.getOrders();
      return NextResponse.json({
        success: true,
        message: `Sync complete! Re-verified ${targetOrders.length} orders live from DataMart (${updatedCount} updated to real carrier delivery status).`,
        orders: refreshed,
        updatedCount,
        totalChecked: targetOrders.length,
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
      const synced = await syncOrderWithDataMart(order, true);
      await db.updateAgentOrderStatus(order.reference, synced.delivery_status).catch(() => {});
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
      await db.updateAgentOrderStatus(order.reference, finalDelivery, dmResult.raw_response || dmResult).catch(() => {});

      return NextResponse.json({
        success: dmResult.success,
        message: dmResult.message,
        order: updated,
      });
    }

    // Status changes (delivery_status and/or payment_status)
    const newDeliveryStatus = delivery_status || status || order.delivery_status;
    const newPaymentStatus = payment_status || order.payment_status || "paid";

    // Mark as manual admin override so background or automated carrier syncs never revert it
    const manualDatamartResponse = {
      ...(order.datamart_response || {}),
      is_manual_override: true,
      manual_status: newDeliveryStatus,
      manual_override_at: new Date().toISOString(),
    };

    const updatedOrder =
      (await db.updateOrderStatus(
        order.id,
        newDeliveryStatus,
        manualDatamartResponse,
        {
          delivery_status: newDeliveryStatus,
          payment_status: newPaymentStatus,
        }
      )) || order;

    // Explicitly sync agent order status
    await db.updateAgentOrderStatus(order.reference, newDeliveryStatus).catch(() => {});

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
