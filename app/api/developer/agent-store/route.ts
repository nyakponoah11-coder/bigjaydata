import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID_PASSKEYS = ["stony2026", "developer2026", "bigj2026", "bundlemart2026"];

export async function GET() {
  try {
    const config = await db.getAgentStoreConfig();
    const agents = await db.getAgents();
    const orders = await db.getAgentOrders();
    return NextResponse.json({
      success: true,
      is_enabled: config.is_enabled,
      stats: {
        total_agents: agents.length,
        total_orders: orders.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passkey, is_enabled } = body;

    const inputKey = passkey ? String(passkey).trim() : "";
    const envPass = process.env.ADMIN_PASSWORD?.trim();
    const valid = Array.from(new Set(VALID_PASSKEYS.concat(envPass ? [envPass] : [])));

    if (!valid.includes(inputKey)) {
      return NextResponse.json(
        { success: false, message: "Invalid developer passkey" },
        { status: 401 }
      );
    }

    const updated = await db.updateAgentStoreConfig({ is_enabled: Boolean(is_enabled) });
    return NextResponse.json({
      success: true,
      is_enabled: updated.is_enabled,
      message: updated.is_enabled
        ? "Agent Store is now ONLINE and fully operational."
        : "Agent Store is now OFFLINE and showing 'Coming Soon' across the website.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
