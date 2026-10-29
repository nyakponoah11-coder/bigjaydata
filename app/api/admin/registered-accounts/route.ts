import { NextResponse } from "next/server";
import { db, Customer, isGenuineCustomer } from "@/lib/db";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;
  try {
    const [customers, orders, agentOrders, transactions, agents] = await Promise.all([
      db.getCustomers().catch(() => []),
      db.getOrders().catch(() => []),
      db.getAgentOrders().catch(() => []),
      db.getCustomerTransactions().catch(() => []),
      db.getAgents().catch(() => []),
    ]);

    // Build lookup for reseller agents
    const agentByPhone = new Map<string, any>();
    const agentByEmail = new Map<string, any>();
    for (const ag of agents) {
      const cleanP = String(ag.phone || "").replace(/[^0-9]/g, "");
      if (cleanP) agentByPhone.set(cleanP, ag);
      if (ag.email) agentByEmail.set(ag.email.toLowerCase().trim(), ag);
    }

    // Filter genuine customer accounts
    const genuineCustomers = customers.filter(
      (c) => isGenuineCustomer(c) && !String(c.id || "").startsWith("agent-")
    );

    // Map customer accounts
    const enrichedCustomers: any[] = genuineCustomers.map((c) => {
      const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, "") : "";
      const cleanEmail = c.email ? c.email.toLowerCase().trim() : "";
      const matchedAgent = agentByPhone.get(cleanPhone) || (cleanEmail ? agentByEmail.get(cleanEmail) : null);

      const customerOrders = orders.filter((o) => {
        if (o.customer_id && o.customer_id === c.id) return true;
        const oPhone = String(o.phone || "").replace(/[^0-9]/g, "");
        return (
          cleanPhone &&
          (oPhone === cleanPhone ||
            (cleanPhone.length >= 9 && oPhone.length >= 9 && oPhone.endsWith(cleanPhone.slice(-9))))
        );
      });

      const customerTxs = transactions.filter((t) => t.customer_id === c.id);
      const totalDeposits = customerTxs
        .filter((t) => t.type === "deposit" && t.status === "success")
        .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

      const totalSpent = customerTxs
        .filter((t) => t.type === "purchase" && t.status === "success")
        .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

      const { password_hash, ...safeCustomer } = c;

      return {
        ...safeCustomer,
        role: "customer",
        is_also_agent: Boolean(matchedAgent),
        agent_store_name: matchedAgent?.store_name || undefined,
        agent_store_slug: matchedAgent?.store_slug || undefined,
        wallet_balance: Number(c.wallet_balance || 0),
        total_orders: customerOrders.length,
        total_deposits: totalDeposits,
        total_spent: totalSpent,
        recent_transactions: customerTxs.slice(0, 10),
      };
    });

    // Check which agents are not already in customers list and include them with role="agent"
    const customerPhones = new Set(
      enrichedCustomers.map((c) => String(c.phone || "").replace(/[^0-9]/g, ""))
    );
    const customerEmails = new Set(
      enrichedCustomers.map((c) => String(c.email || "").toLowerCase().trim()).filter(Boolean)
    );

    for (const ag of agents) {
      const cleanP = String(ag.phone || "").replace(/[^0-9]/g, "");
      const cleanE = String(ag.email || "").toLowerCase().trim();

      const alreadyExists =
        (cleanP && customerPhones.has(cleanP)) || (cleanE && customerEmails.has(cleanE));

      if (!alreadyExists) {
        const agOrders = agentOrders.filter(
          (ao) => ao.agent_id === ag.id || ao.agent_id === ag.store_slug
        );

        enrichedCustomers.push({
          id: ag.id,
          name: ag.name,
          phone: ag.phone,
          email: ag.email,
          role: "agent",
          is_also_agent: false,
          store_name: ag.store_name,
          store_slug: ag.store_slug,
          wallet_balance: Number(ag.wallet_balance || 0),
          is_active: ag.is_active !== false,
          created_at: ag.created_at || new Date().toISOString(),
          total_orders: agOrders.length,
          total_deposits: 0,
          total_spent: 0,
          recent_transactions: [],
        });
      }
    }

    // Summary stats
    const totalAccounts = enrichedCustomers.length;
    const totalCustomers = enrichedCustomers.filter((c) => c.role === "customer").length;
    const totalAgents = enrichedCustomers.filter((c) => c.role === "agent" || c.is_also_agent).length;
    const activeAccounts = enrichedCustomers.filter((c) => c.is_active).length;
    const suspendedAccounts = totalAccounts - activeAccounts;

    const customerWalletFloat = enrichedCustomers
      .filter((c) => c.role === "customer")
      .reduce((sum, c) => sum + Number(c.wallet_balance || 0), 0);

    const agentWalletFloat = enrichedCustomers
      .filter((c) => c.role === "agent")
      .reduce((sum, c) => sum + Number(c.wallet_balance || 0), 0);

    const totalWalletFloat = customerWalletFloat + agentWalletFloat;

    return NextResponse.json({
      success: true,
      summary: {
        total_accounts: totalAccounts,
        total_customers: totalCustomers,
        total_agents: agents.length,
        active_accounts: activeAccounts,
        suspended_accounts: suspendedAccounts,
        customer_wallet_float: Number(customerWalletFloat.toFixed(2)),
        agent_wallet_float: Number(agentWalletFloat.toFixed(2)),
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
        { success: false, message: "Account ID is required." },
        { status: 400 }
      );
    }

    let customer = await db.getCustomerById(customer_id);
    let agent: any = await db.getAgentById(customer_id);

    if (!customer && !agent) {
      return NextResponse.json(
        { success: false, message: "Account not found." },
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

      if (agent && !customer) {
        const curBal = Number(agent.wallet_balance || 0);
        const newBal = Math.max(0, Number((curBal + numAmount).toFixed(2)));
        await db.updateAgent(agent.id, { wallet_balance: newBal });
        return NextResponse.json({
          success: true,
          message: `Successfully ${numAmount > 0 ? "credited" : "debited"} GHS ${Math.abs(numAmount).toFixed(2)} ${numAmount > 0 ? "to" : "from"} Agent ${agent.name}'s (${agent.store_name}) wallet.`,
          new_balance: newBal,
        });
      }

      if (numAmount > 0) {
        const result = await db.creditCustomerWallet(
          customer!.id,
          numAmount,
          ref,
          "ADMIN_ADJUSTMENT",
          `Admin Credit: ${note}`
        );
        return NextResponse.json({
          success: true,
          message: `Successfully credited GHS ${numAmount.toFixed(2)} to ${customer!.name}'s customer wallet.`,
          new_balance: result.new_balance,
        });
      } else {
        const debitAmount = Math.abs(numAmount);
        const result = await db.debitCustomerWallet(
          customer!.id,
          debitAmount,
          ref,
          `Admin Debit: ${note}`
        );
        return NextResponse.json({
          success: true,
          message: `Successfully deducted GHS ${debitAmount.toFixed(2)} from ${customer!.name}'s customer wallet.`,
          new_balance: result.new_balance,
        });
      }
    }

    // Action 2: Toggle Account Active/Suspended Status
    if (typeof is_active === "boolean") {
      if (agent) {
        await db.updateAgent(agent.id, { is_active });
      }
      if (customer) {
        await db.updateCustomer(customer.id, { is_active });
      }
      return NextResponse.json({
        success: true,
        message: `Account ${is_active ? "reactivated" : "suspended"} successfully.`,
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
        { success: false, message: "Account ID is required." },
        { status: 400 }
      );
    }

    const customer = await db.getCustomerById(customerId);
    const agent = await db.getAgentById(customerId);

    if (!customer && !agent) {
      return NextResponse.json(
        { success: false, message: "Account not found." },
        { status: 404 }
      );
    }

    if (customer) {
      await db.deleteCustomer(customer.id);
    }
    if (agent) {
      await db.deleteAgent(agent.id);
    }

    return NextResponse.json({
      success: true,
      message: `Account deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Admin delete customer error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}
