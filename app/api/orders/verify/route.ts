import { NextResponse } from "next/server";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function POST(request: Request) {
  try {
    const { reference } = await request.json();
    if (!reference) {
      return NextResponse.json(
        { success: false, message: "Reference is required" },
        { status: 400 }
      );
    }

    const verification = await verifyPaystackTransaction(reference);
    return NextResponse.json(verification);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Verification failed" },
      { status: 500 }
    );
  }
}
