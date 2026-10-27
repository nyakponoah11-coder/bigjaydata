import { NextResponse } from "next/server";
import { db, Customer, isGenuineCustomer } from "@/lib/db";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;
  try {
    const [customers, orders, transactions] = await Promise.all([
      db.getCustomers().catch(() => []),
      db.getOrders().catch(() => []),
      db.getCustomerTransactions().catch(() => []),
    ]);

    // Include all customer accounts and cross-sync all registered agents
    const allCustomers: Customer[] = [...customers];
    const existingPhones = new Set(allCustomers.map((c) => String(c.phone || "").replace(/[^0-9]/g, "")));
    const agents = await db.getAgents().catch(() => []);
    for (const ag of agents) {
      const cleanP = String(ag.phone || "").replace(/[^0-9]/g, "");
      if (cleanP && !existingPhones.has(cleanP)) {
        allCustomers.push({
          id: ag.id,
          name: ag.name,
          phone: ag.phone,
          email: ag.email,
          wallet_balance: Number(ag.wallet_balance || 0),
          is_active: ag.is_active !== false,
          is_verified: true,
          created_at: ag.created_at || new Date().toISOString(),
        } as Customer);
        existingPhones.add(cleanP);
      }
    }

    const registeredOnly = allCustomers.filter((c) => isGenuineCustomer(c));

    // Map order counts and metrics per customer
    const enrichedCustomers = registeredOnly.map((c) => {
      const cleanPhone = c.phone.replace(/[^0-9]/g, "");
      const customerOrders = orders.filter((o) => {
        if (o.customer_id && o.customer_id === c.id) return true;
        const oPhone = String(o.phone || "").replace(/[^0-9]/g, "");
        return (
          oPhone === cleanPhone ||
          (cleanPhone.length >= 9 && oPhone.length >= 9 && oPhone.endsWith(cleanPhone.slice(-9)))
        );
      });

      const customerTxs = transactions.filter((t) => t.customer_id === c.id);
      const totalDeposits = customerTxs
        .filter((t) => t.type === "deposit" && t.status === "success")
        .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

      const totalSpent = customerTxs
        .filter((t) => t.type === "purchase" && t.status === "success")
        .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

      // Safe customer object without password hash
      const { password_hash, ...safeCustomer } = c;

      return {
        ...safeCustomer,
        wallet_balance: Number(c.wallet_balance || 0),
        total_orders: customerOrders.length,
        total_deposits: totalDeposits,
        total_spent: totalSpent,
        recent_transactions: customerTxs.slice(0, 10),
      };
    });

    // Summary stats
    const totalCustomers = enrichedCustomers.length;
    const activeCustomers = enrichedCustomers.filter((c) => c.is_active).length;
    const suspendedCustomers = totalCustomers - activeCustomers;
    const totalWalletFloat = enrichedCustomers.reduce(
      (sum, c) => sum + Number(c.wallet_balance || 0),
      0
    );

    return NextResponse.json({
      success: true,
      summary: {
        total_customers: totalCustomers,
        active_customers: activeCustomers,
        suspended_customers: suspendedCustomers,
        total_wallet_float: Number(totalWalletFloat.toFixed(2)),
      },
      customers: enrichedCustomers,
    });
  } catch (error: any) {
    console.error("Failed to load registered accounts:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load registered accounts." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { customer_id, action, amount, reason, is_active } = body;

    // Action 0: Purge Unverified Guest Placeholders from Supabase customers table
    if (action === "purge_guest_leads") {
      const purgeResult = await db.purgeUnverifiedGuestCustomers();
      return NextResponse.json({
        success: true,
        message: purgeResult.message,
        purged_count: purgeResult.count,
      });
    }

    if (!customer_id) {
      return NextResponse.json(
        { success: false, message: "Customer ID is required." },
        { status: 400 }
      );
    }

    const customer = await db.getCustomerById(customer_id);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account not found." },
        { status: 404 }
      );
    }

    // Action 1: Adjust Wallet Balance (Admin Top-up or Correction)
    if (action === "adjust_wallet") {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount === 0) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid non-zero adjustment amount." },
          { status: 400 }
        );
      }

      const note = reason?.trim() || "Manual Admin Adjustment";
      const ref = `BMGH-ADJ-${Math.floor(100000 + Math.random() * 900000)}`;

      if (numAmount > 0) {
        const result = await db.creditCustomerWallet(
          customer.id,
          numAmount,
          ref,
          "ADMIN_ADJUSTMENT",
          `Admin Credit: ${note}`
        );
        return NextResponse.json({
          success: true,
          message: `Successfully credited GHS ${numAmount.toFixed(2)} to ${customer.name}'s wallet.`,
          new_balance: result.new_balance,
        });
      } else {
        const debitAmount = Math.abs(numAmount);
        const result = await db.debitCustomerWallet(
          customer.id,
          debitAmount,
          ref,
          `Admin Debit: ${note}`
        );
        return NextResponse.json({
          success: true,
          message: `Successfully deducted GHS ${debitAmount.toFixed(2)} from ${customer.name}'s wallet.`,
          new_balance: result.new_balance,
        });
      }
    }

    // Action 2: Toggle Account Active/Suspended Status
    if (typeof is_active === "boolean") {
      const updated = await db.updateCustomer(customer_id, { is_active });
      return NextResponse.json({
        success: true,
        message: `Customer account ${is_active ? "activated" : "suspended"} successfully.`,
        customer: updated,
      });
    }

    return NextResponse.json(
      { success: false, message: "No valid action requested." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Admin registered account action error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update account." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;
  try {
    const { searchParams } = new URL(req.url);
    let customerId = searchParams.get("customer_id") || searchParams.get("id");

    if (!customerId) {
      const body = await req.json().catch(() => ({}));
      customerId = body.customer_id || body.id;
    }

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Customer ID is required." },
        { status: 400 }
      );
    }

    const existing = await db.getCustomerById(customerId);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Customer account not found." },
        { status: 404 }
      );
    }

    await db.deleteCustomer(customerId);

    return NextResponse.json({
      success: true,
      message: `Account for ${existing.name || existing.phone} deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Admin delete customer error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete customer account." },
      { status: 500 }
    );
  }
}
