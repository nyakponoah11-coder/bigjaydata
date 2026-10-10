import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agent_id");
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!agentId) {
      return NextResponse.json({ success: false, message: "Agent ID is required" }, { status: 400 });
    }

    let orders = await db.getAgentOrders(agentId);

    if (date) {
      orders = orders.filter((o) => {
        if (!o.created_at) return false;
        const orderDate = new Date(o.created_at).toISOString().split("T")[0];
        return orderDate === date;
      });
    }

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
