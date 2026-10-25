import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permanently block all calls to raw /api/db endpoint
  if (pathname === "/api/db" || pathname.startsWith("/api/db/")) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Direct database API is disabled." },
      { status: 403 }
    );
  }

  // 2. Protect all /api/admin/* and /api/datamart/* endpoints
  if (
    (pathname.startsWith("/api/admin/") && !pathname.startsWith("/api/admin/auth")) ||
    pathname.startsWith("/api/datamart/")
  ) {
    const sessionCookie = request.cookies.get("bmgh_admin_session")?.value;
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("x-admin-auth") ||
      request.headers.get("x-admin-key") ||
      request.headers.get("x-admin-token");

    const hasValidCookie = Boolean(sessionCookie && sessionCookie.length >= 32);
    const hasValidHeader = Boolean(
      authHeader &&
      (authHeader.includes("bundlemart_admin_token_") || authHeader.length >= 8)
    );

    if (!hasValidCookie && !hasValidHeader) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin session required." },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*", "/api/db/:path*", "/api/datamart/:path*"],
};
