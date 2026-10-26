import { NextResponse } from "next/server";
import {
  generateAdminSessionToken,
  verifyAdminRequest,
  getDatabaseAdminUser,
  saveDatabaseAdminUser,
  verifyAdminPassword,
  requireAdminAuth,
} from "@/lib/admin-auth";
import {
  getClientIp,
  isEntityBlocked,
  recordAdminLoginFailure,
} from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const isAuth = await verifyAdminRequest(req);
    const existingAdmin = await getDatabaseAdminUser();

    return NextResponse.json({
      authenticated: isAuth,
      isConfigured: Boolean(existingAdmin),
      email: isAuth && existingAdmin ? existingAdmin.email : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, isConfigured: false, error: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // Blocked IP pre-check
    const blockedStatus = await isEntityBlocked(clientIp);
    if (blockedStatus.blocked) {
      return NextResponse.json(
        { success: false, message: "Access forbidden: Your IP has been blacklisted by the security firewall." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 1. Logout action
    if (searchParams.get("logout") === "1") {
      const res = NextResponse.json({ success: true, message: "Logged out successfully" });
      res.cookies.set("bmgh_admin_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    const body = await request.json().catch(() => ({}));
    const { action, email, password, newPassword, tokenSync } = body;

    // 2. Update credentials action (requires authenticated session)
    if (action === "update_credentials") {
      const authError = await requireAdminAuth(request);
      if (authError) return authError;

      const targetEmail = email ? String(email).trim().toLowerCase() : "";
      const targetPass = newPassword || password;

      if (!targetEmail || !targetPass) {
        return NextResponse.json(
          { success: false, message: "Both email and new password are required." },
          { status: 400 }
        );
      }

      await saveDatabaseAdminUser(targetEmail, String(targetPass).trim());
      const admin = await getDatabaseAdminUser(targetEmail);
      const sessionToken = generateAdminSessionToken(admin!.email, admin!.password_hash);

      const res = NextResponse.json({
        success: true,
        message: "Admin credentials successfully updated in database.",
        email: admin!.email,
      });

      res.cookies.set("bmgh_admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return res;
    }

    // 3. Check for existing database admin account
    const existingAdmin = await getDatabaseAdminUser();

    // 4. First-time setup wizard: if no admin account exists in Supabase yet, initialize it!
    if (!existingAdmin) {
      const cleanEmail = email ? String(email).trim().toLowerCase() : "";
      const cleanPassword = password ? String(password).trim() : "";

      if (!cleanEmail || !cleanPassword) {
        return NextResponse.json(
          {
            success: false,
            needsSetup: true,
            message: "No admin account exists in the database. Please provide an email and password to create one.",
          },
          { status: 400 }
        );
      }

      await saveDatabaseAdminUser(cleanEmail, cleanPassword);
      const newAdmin = await getDatabaseAdminUser(cleanEmail);
      const sessionToken = generateAdminSessionToken(newAdmin!.email, newAdmin!.password_hash);

      const res = NextResponse.json({
        success: true,
        isInitialSetup: true,
        message: "Admin account initialized in Supabase successfully.",
        token: sessionToken,
      });

      res.cookies.set("bmgh_admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    // 5. Existing admin authentication
    const inputEmail = email ? String(email).trim().toLowerCase() : "";
    const inputPassword = password ? String(password).trim() : "";

    // Allow token sync if already authenticated session exists
    if (tokenSync && (await verifyAdminRequest(request))) {
      return NextResponse.json({ success: true, email: existingAdmin.email });
    }

    if (!inputEmail || !inputPassword) {
      return NextResponse.json(
        { success: false, message: "Please enter both admin email and password." },
        { status: 400 }
      );
    }

    // Look up target admin by email or match existing
    const adminUser = (await getDatabaseAdminUser(inputEmail)) || existingAdmin;
    const isEmailMatch = adminUser.email.toLowerCase() === inputEmail;
    const isPasswordValid = verifyAdminPassword(inputPassword, adminUser.password_hash, adminUser.salt);

    if (isEmailMatch && isPasswordValid) {
      const sessionToken = generateAdminSessionToken(adminUser.email, adminUser.password_hash);

      const response = NextResponse.json({
        success: true,
        token: sessionToken,
        email: adminUser.email,
      });

      response.cookies.set("bmgh_admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // Authentication Failed - Record intrusion attempt, send Email & WhatsApp alert, and auto-block
    const userAgent = request.headers.get("user-agent") || "Unknown Device";
    const failureResult = await recordAdminLoginFailure(
      clientIp,
      inputEmail,
      userAgent,
      existingAdmin?.email
    );

    return NextResponse.json(
      {
        success: false,
        message: failureResult.isBlocked
          ? "Too many failed attempts. Your IP has been temporarily blacklisted by the firewall."
          : "Invalid admin email or password.",
      },
      { status: failureResult.isBlocked ? 403 : 401 }
    );
  } catch (error: any) {
    console.error("[AdminAuth API Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Authentication service error." },
      { status: 500 }
    );
  }
}
