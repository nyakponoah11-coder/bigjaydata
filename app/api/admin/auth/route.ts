import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.ADMIN_PASSWORD || "bigj2026";

    if (password && password.trim() === correctPassword.trim()) {
      return NextResponse.json({
        success: true,
        token: "bigj_admin_token_" + Buffer.from(Date.now().toString()).toString("base64"),
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
