import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchNetflixSignInCode, createNetflixOrder } from "@/lib/netflix";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, order_id } = body;

    if (!reference && !order_id) {
      return NextResponse.json(
        { success: false, message: "Order reference is required." },
        { status: 400 }
      );
    }

    // Lookup order by internal reference or id
    let order = reference ? await db.getOrderByReference(reference) : null;
    if (!order && order_id) {
      const all = await db.getOrders();
      order = all.find((o) => o.id === order_id) || null;
    }

    let targetRef = order?.netflix_reference;

    // If order has no Data1 netflix_reference (starts with NF-P), auto-provision it now
    if (!targetRef || !targetRef.startsWith("NF-P")) {
      console.log(`[Customer Netflix Fetch-Code] Order ${order?.reference || reference} missing Data1 reference. Auto-provisioning...`);
      const createRes = await createNetflixOrder({
        customer_name: order?.customer_name || "Customer",
        customer_phone: order?.phone || "0541234567",
        customer_email: order?.customer_email || `${order?.phone || "customer"}@bundlemartgh.com`,
        partner_reference: order?.reference || reference,
        duration_days: 30,
      });

      if (createRes.success && createRes.reference) {
        targetRef = createRes.reference;
        if (order) {
          await db.updateOrderStatus(order.id, "delivered", createRes.raw || createRes, {
            delivery_status: "delivered",
            netflix_email: createRes.netflix_email,
            netflix_reference: createRes.reference,
            service_type: "netflix",
            duration_days: 30,
          });
        }
      }
    }

    const effectiveRef = (targetRef || reference || order?.reference || "").trim();
    if (!effectiveRef) {
      return NextResponse.json(
        { success: false, message: "Order reference is required." },
        { status: 400 }
      );
    }

    let result = await fetchNetflixSignInCode(effectiveRef);

    // If Data1 reported order not found, attempt auto-provisioning and retry
    if (!result.success && result.error?.toLowerCase().includes("not found")) {
      console.log(`[Customer Netflix Fetch-Code] Data1 reported not found for ${targetRef}. Attempting auto-provision...`);
      const createRes = await createNetflixOrder({
        customer_name: order?.customer_name || "Customer",
        customer_phone: order?.phone || "0541234567",
        customer_email: order?.customer_email || `${order?.phone || "customer"}@bundlemartgh.com`,
        partner_reference: order?.reference || reference,
        duration_days: 30,
      });

      if (createRes.success && createRes.reference) {
        targetRef = createRes.reference;
        if (order) {
          await db.updateOrderStatus(order.id, "delivered", createRes.raw || createRes, {
            delivery_status: "delivered",
            netflix_email: createRes.netflix_email,
            netflix_reference: createRes.reference,
            service_type: "netflix",
            duration_days: 30,
          });
        }
        result = await fetchNetflixSignInCode(targetRef);
      }
    }

    if (result.success && result.code && order) {
      // Save code to order record in database
      await db.updateOrderStatus(order.id, "delivered", undefined, {
        netflix_code: result.code,
        netflix_code_fetched_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Customer Netflix Fetch-Code Error]:", error);
    return NextResponse.json(
      { success: false, status: "error", error: error?.message || "Failed to fetch sign-in code." },
      { status: 500 }
    );
  }
}
