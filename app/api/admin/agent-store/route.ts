import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSuspensionEmail, sendPasswordResetEmail } from "@/lib/email";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("reset_all") === "1" || searchParams.get("reset_all_finances") === "true") {
      await db.resetAllAgentFinances();
    }

    const [config, baseProducts, agents, withdrawals, orders] = await Promise.all([
      db.getAgentStoreConfig(),
      db.getAgentBaseProducts(),
      db.getAgents(),
      db.getAgentWithdrawals(),
      db.getAgentOrders(),
    ]);

    const isPaid = (o: any) => {
      const ps = (o.payment_status || "").toLowerCase().trim();
      const s = (o.status || "").toLowerCase().trim();
      const ds = (o.delivery_status || "").toLowerCase().trim();
      if (
        ps === "failed" ||
        ps === "cancelled" ||
        ps === "refunded" ||
        s === "cancelled" ||
        s === "refunded"
      ) {
        return false;
      }
      return (
        ps === "paid" ||
        ps === "completed" ||
        ps === "success" ||
        s === "delivered" ||
        s === "completed" ||
        ds === "delivered" ||
        ds === "completed" ||
        ds === "processing" ||
        s === "processing"
      );
    };

    const synchronizedAgents = agents.map((agent) => {
      const agentOrders = orders.filter(
        (o) => (o.agent_id === agent.id || o.agent_id === agent.store_slug) && isPaid(o)
      );
      const earned = Number(agentOrders.reduce((sum, o) => sum + (Number(o.agent_profit) || 0), 0).toFixed(2));
      const agentWithdrawals = withdrawals.filter(
        (w) => (w.agent_id === agent.id || w.agent_id === agent.store_slug) && w.status === "completed"
      );
      const withdrawn = Number(agentWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0).toFixed(2));
      const pendingWithdrawals = withdrawals.filter(
        (w) => (w.agent_id === agent.id || w.agent_id === agent.store_slug) && w.status === "pending" && Number(w.amount) <= earned
      );
      const pendingWithdrawn = Number(pendingWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0).toFixed(2));
      const storedBalance = Number(agent.wallet_balance || 0);
      const calculatedBalance = Number(Math.max(0, earned - withdrawn - pendingWithdrawn).toFixed(2));
      const balance = Math.max(storedBalance, calculatedBalance);

      return {
        ...agent,
        total_earned: Math.max(Number(agent.total_earned || 0), earned),
        total_withdrawn: Math.max(Number(agent.total_withdrawn || 0), withdrawn),
        wallet_balance: balance,
      };
    });

    return NextResponse.json(
      {
        success: true,
        config,
        baseProducts,
        agents: synchronizedAgents,
        withdrawals,
        orders,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("[Admin Agent Store API] GET error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load agent store data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "update_config") {
      const { is_enabled, registration_fee } = body;
      const currentConfig = await db.getAgentStoreConfig();

      if (is_enabled === true && currentConfig.developer_master_enabled === false) {
        return NextResponse.json(
          {
            success: false,
            message: "Master Key Locked: The Agent Store is locked by the Developer Master Key. The admin cannot enable it until unlocked by the developer.",
          },
          { status: 403 }
        );
      }

      const updatedConfig = await db.updateAgentStoreConfig({
        ...(is_enabled !== undefined ? { admin_enabled: Boolean(is_enabled) } : {}),
        ...(registration_fee !== undefined ? { registration_fee: Number(registration_fee) } : {}),
      });
      return NextResponse.json({ success: true, config: updatedConfig });
    }

    if (action === "toggle_agent") {
      const { agent_id, is_active } = body;
      if (!agent_id) {
        return NextResponse.json({ success: false, message: "Agent ID is required" }, { status: 400 });
      }

      const updatedAgent = await db.updateAgent(agent_id, { is_active: Boolean(is_active) });
      if (updatedAgent) {
        // Send email notification to the agent about account status change
        try {
          await sendSuspensionEmail(updatedAgent.email, updatedAgent.name, !Boolean(is_active));
        } catch (mailErr) {
          console.warn("[Admin] Suspension email warning:", mailErr);
        }
      }

      return NextResponse.json({
        success: true,
        agent: updatedAgent,
        message: Boolean(is_active) ? "Agent account activated" : "Agent account suspended",
      });
    }

    if (action === "delete_agent") {
      const { agent_id } = body;
      if (!agent_id) {
        return NextResponse.json({ success: false, message: "Agent ID is required" }, { status: 400 });
      }

      const agent = await db.getAgentById(agent_id);
      if (!agent) {
        return NextResponse.json({ success: false, message: "Agent not found" }, { status: 404 });
      }

      await db.deleteAgent(agent_id);
      return NextResponse.json({
        success: true,
        message: `Agent "${agent.name}" (${agent.store_name}) deleted permanently.`,
      });
    }

    if (action === "reset_password") {
      const { agent_id, new_password } = body;
      if (!agent_id) {
        return NextResponse.json({ success: false, message: "Agent ID is required" }, { status: 400 });
      }

      const agent = await db.getAgentById(agent_id);
      if (!agent) {
        return NextResponse.json({ success: false, message: "Agent not found" }, { status: 404 });
      }

      // Generate clean 6-digit PIN if none specified
      const finalPassword = new_password && String(new_password).trim().length >= 4
        ? String(new_password).trim()
        : Math.floor(100000 + Math.random() * 900000).toString();

      await db.updateAgent(agent_id, { password_hash: finalPassword });

      // Dispatch email to agent's registered email
      await sendPasswordResetEmail(agent.email, agent.name, finalPassword, true);

      return NextResponse.json({
        success: true,
        new_password: finalPassword,
        message: `Password reset successfully and dispatched to ${agent.email}.`,
      });
    }

    if (action === "reset_finances") {
      const { agent_id } = body;
      if (!agent_id) {
        return NextResponse.json({ success: false, message: "Agent ID is required" }, { status: 400 });
      }

      await db.resetAgentFinances(agent_id);
      return NextResponse.json({
        success: true,
        message: "Agent test orders, withdrawals, and balances successfully reset to GHS 0.00.",
      });
    }

    if (action === "create_agent") {
      const { name, store_name, store_slug, email, phone, momo_number, momo_network, password, initial_balance } = body;
      if (!name || !store_name || !phone) {
        return NextResponse.json({ success: false, message: "Agent name, store name, and phone are required." }, { status: 400 });
      }

      const cleanPhone = String(phone).replace(/[^0-9]/g, "");
      const cleanEmail = email ? String(email).trim().toLowerCase() : `${cleanPhone}@bundlemartgh.com`;

      let baseSlug = (store_slug || store_name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (!baseSlug) baseSlug = "store-" + Math.floor(1000 + Math.random() * 9000);

      const existingSlug = await db.getAgentBySlug(baseSlug);
      if (existingSlug) {
        baseSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;
      }

      const newAgent = await db.createAgent({
        name: name.trim(),
        store_name: store_name.trim(),
        store_slug: baseSlug,
        email: cleanEmail,
        phone: cleanPhone,
        momo_number: momo_number ? String(momo_number).replace(/[^0-9]/g, "") : cleanPhone,
        momo_network: momo_network || "MTN",
        password_hash: password ? String(password).trim() : "123456",
        wallet_balance: Math.max(0, Number(initial_balance || 0)),
        is_active: true,
        registration_paid: true,
      });

      return NextResponse.json({
        success: true,
        agent: newAgent,
        message: `Agent "${newAgent.name}" (${newAgent.store_name}) registered successfully! Store link: /${newAgent.store_slug}`,
      });
    }

    if (action === "adjust_wallet") {
      const { agent_id, amount, reason } = body;
      if (!agent_id) {
        return NextResponse.json({ success: false, message: "Agent ID is required." }, { status: 400 });
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount === 0) {
        return NextResponse.json({ success: false, message: "Please provide a valid non-zero adjustment amount." }, { status: 400 });
      }

      const agent = await db.getAgentById(agent_id);
      if (!agent) {
        return NextResponse.json({ success: false, message: "Agent not found." }, { status: 404 });
      }

      const curBal = Number(agent.wallet_balance || 0);
      const newBal = Math.max(0, Number((curBal + numAmount).toFixed(2)));
      await db.updateAgent(agent.id, { wallet_balance: newBal });

      return NextResponse.json({
        success: true,
        message: `Successfully ${numAmount > 0 ? "credited" : "debited"} GHS ${Math.abs(numAmount).toFixed(2)} ${numAmount > 0 ? "to" : "from"} ${agent.name}'s (${agent.store_name}) wallet. New balance: GHS ${newBal.toFixed(2)}`,
        new_balance: newBal,
      });
    }

    if (action === "recover_agents") {
      const result = await db.recoverAllAgents();
      return NextResponse.json({
        success: true,
        message: result.recovered_count > 0
          ? `Successfully retrieved and restored ${result.recovered_count} agent account(s) from database history!`
          : "Database deep scan completed. All registered agents in system tables are already loaded and up to date.",
        recovered_count: result.recovered_count,
        recovered_agents: result.recovered,
        sources: result.sources,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin Agent Store API] POST error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update" },
      { status: 500 }
    );
  }
}
