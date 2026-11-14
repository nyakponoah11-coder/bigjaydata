import { NextResponse } from "next/server";
import {
  getEnrolledBiometricCredentials,
  consumeBiometricChallenge,
  recordBiometricUsage,
} from "@/lib/biometrics";
import {
  generateAdminSessionToken,
  getDatabaseAdminUser,
} from "@/lib/admin-auth";
import {
  getClientIp,
  unblockEntity,
  clearAdminLoginFailures,
  recordAdminLoginFailure,
} from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const { credentialId, challenge } = body;

    if (!credentialId) {
      return NextResponse.json(
        { success: false, message: "No credential received from authenticator." },
        { status: 400 }
      );
    }

    // Verify and consume the one-time challenge
    if (challenge && !consumeBiometricChallenge(challenge)) {
      return NextResponse.json(
        { success: false, message: "Biometric challenge expired. Please tap the biometric button again." },
        { status: 400 }
      );
    }

    const enrolled = await getEnrolledBiometricCredentials();
    const matched = enrolled.find((c) => c.id === String(credentialId).trim());

    if (!matched) {
      // Record failure
      const userAgent = req.headers.get("user-agent") || "Biometric Device";
      await recordAdminLoginFailure(clientIp, "biometric_key", userAgent);

      return NextResponse.json(
        {
          success: false,
          message: "Unrecognized biometric passkey. Please sign in with your password to register this device.",
        },
        { status: 401 }
      );
    }

    // Success! Record usage
    await recordBiometricUsage(matched.id);

    // Unblock IP and clear any previous failed attempt counts
    try {
      await unblockEntity(clientIp, "ip");
      clearAdminLoginFailures(clientIp);
    } catch (_) {}

    const existingAdmin = (await getDatabaseAdminUser(matched.email)) || (await getDatabaseAdminUser());
    const adminEmail = matched.email || existingAdmin?.email || "admin@bundlemartgh.com";
    const passwordHash = existingAdmin?.password_hash || "biometric_authenticated_hash";
    const sessionToken = generateAdminSessionToken(adminEmail, passwordHash);

    const res = NextResponse.json({
      success: true,
      token: sessionToken,
      email: adminEmail,
      deviceName: matched.deviceName,
      message: `Welcome back! Authenticated via ${matched.deviceName || "Biometrics"}.`,
    });

    res.cookies.set("bmgh_admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error: any) {
    console.error("[Biometrics Verify Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Biometric verification failed." },
      { status: 500 }
    );
  }
}
