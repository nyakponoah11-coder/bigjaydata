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
    return NextResponse.json(
      { success: true, products },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { agent_id, base_product_id, selling_price, is_active, products } = body;

    if (!agent_id) {
      return NextResponse.json(
        { success: false, message: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Support batch update
    if (Array.isArray(products) && products.length > 0) {
      const updatedList = await db.updateAgentProductsBatch(agent_id, products);
      return NextResponse.json({ success: true, products: updatedList });
    }

    if (!base_product_id) {
      return NextResponse.json(
        { success: false, message: "Base product ID or products array is required" },
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let agent_id = searchParams.get("agent_id");
    let base_product_id = searchParams.get("base_product_id") || searchParams.get("id");

    if (!agent_id || !base_product_id) {
      try {
        const body = await req.json();
        agent_id = agent_id || body.agent_id;
        base_product_id = base_product_id || body.base_product_id || body.id;
      } catch {}
    }

    if (!agent_id || !base_product_id) {
      return NextResponse.json(
        { success: false, message: "Agent ID and Base Product ID are required" },
        { status: 400 }
      );
    }

    const deleted = await db.deleteAgentProduct(agent_id, base_product_id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete agent product" },
      { status: 500 }
    );
  }
}
