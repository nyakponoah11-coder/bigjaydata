import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, identifier, code } = body;

    if (!code || (!customer_id && !identifier)) {
      return NextResponse.json(
        { success: false, message: "Customer identifier and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    let customer = null;
    if (customer_id) {
      customer = await db.getCustomerById(customer_id);
    } else if (identifier) {
      const clean = String(identifier).trim();
      customer = await db.getCustomerByPhone(clean);
      if (!customer) {
        customer = await db.getCustomerByEmail(clean.toLowerCase());
      }
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account not found." },
        { status: 404 }
      );
    }

    const cleanCode = String(code).trim().replace(/[^0-9]/g, "");
    const storedCode = String(customer.verification_code || "").trim();
    const expiresAt = Number(customer.verification_code_expires_at || 0);

    if (!storedCode || cleanCode !== storedCode) {
      return NextResponse.json(
        { success: false, message: "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    if (expiresAt > 0 && Date.now() > expiresAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Verification code has expired. Please click 'Resend Code' to receive a new one.",
        },
        { status: 400 }
      );
    }

    // Code verified! Mark customer as verified and active, clear verification code
    const updatedCustomer = await db.updateCustomer(customer.id, {
      is_verified: true,
      is_active: true,
      verification_code: null,
      verification_code_expires_at: null,
    });

    const token = `bmgh_cust_${customer.id}_${Date.now()}`;
    const safeCustomer = updatedCustomer || customer;
    const { password_hash, verification_code, verification_code_expires_at, ...cleaned } = safeCustomer;

    const response = NextResponse.json({
      success: true,
      message: "Account verified successfully! Welcome to BundleMartGh.",
      customer: cleaned,
      token,
    });

    response.cookies.set("bmgh_customer_session", JSON.stringify(cleaned), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Verification code check error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to verify code." },
      { status: 500 }
    );
  }
}
