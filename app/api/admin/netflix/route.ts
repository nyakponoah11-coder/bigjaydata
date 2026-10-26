import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  getNetflixConfig,
  createNetflixOrder,
  fetchNetflixSignInCode,
  testNetflixConnection,
  fetchNetflixPartnerInfo,
} from "@/lib/netflix";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const [config, partnerInfo, allOrders] = await Promise.all([
      getNetflixConfig(),
      fetchNetflixPartnerInfo().catch(() => ({
        success: false,
        balance: 0,
        currency: "GHS",
        wholesalePrice: 15,
        partnerName: "Bigjay",
        availableAccounts: 0,
      })),
      db.getOrders(),
    ]);

    const netflixOrders = allOrders
      .filter((o) => o.service_type === "netflix" || (o.network || "").toLowerCase() === "netflix")
      .map((o) => ({
        ...o,
        service_type: "netflix",
      }));

    return NextResponse.json({
      success: true,
      config,
      balance: partnerInfo.balance,
      partner_name: partnerInfo.partnerName || "Bigjay",
      available_accounts: partnerInfo.availableAccounts,
      wholesale_cost: partnerInfo.wholesalePrice || 15,
      currency: partnerInfo.currency || "GHS",
      account_email: partnerInfo.accountEmail,
      orders: netflixOrders,
      orders_count: netflixOrders.length,
    });
  } catch (error: any) {
    console.error("[Admin Netflix GET Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load Netflix data." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: "Missing action." }, { status: 400 });
    }

    // 1. Update Netflix Configuration & Pricing
    if (action === "update_config") {
      const { netflix_enabled, netflix_api_key, netflix_price, netflix_agent_base_price, netflix_balance } = body;

      const updated = await db.updateSettings({
        netflix_enabled: netflix_enabled !== undefined ? Boolean(netflix_enabled) : undefined,
        netflix_api_key: netflix_api_key !== undefined ? String(netflix_api_key).trim() : undefined,
        netflix_price: netflix_price !== undefined ? Number(netflix_price) : undefined,
        netflix_agent_base_price: netflix_agent_base_price !== undefined ? Number(netflix_agent_base_price) : undefined,
        netflix_balance: netflix_balance !== undefined ? Math.max(0, Number(netflix_balance)) : undefined,
      });

      return NextResponse.json({
        success: true,
        message: "Netflix reseller settings and pricing updated successfully.",
        config: {
          netflix_enabled: updated.netflix_enabled,
          netflix_api_key: updated.netflix_api_key,
          netflix_price: updated.netflix_price,
          netflix_agent_base_price: updated.netflix_agent_base_price,
        },
      });
    }

    // 2. Test Data1 API Key Connection
    if (action === "test_connection") {
      const { api_key } = body;
      const result = await testNetflixConnection(api_key);
      return NextResponse.json(result);
    }

    // 3. Admin Fetch Sign-in Code
    if (action === "fetch_code") {
      const { reference } = body;
      if (!reference) {
        return NextResponse.json({ success: false, message: "Order reference is required." }, { status: 400 });
      }

      const result = await fetchNetflixSignInCode(reference);

      // If code was found, update order in db
      if (result.success && result.code) {
        const order = await db.getOrderByReference(reference);
        if (order) {
          await db.updateOrderStatus(order.id, "delivered", undefined, {
            netflix_code: result.code,
            netflix_code_fetched_at: new Date().toISOString(),
          });
        }
      }

      return NextResponse.json(result);
    }

    // 4. Admin Manual Direct Order Dispatch
    if (action === "manual_order") {
      const { customer_name, customer_phone, customer_email } = body;

      if (!customer_phone || !customer_email) {
        return NextResponse.json(
          { success: false, message: "Customer phone and email are required." },
          { status: 400 }
        );
      }

      const partner_reference = `BMGH-NF${Math.floor(10000000 + Math.random() * 90000000)}`;

      const apiResult = await createNetflixOrder({
        customer_name: customer_name || "Direct Customer",
        customer_phone,
        customer_email,
        partner_reference,
        duration_days: 30,
      });

      if (!apiResult.success) {
        return NextResponse.json(
          { success: false, message: apiResult.error || "Failed to create Netflix access." },
          { status: 400 }
        );
      }

      const order = await db.createOrder({
        reference: partner_reference,
        network: "netflix",
        package_size: "30 Days UHD",
        phone: customer_phone,
        amount: 0,
        paystack_ref: "ADMIN_DIRECT",
        payment_status: "paid",
        delivery_status: "delivered",
        status: "delivered",
        source: "admin_direct",
        customer_name: customer_name || "Direct Customer",
        customer_email,
        service_type: "netflix",
        netflix_email: apiResult.netflix_email,
        netflix_reference: apiResult.reference,
        duration_days: 30,
      });

      return NextResponse.json({
        success: true,
        message: "Netflix 30-Day access created successfully via Data1 partner gateway.",
        order,
        api_result: apiResult,
      });
    }

    return NextResponse.json({ success: false, message: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin Netflix POST Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Operation failed." },
      { status: 500 }
    );
  }
}
