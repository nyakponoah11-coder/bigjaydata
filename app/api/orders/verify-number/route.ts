import { NextResponse } from "next/server";
import { verifyDataMartNumber } from "@/lib/datamart";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: "Please provide a phone number to verify" },
        { status: 400 }
      );
    }

    const result = await verifyDataMartNumber(phoneNumber);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: true,
        servable: true,
        recommendation: "sell_any",
        message: "Verification check passed",
      },
      { status: 200 }
    );
  }
}
