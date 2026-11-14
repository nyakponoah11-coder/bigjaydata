import { NextResponse } from "next/server";
import { createBiometricChallenge, getEnrolledBiometricCredentials } from "@/lib/biometrics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") === "register" ? "register" : "auth";
    const challenge = createBiometricChallenge(type);

    let allowCredentials: Array<{ id: string; type: "public-key"; transports: string[] }> = [];
    if (type === "auth") {
      const credentials = await getEnrolledBiometricCredentials();
      allowCredentials = credentials.map((c) => ({
        id: c.id,
        type: "public-key" as const,
        transports: ["internal"],
      }));
    }

    return NextResponse.json({
      success: true,
      challenge,
      allowCredentials,
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

