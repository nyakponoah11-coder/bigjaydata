import { NextResponse } from "next/server";
import { fetchDeliveryTracker } from "@/lib/datamart";

export const revalidate = 300; // 5 minutes Edge CDN cache

export async function GET() {
  try {
    const trackerData = await fetchDeliveryTracker();
    return NextResponse.json(trackerData, {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
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
