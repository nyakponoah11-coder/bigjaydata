import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const envPassword = process.env.ADMIN_PASSWORD;
    const isMatch = envPassword
      ? password && password.trim() === envPassword.trim()
      : password && (password.trim() === "bundlemart2026" || password.trim() === "bigj2026");

    if (isMatch) {
      return NextResponse.json({
        success: true,
        token: "bundlemart_admin_token_" + Buffer.from(Date.now().toString()).toString("base64"),
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid admin password" },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Auth error" },
      { status: 500 }
    );
  }
}
