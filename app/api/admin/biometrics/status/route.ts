import { NextResponse } from "next/server";
import { getEnrolledBiometricCredentials } from "@/lib/biometrics";
import { verifyAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const isAuth = await verifyAdminRequest(req);
    const credentials = await getEnrolledBiometricCredentials();

    return NextResponse.json({
      success: true,
      hasEnrolled: credentials.length > 0,
      count: credentials.length,
      // Only expose full device metadata if authenticated
      credentials: isAuth
        ? credentials.map((c) => ({
            id: c.id,
            deviceName: c.deviceName,
            createdAt: c.createdAt,
            lastUsedAt: c.lastUsedAt,
            email: c.email,
          }))
        : credentials.map((c) => ({
            id: c.id,
            deviceName: c.deviceName,
          })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, hasEnrolled: false, message: error?.message },
      { status: 500 }
    );
  }
}
