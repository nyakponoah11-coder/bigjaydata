import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSuspensionEmail, sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
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
      const calculatedBalance = Number(Math.max(0, earned - withdrawn - pendingWithdrawn).toFixed(2));
      const balance = calculatedBalance;

      return {
        ...agent,
        total_earned: earned,
        total_withdrawn: withdrawn,
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

    if (action === "reset_all_finances") {
      await db.resetAllAgentFinances();
      return NextResponse.json({
        success: true,
        message: "All agent store accounts, test orders, and withdrawals have been successfully reset to GHS 0.00.",
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
