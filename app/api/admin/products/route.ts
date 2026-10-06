import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const products = await db.getProducts();
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { network, size, price, cost_price, is_active } = body;

    if (!network || !size || price === undefined) {
      return NextResponse.json(
        { success: false, message: "Network, size, and price are required" },
        { status: 400 }
      );
    }

    const created = await db.addProduct({
      network: network.trim().toLowerCase(),
      size: size.trim(),
      price: Number(price),
      cost_price: Number(cost_price || 0),
      is_active: is_active !== false,
    });

    return NextResponse.json({ success: true, product: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.cost_price !== undefined) updates.cost_price = Number(updates.cost_price);
    if (updates.network) updates.network = updates.network.trim().toLowerCase();
    if (updates.size) updates.size = updates.size.trim();

    const updated = await db.updateProduct(id, updates);
    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    const deleted = await db.deleteProduct(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
