import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const [config, products, accounts, allOrders] = await Promise.all([
      db.getDeveloperApiConfig(),
      db.getDeveloperApiProducts(),
      db.getDeveloperAccounts(),
      db.getOrders(),
    ]);

    const apiOrders = allOrders.filter((o) => o.source === "api" || !!o.api_key_id);

    return NextResponse.json({
      success: true,
      config,
      products,
      accounts,
      orders_count: apiOrders.length,
      recent_orders: apiOrders.slice(0, 50),
    });
  } catch (error: any) {
    console.error("[Admin Developer GET Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load developer data." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: "Missing action." }, { status: 400 });
    }

    // 1. Update master configuration (Master switch ON/OFF, API key price, etc.)
    if (action === "update_config") {
      const { is_enabled, api_key_price, min_wallet_funding, notice_message } = body;
      const updated = await db.updateDeveloperApiConfig({
        is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : undefined,
        api_key_price: api_key_price !== undefined ? Number(api_key_price) : undefined,
        min_wallet_funding: min_wallet_funding !== undefined ? Number(min_wallet_funding) : undefined,
        notice_message: notice_message !== undefined ? String(notice_message) : undefined,
      });
      return NextResponse.json({ success: true, message: "Developer API configuration updated.", config: updated });
    }

    // 2. Update API product price
    if (action === "update_product_price") {
      const { id, api_price, cost_price } = body;
      if (!id || api_price === undefined) {
        return NextResponse.json({ success: false, message: "Missing product ID or price." }, { status: 400 });
      }
      const updated = await db.updateDeveloperApiProductPrice(id, Number(api_price), cost_price !== undefined ? Number(cost_price) : undefined);
      return NextResponse.json({ success: true, message: "Product price updated.", product: updated });
    }

    // 3. Toggle product active status
    if (action === "toggle_product") {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, message: "Missing product ID." }, { status: 400 });
      const updated = await db.toggleDeveloperApiProduct(id);
      return NextResponse.json({ success: true, message: "Product status toggled.", product: updated });
    }

    // 4. Create new product
    if (action === "create_product") {
      const { network, size, cost_price, api_price } = body;
      if (!network || !size || api_price === undefined) {
        return NextResponse.json({ success: false, message: "Missing product details." }, { status: 400 });
      }
      const created = await db.createDeveloperApiProduct({
        network: String(network).toLowerCase().trim(),
        size: String(size).trim(),
        cost_price: Number(cost_price || 0),
        api_price: Number(api_price),
        is_active: true,
      });
      return NextResponse.json({ success: true, message: "Product created.", product: created });
    }

    // 5. Delete product
    if (action === "delete_product") {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, message: "Missing product ID." }, { status: 400 });
      await db.deleteDeveloperApiProduct(id);
      return NextResponse.json({ success: true, message: "Product deleted." });
    }

    // 6. Fund or debit developer wallet
    if (action === "credit_wallet") {
      const { account_id, amount, note } = body;
      if (!account_id || amount === undefined) {
        return NextResponse.json({ success: false, message: "Missing account ID or amount." }, { status: 400 });
      }
      const res = await db.creditDeveloperWallet(account_id, Number(amount), note);
      return NextResponse.json(res);
    }

    // 7. Toggle developer active/suspended
    if (action === "toggle_account") {
      const { account_id } = body;
      if (!account_id) return NextResponse.json({ success: false, message: "Missing account ID." }, { status: 400 });
      const acc = await db.getDeveloperAccountById(account_id);
      if (!acc) return NextResponse.json({ success: false, message: "Account not found." }, { status: 404 });
      const updated = await db.updateDeveloperAccount(account_id, { is_active: !acc.is_active });
      return NextResponse.json({ success: true, message: `Account ${updated?.is_active ? "activated" : "suspended"}.`, account: updated });
    }

    // 8. Delete developer account
    if (action === "delete_account") {
      const { account_id } = body;
      if (!account_id) return NextResponse.json({ success: false, message: "Missing account ID." }, { status: 400 });
      await db.deleteDeveloperAccount(account_id);
      return NextResponse.json({ success: true, message: "Developer account deleted." });
    }

    return NextResponse.json({ success: false, message: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin Developer POST Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Operation failed." },
      { status: 500 }
    );
  }
}
