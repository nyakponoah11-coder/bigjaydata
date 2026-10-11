import { NextResponse } from "next/server";
import { fetchDeliveryTracker } from "@/lib/datamart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const trackerData = await fetchDeliveryTracker();
    return NextResponse.json(trackerData, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    console.error("[API /delivery-tracker] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error?.message || "Failed to retrieve delivery tracker",
      },
      { status: 500 }
    );
  }
}
