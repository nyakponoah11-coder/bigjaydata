import { NextResponse } from "next/server";
import { testDataMartConnection } from "@/lib/datamart";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { api_key } = body;

    const result = await testDataMartConnection(api_key);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal test error" },
      { status: 500 }
    );
  }
}
