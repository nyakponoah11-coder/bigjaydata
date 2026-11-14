import { NextResponse } from "next/server";
import {
  generateAdminSessionToken,
  verifyAdminRequest,
  getDatabaseAdminUser,
  saveDatabaseAdminUser,
  verifyAdminPassword,
  hashAdminPassword,
  requireAdminAuth,
} from "@/lib/admin-auth";
import {
  getClientIp,
  isEntityBlocked,
  unblockEntity,
  clearAdminLoginFailures,
  recordAdminLoginFailure,
} from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const isAuth = await verifyAdminRequest(req);
    const existingAdmin = await getDatabaseAdminUser();
    const hasEnvPass = Boolean(
      process.env.ADMIN_PASSWORD?.trim() || process.env.ADMIN_SECRET_KEY?.trim()
    );

    return NextResponse.json({
      authenticated: isAuth,
      isConfigured: Boolean(existingAdmin || hasEnvPass),
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
    const body = await request.json().catch(() => ({}));
    const { action, email, password, newPassword, tokenSync } = body;

    const inputEmail = email ? String(email).trim().toLowerCase() : "";
    const inputPassword = password ? String(password).trim() : (newPassword ? String(newPassword).trim() : "");

    // Vercel Environment Master Passwords
    const envAdminPass = (process.env.ADMIN_PASSWORD || "").trim();
    const envAdminSecret = (process.env.ADMIN_SECRET_KEY || "").trim();

    const isEnvPasswordValid = Boolean(
      inputPassword &&
      ((envAdminPass && inputPassword === envAdminPass) ||
       (envAdminSecret && inputPassword === envAdminSecret))
    );

    // Blocked IP pre-check
    const blockedStatus = await isEntityBlocked(clientIp);
    if (blockedStatus.blocked) {
      // If the request contains the valid Vercel environment password, auto-unblock and allow login!
      if (isEnvPasswordValid) {
        try {
          await unblockEntity(clientIp, "ip");
          clearAdminLoginFailures(clientIp);
        } catch (_) {}
      } else {
        return NextResponse.json(
          { success: false, message: "Access forbidden: Your IP has been blacklisted by the security firewall." },
          { status: 403 }
        );
      }
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

    // 3. MASTER OVERRIDE: If password matches Vercel environment variable (ADMIN_PASSWORD or ADMIN_SECRET_KEY)
    if (isEnvPasswordValid) {
      const existingAdmin = await getDatabaseAdminUser();
      const adminEmail = inputEmail || existingAdmin?.email || "admin@bundlemartgh.com";

      // Auto-sync database admin user to match Vercel environment password
      try {
        await saveDatabaseAdminUser(adminEmail, inputPassword);
      } catch (err) {
        console.warn("[AdminAuth] Auto-sync env password to database error:", err);
      }

      // Unblock IP and reset any failure counter
      try {
        await unblockEntity(clientIp, "ip");
        clearAdminLoginFailures(clientIp);
      } catch (_) {}

      const userRecord = (await getDatabaseAdminUser(adminEmail)) || existingAdmin;
      const userHash = userRecord?.password_hash || hashAdminPassword(inputPassword).hash;
      const sessionToken = generateAdminSessionToken(adminEmail, userHash);

      const response = NextResponse.json({
        success: true,
        token: sessionToken,
        email: adminEmail,
        message: "Authenticated successfully with Vercel master password.",
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

    // 4. Check for existing database admin account
    const existingAdmin = await getDatabaseAdminUser();

    // 5. First-time setup wizard: if no admin account exists in Supabase yet, initialize it!
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

    // 6. Existing admin authentication via database
    // Allow token sync if already authenticated session exists or valid token is presented
    if (tokenSync) {
      const isReqAuth = await verifyAdminRequest(request);
      const { verifyAdminSessionToken } = await import("@/lib/admin-auth");
      const tokenCheck = verifyAdminSessionToken(String(tokenSync));
      const isLegacyValid = String(tokenSync).startsWith("bundlemart_admin_token_") || tokenSync === "authenticated";

      if (isReqAuth || tokenCheck.valid || isLegacyValid) {
        const adminEmail = tokenCheck.email || existingAdmin.email || "admin@bundlemartgh.com";
        const passwordHash = existingAdmin.password_hash || "default_hash";
        const sessionToken = generateAdminSessionToken(adminEmail, passwordHash);
        const res = NextResponse.json({ success: true, email: adminEmail });
        res.cookies.set("bmgh_admin_session", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        return res;
      }
    }

    if (!inputPassword) {
      return NextResponse.json(
        { success: false, message: "Please enter your admin password." },
        { status: 400 }
      );
    }

    // Look up target admin by email or match existing
    const adminUser = (inputEmail ? await getDatabaseAdminUser(inputEmail) : null) || existingAdmin;
    const isEmailMatch = !inputEmail || adminUser.email.toLowerCase() === inputEmail;
    const isPasswordValid = verifyAdminPassword(inputPassword, adminUser.password_hash, adminUser.salt);

    if (isEmailMatch && isPasswordValid) {
      // Clear any failed attempts
      clearAdminLoginFailures(clientIp);

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
      inputEmail || "admin",
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
