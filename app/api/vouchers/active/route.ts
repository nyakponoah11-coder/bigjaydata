import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const voucher = await db.getActiveVoucher();
    if (!voucher) {
      return NextResponse.json({ active: false, voucher: null });
    }

    // Return active voucher public info without exposing internal sensitive details if any
    return NextResponse.json({
      active: true,
      voucher: {
        id: voucher.id,
        tagline: voucher.tagline || "Free Data Giveaway!",
        network: voucher.network,
        package_size: voucher.package_size,
        remaining_claims: Math.max(0, voucher.max_claims - voucher.claimed_count),
        expires_at: voucher.expires_at || null,
      },
    });
  } catch (error: any) {
    console.error("Voucher Active GET error:", error);
    return NextResponse.json({ active: false, voucher: null });
  }
}
