import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { credential, email, name, google_id, picture, phone } = body;

    // 1. If Google Identity credential JWT is passed, decode payload safely
    if (credential && typeof credential === "string" && credential.includes(".")) {
      try {
        const parts = credential.split(".");
        if (parts.length >= 2) {
          const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
          const payload = JSON.parse(payloadJson);
          email = email || payload.email;
          name = name || payload.name;
          google_id = google_id || payload.sub;
          picture = picture || payload.picture;
        }
      } catch (jwtErr) {
        console.warn("Could not decode Google JWT:", jwtErr);
      }
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "A valid Google account email is required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name || cleanEmail.split("@")[0]).trim();
    const cleanGoogleId = google_id ? String(google_id).trim() : `g-${cleanEmail}`;
    const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, "") : "";

    // 2. Check if customer already exists by Google ID or Email
    let customer = await db.getCustomerByGoogleId(cleanGoogleId);
    if (!customer) {
      customer = await db.getCustomerByEmail(cleanEmail);
    }

    if (customer) {
      // Existing customer: update Google metadata and ensure verified
      if (!customer.is_active) {
        return NextResponse.json(
          { success: false, message: "Your account is currently inactive. Please contact support." },
          { status: 403 }
        );
      }

      const updates: any = {
        is_verified: true,
        provider: "google",
        updated_at: new Date().toISOString(),
      };
      if (!customer.google_id) updates.google_id = cleanGoogleId;
      if (!customer.avatar_url && picture) updates.avatar_url = picture;
      if (!customer.name && cleanName) updates.name = cleanName;

      customer = (await db.updateCustomer(customer.id, updates)) || customer;
    } else {
      // New Customer: Create verified account immediately
      customer = await db.createCustomer({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password_hash: "GOOGLE_OAUTH_ACCOUNT",
        provider: "google",
        google_id: cleanGoogleId,
        avatar_url: picture,
        is_verified: true,
        is_active: true,
        wallet_balance: 0,
      });
    }

    const token = `bmgh_cust_${customer.id}_${Date.now()}`;
    const { password_hash, verification_code, verification_code_expires_at, ...safeCustomer } = customer;

    const response = NextResponse.json({
      success: true,
      message: `Signed in with Google successfully! Welcome, ${customer.name}.`,
      customer: safeCustomer,
      token,
    });

    response.cookies.set("bmgh_customer_session", JSON.stringify(safeCustomer), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Google authentication failed." },
      { status: 500 }
    );
  }
}
