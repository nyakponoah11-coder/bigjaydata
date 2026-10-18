import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 60;

export async function GET() {
  try {
    const voucher = await db.getActiveVoucher();

    if (!voucher) {
      return NextResponse.json(
        { active: false, voucher: null },
        {
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=240",
          },
        }
      );
    }

    return NextResponse.json(
      {
        active: true,
        voucher: {
          id: voucher.id,
          tagline: voucher.tagline || "Free Data Giveaway!",
          network: voucher.network,
          package_size: voucher.package_size,
          remaining_claims: Math.max(0, voucher.max_claims - voucher.claimed_count),
          active_codes_count: 1,
          expires_at: voucher.expires_at || null,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=240",
        },
      }
    );
  } catch (error: any) {
    console.error("Voucher Active GET error:", error);
    return NextResponse.json({ active: false, voucher: null });
  }
}
