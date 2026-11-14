import { NextResponse } from "next/server";
import { createBiometricChallenge } from "@/lib/biometrics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") === "register" ? "register" : "auth";
    const challenge = createBiometricChallenge(type);

    return NextResponse.json({
      success: true,
      challenge,
      rp: {
        name: "BundleMartGh Admin Portal",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to generate challenge" },
      { status: 500 }
    );
  }
}
