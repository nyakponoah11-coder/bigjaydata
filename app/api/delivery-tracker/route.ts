import { NextResponse } from "next/server";
import { fetchDeliveryTracker } from "@/lib/datamart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const trackerData = await fetchDeliveryTracker();
    return NextResponse.json(trackerData, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
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
