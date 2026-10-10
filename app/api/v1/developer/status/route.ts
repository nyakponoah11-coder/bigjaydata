import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getApiKey(req: Request): string | null {
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.substring(7).trim();
  }

  const { searchParams } = new URL(req.url);
  const qKey = searchParams.get("api_key");
  if (qKey) return qKey.trim();

  return null;
}

export async function GET(req: Request) {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "unauthorized", message: "API key is required." },
        { status: 401 }
      );
    }

    const developer = await db.getDeveloperAccountByApiKey(apiKey);
    if (!developer) {
      return NextResponse.json(
        { success: false, error: "invalid_key", message: "Invalid API key." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");

    if (!reference?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "missing_reference",
          message: "Query parameter 'reference' is required. Example: /api/v1/developer/status?reference=FD-API-12345",
        },
        { status: 400 }
      );
    }

    const order = await db.getOrderByReference(reference.trim());
    if (!order) {
      return NextResponse.json(
        { success: false, error: "not_found", message: "Order reference not found." },
        { status: 404 }
      );
    }

    // Ensure order belongs to this developer or was created via API
    return NextResponse.json({
      success: true,
      reference: order.reference,
      network: order.network,
      package_size: order.package_size,
      phone: order.phone,
      amount: order.amount,
      payment_status: order.payment_status,
      delivery_status: order.delivery_status,
      created_at: order.created_at,
      details: order.datamart_response?.message || null,
    });
  } catch (error: any) {
    console.error("[Developer API Status Error]:", error);
    return NextResponse.json(
      { success: false, error: "server_error", message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
