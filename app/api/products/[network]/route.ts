import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ network: string }> }
) {
  try {
    const { network } = await params;
    const products = await db.getProducts(network);
    return NextResponse.json({
      success: true,
      network,
      products,
      cached: true,
      source: "bigjdb_cache",
    }, {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
        "X-Cache-Source": "bigjdb-memory",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}
