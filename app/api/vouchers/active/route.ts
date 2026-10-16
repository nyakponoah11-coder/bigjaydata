import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const vouchers = await db.getVouchers();
    const now = new Date();
    const activeVouchers = (vouchers || []).filter((v) => {
      if (!v.is_active || v.claimed_count >= v.max_claims) return false;
      if (v.expires_at && new Date(v.expires_at) < now) return false;
      return true;
    });

    if (activeVouchers.length === 0) {
      return NextResponse.json(
        { active: false, voucher: null },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
          },
        }
      );
    }

    const first = activeVouchers[0];
    const totalRemaining = activeVouchers.reduce(
      (sum, v) => sum + Math.max(0, v.max_claims - v.claimed_count),
      0
    );

    return NextResponse.json(
      {
        active: true,
        voucher: {
          id: first.id,
          tagline: first.tagline || "Free Data Giveaway!",
          network: first.network,
          package_size: first.package_size,
          remaining_claims: totalRemaining,
          active_codes_count: activeVouchers.length,
          expires_at: first.expires_at || null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error: any) {
    console.error("Voucher Active GET error:", error);
    return NextResponse.json({ active: false, voucher: null });
  }
}
