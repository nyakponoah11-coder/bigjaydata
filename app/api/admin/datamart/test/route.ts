import { NextResponse } from "next/server";
import { testDataMartConnection } from "@/lib/datamart";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const authError = await requireAdminAuth(request);
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    const { api_key, api_url, api_secret } = body;

    const result = await testDataMartConnection(api_key, api_url, api_secret);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal test error" },
      { status: 500 }
    );
  }
}
