import { NextResponse } from "next/server";
import {
  saveBiometricCredential,
  deleteBiometricCredential,
  getEnrolledBiometricCredentials,
  consumeBiometricChallenge,
} from "@/lib/biometrics";
import {
  requireAdminAuth,
  getDatabaseAdminUser,
  verifyAdminPassword,
  generateAdminSessionToken,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credentialId, deviceName, challenge, email, publicKey, password } = body;

    // Check authorization: Valid session OR valid admin master password
    let authorized = false;
    const authError = await requireAdminAuth(req);
    if (!authError) {
      authorized = true;
    } else if (password) {
      const cleanPass = String(password).trim();
      const envPass = process.env.ADMIN_PASSWORD?.trim();
      const envSecret = process.env.ADMIN_SECRET_KEY?.trim();
      if ((envPass && cleanPass === envPass) || (envSecret && cleanPass === envSecret)) {
        authorized = true;
      } else {
        const dbAdmin = await getDatabaseAdminUser();
        if (dbAdmin && verifyAdminPassword(cleanPass, dbAdmin.password_hash, dbAdmin.salt)) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid admin password or expired session." },
        { status: 401 }
      );
    }

    if (!credentialId) {
      return NextResponse.json(
        { success: false, message: "Missing credential identifier from biometric authenticator." },
        { status: 400 }
      );
    }

    if (challenge && !consumeBiometricChallenge(challenge)) {
      return NextResponse.json(
        { success: false, message: "Biometric registration challenge expired or invalid. Please try again." },
        { status: 400 }
      );
    }

    const existingAdmin = await getDatabaseAdminUser();
    const adminEmail = email || existingAdmin?.email || "admin@bundlemartgh.com";
    const devName = String(deviceName || "Admin Device (Touch ID / Face ID)").trim();

    const saved = await saveBiometricCredential({
      id: String(credentialId).trim(),
      email: adminEmail,
      deviceName: devName,
      publicKey: publicKey ? String(publicKey) : undefined,
      createdAt: new Date().toISOString(),
    });

    if (!saved) {
      return NextResponse.json(
        { success: false, message: "Could not persist biometric passkey into database settings." },
        { status: 500 }
      );
    }

    const userHash = existingAdmin?.password_hash || process.env.ADMIN_PASSWORD || "bmgh_admin";
    const sessionToken = generateAdminSessionToken(adminEmail, userHash);

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      email: adminEmail,
      message: `Biometric passkey for "${devName}" enrolled successfully! You can now use Face ID / Fingerprint to log in.`,
    });

    response.cookies.set("bmgh_admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Biometrics Register Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to register biometric device." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const credId = searchParams.get("id") || undefined;

    const removed = await deleteBiometricCredential(credId);
    if (!removed) {
      return NextResponse.json(
        { success: false, message: "Failed to remove biometric key." },
        { status: 500 }
      );
    }

    const remaining = await getEnrolledBiometricCredentials();
    return NextResponse.json({
      success: true,
      message: credId ? "Biometric key removed successfully." : "All biometric keys cleared.",
      remainingCount: remaining.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Error deleting biometric key." },
      { status: 500 }
    );
  }
}

