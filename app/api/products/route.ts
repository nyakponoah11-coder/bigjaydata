import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get("network");
    const products = await db.getProducts(network || undefined);
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch products" },
      { status: 500 }
    );
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

    const newProduct = await db.addProduct({
      network: network.toLowerCase(),
      size,
      price: Number(price),
      cost_price: Number(cost_price || 0),
      is_active: is_active !== false,
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to add product" },
      { status: 500 }
    );
  }
}
