import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchNetflixSignInCode } from "@/lib/netflix";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { success: false, message: "Order reference is required." },
        { status: 400 }
      );
    }

    // Lookup order by internal reference or by netflix reference
    const order = await db.getOrderByReference(reference);
    const targetRef = order?.netflix_reference || reference;

    const result = await fetchNetflixSignInCode(targetRef);

    if (result.success && result.code && order) {
      // Save code to order record in database
      await db.updateOrderStatus(order.id, "delivered", undefined, {
        netflix_code: result.code,
        netflix_code_fetched_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Customer Netflix Fetch-Code Error]:", error);
    return NextResponse.json(
      { success: false, status: "error", error: error?.message || "Failed to fetch sign-in code." },
      { status: 500 }
    );
  }
}
