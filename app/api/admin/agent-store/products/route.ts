import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { network, size, base_price, suggested_price, is_active } = body;

    if (!network || !size || base_price === undefined) {
      return NextResponse.json(
        { success: false, message: "Network, package size, and base price are required" },
        { status: 400 }
      );
    }

    const newProduct = await db.createAgentBaseProduct({
      network: network.toLowerCase().trim(),
      size: size.trim(),
      base_price: Number(base_price),
      suggested_price: suggested_price ? Number(suggested_price) : Number(base_price) + 1.0,
      is_active: is_active !== false,
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create base product" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    const updated = await db.updateAgentBaseProduct(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update base product" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    const deleted = await db.deleteAgentBaseProduct(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete base product" },
      { status: 500 }
    );
  }
}
