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

    const [config, partnerInfo, allOrders, partners] = await Promise.all([
      getNetflixConfig(),
      fetchNetflixPartnerInfo().catch(() => ({
        success: false,
        balance: 1,
        currency: "GHS",
        wholesalePrice: 1,
        partnerName: "Bigjay",
        availableAccounts: 1,
        accountEmail: "",
      })),
      db.getOrders(),
      db.getNetflixPartners(),
    ]);

    const netflixOrders = allOrders
      .filter((o) => o.service_type === "netflix" || (o.network || "").toLowerCase() === "netflix")
      .map((o) => ({
        ...o,
        service_type: "netflix",
      }));

    const effectiveBalance =
      partnerInfo.balance !== undefined && !isNaN(Number(partnerInfo.balance))
        ? Number(partnerInfo.balance)
        : Number(config.fallbackBalance || 1);

    const totalPartnerBalance = partners.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);
    const totalPartnerOrders = partners.reduce((sum, p) => sum + (Number(p.total_orders) || 0), 0);
    const totalPartnerSpent = partners.reduce((sum, p) => sum + (Number(p.total_spent) || 0), 0);

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        balance: effectiveBalance,
      },
      balance: effectiveBalance,
      partner_name: partnerInfo.partnerName || "Bigjay",
      available_accounts: Math.floor(effectiveBalance / (partnerInfo.wholesalePrice || 1)),
      wholesale_cost: partnerInfo.wholesalePrice || 1,
      currency: partnerInfo.currency || "GHS",
      account_email: partnerInfo.accountEmail,
      orders: netflixOrders,
      orders_count: netflixOrders.length,
      partners,
      partners_count: partners.length,
      total_partner_balance: Number(totalPartnerBalance.toFixed(2)),
      total_partner_orders: totalPartnerOrders,
      total_partner_spent: Number(totalPartnerSpent.toFixed(2)),
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

    // 1. Update Netflix Configuration & Pricing / Manual Balance
    if (action === "update_config" || action === "update_balance") {
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
        message: "Netflix reseller settings and balance updated successfully.",
        balance: updated.netflix_balance,
        config: {
          netflix_enabled: updated.netflix_enabled,
          netflix_api_key: updated.netflix_api_key,
          netflix_price: updated.netflix_price,
          netflix_agent_base_price: updated.netflix_agent_base_price,
          netflix_balance: updated.netflix_balance,
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

      const order = await db.getOrderByReference(reference);
      const targetRef = order?.netflix_reference || reference;
      const result = await fetchNetflixSignInCode(targetRef);

      // If code was found, update order in db
      if (result.success && result.code) {
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

    // 5. Create Netflix Partner Account
    if (action === "create_partner") {
      const { name, email, phone, base_price, initial_balance, notes } = body;
      if (!name || !email || !phone) {
        return NextResponse.json(
          { success: false, message: "Partner name, email, and phone number are required." },
          { status: 400 }
        );
      }

      const newPartner = await db.createNetflixPartner({
        name: String(name).trim(),
        email: String(email).trim(),
        phone: String(phone).trim(),
        base_price: base_price !== undefined ? Number(base_price) : undefined,
        initial_balance: initial_balance !== undefined ? Number(initial_balance) : 0,
        notes: notes ? String(notes).trim() : "",
      });

      return NextResponse.json({
        success: true,
        message: `Netflix partner account created for ${newPartner.name}.`,
        partner: newPartner,
      });
    }

    // 6. Credit Partner Account
    if (action === "credit_partner") {
      const { partner_id, amount, note } = body;
      if (!partner_id || amount === undefined) {
        return NextResponse.json(
          { success: false, message: "Missing partner ID or credit amount." },
          { status: 400 }
        );
      }

      const res = await db.creditNetflixPartner(partner_id, Number(amount), note);
      return NextResponse.json(res);
    }

    // 7. Deduct Partner Account
    if (action === "deduct_partner") {
      const { partner_id, amount, note } = body;
      if (!partner_id || amount === undefined) {
        return NextResponse.json(
          { success: false, message: "Missing partner ID or deduction amount." },
          { status: 400 }
        );
      }

      const res = await db.deductNetflixPartner(partner_id, Number(amount), note);
      return NextResponse.json(res);
    }

    // 8. Delete Partner Account
    if (action === "delete_partner") {
      const { partner_id } = body;
      if (!partner_id) {
        return NextResponse.json(
          { success: false, message: "Missing partner ID." },
          { status: 400 }
        );
      }

      await db.deleteNetflixPartner(partner_id);
      return NextResponse.json({
        success: true,
        message: "Partner account successfully deleted.",
      });
    }

    // 9. Toggle Partner Status (Active / Suspended)
    if (action === "toggle_partner") {
      const { partner_id } = body;
      if (!partner_id) {
        return NextResponse.json({ success: false, message: "Missing partner ID." }, { status: 400 });
      }

      const partner = await db.getNetflixPartnerById(partner_id);
      if (!partner) {
        return NextResponse.json({ success: false, message: "Partner not found." }, { status: 404 });
      }

      const updated = await db.updateNetflixPartner(partner_id, { is_active: !partner.is_active });
      return NextResponse.json({
        success: true,
        message: `Partner account has been ${updated?.is_active ? "activated" : "suspended"}.`,
        partner: updated,
      });
    }

    // 10. Update Partner Base Price
    if (action === "update_partner_price") {
      const { partner_id, base_price, notes } = body;
      if (!partner_id || base_price === undefined) {
        return NextResponse.json(
          { success: false, message: "Missing partner ID or base price." },
          { status: 400 }
        );
      }

      const numPrice = Number(base_price);
      if (isNaN(numPrice) || numPrice < 0) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid base price." },
          { status: 400 }
        );
      }

      const updated = await db.updateNetflixPartner(partner_id, {
        base_price: numPrice,
        notes: notes !== undefined ? String(notes) : undefined,
      });

      return NextResponse.json({
        success: true,
        message: `Partner wholesale base price updated to GH₵ ${numPrice.toFixed(2)}.`,
        partner: updated,
      });
    }

    // 11. Regenerate Partner API Key
    if (action === "regenerate_partner_key") {
      const { partner_id } = body;
      if (!partner_id) {
        return NextResponse.json({ success: false, message: "Missing partner ID." }, { status: 400 });
      }

      const rawRandom = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      const newKey = `d1_nf_live_${rawRandom}`;
      const updated = await db.updateNetflixPartner(partner_id, { api_key: newKey });

      return NextResponse.json({
        success: true,
        message: "New partner API key generated successfully.",
        partner: updated,
        new_key: newKey,
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
