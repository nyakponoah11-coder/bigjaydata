import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const envPassword = process.env.ADMIN_PASSWORD?.trim();
    const inputPassword = password ? String(password).trim() : "";

    // Accept configured environment password, as well as the standard defaults
    const validPasswords = Array.from(new Set([envPassword, "bigj2026", "bundlemart2026"].filter(Boolean)));
    const isMatch = validPasswords.includes(inputPassword);

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
