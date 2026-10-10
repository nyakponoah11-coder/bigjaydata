import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [config, baseProducts, agents, withdrawals, orders] = await Promise.all([
      db.getAgentStoreConfig(),
      db.getAgentBaseProducts(),
      db.getAgents(),
      db.getAgentWithdrawals(),
      db.getAgentOrders(),
    ]);

    return NextResponse.json({
      success: true,
      config,
      baseProducts,
      agents,
      withdrawals,
      orders,
    });
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
      const updatedConfig = await db.updateAgentStoreConfig({
        ...(is_enabled !== undefined ? { is_enabled: Boolean(is_enabled) } : {}),
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
      return NextResponse.json({ success: true, agent: updatedAgent });
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
