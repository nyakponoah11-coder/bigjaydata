import { NextResponse } from "next/server";
import { testDataMartConnection } from "@/lib/datamart";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { api_key, api_url } = body;

    const result = await testDataMartConnection(api_key, api_url);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal test error" },
      { status: 500 }
    );
  }
}
