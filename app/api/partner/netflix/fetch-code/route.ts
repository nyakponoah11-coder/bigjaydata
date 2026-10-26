import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchNetflixSignInCode } from "@/lib/netflix";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getApiKey(req: Request, body?: any): string | null {
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.substring(7).trim();
  }

  if (body?.api_key) return String(body.api_key).trim();

  const { searchParams } = new URL(req.url);
  const qKey = searchParams.get("api_key");
  if (qKey) return qKey.trim();

  return null;
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const apiKey = getApiKey(req, body);
    if (!apiKey) {
      return NextResponse.json(
        { status: "error", success: false, error: "unauthorized", message: "API key is required." },
        { status: 401 }
      );
    }

    const partner = (await db.getNetflixPartnerByApiKey(apiKey)) || (await db.getDeveloperAccountByApiKey(apiKey));
    if (!partner) {
      return NextResponse.json(
        { status: "error", success: false, error: "invalid_key", message: "Invalid partner API key." },
        { status: 401 }
      );
    }

    const { reference, partner_reference } = body;
    const targetRef = String(reference || partner_reference || "").trim();

    if (!targetRef) {
      return NextResponse.json(
        { status: "error", success: false, error: "missing_reference", message: "Field 'reference' is required." },
        { status: 400 }
      );
    }

    // Lookup order to get official netflix_reference if available
    const order = await db.getOrderByReference(targetRef);
    const lookupRef = order?.netflix_reference || targetRef;

    const result = await fetchNetflixSignInCode(lookupRef);

    if (result.success && result.code) {
      if (order) {
        await db.updateOrderStatus(order.id, "delivered", undefined, {
          netflix_code: result.code,
          netflix_code_fetched_at: new Date().toISOString(),
        });
      }
      return NextResponse.json({
        status: "success",
        success: true,
        code: result.code,
        netflix_email: result.netflix_email || order?.netflix_email,
        expires_in: result.expires_in || "15 minutes",
      });
    }

    return NextResponse.json({
      status: result.status || "error",
      success: false,
      retryable: result.retryable || false,
      error: result.error || "Sign-in code not ready yet.",
      netflix_email: result.netflix_email || order?.netflix_email,
    });
  } catch (error: any) {
    console.error("[Partner Fetch Code Error]:", error);
    return NextResponse.json(
      { status: "error", success: false, error: "server_error", message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
