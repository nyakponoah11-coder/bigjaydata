import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ network: string }> }
) {
  try {
    const { network } = await params;
    const products = await db.getProducts(network);
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}
