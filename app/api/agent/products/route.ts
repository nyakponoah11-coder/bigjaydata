import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agent_id");

    if (!agentId) {
      return NextResponse.json({ success: false, message: "Agent ID is required" }, { status: 400 });
    }

    const products = await db.getAgentProducts(agentId);
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { agent_id, base_product_id, selling_price, is_active } = body;

    if (!agent_id || !base_product_id) {
      return NextResponse.json(
        { success: false, message: "Agent ID and base product ID are required" },
        { status: 400 }
      );
    }

    const updated = await db.updateAgentProduct(
      agent_id,
      base_product_id,
      Number(selling_price),
      is_active !== false
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
