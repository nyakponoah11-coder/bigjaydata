import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Phone number/email and password are required." },
        { status: 400 }
      );
    }

    const cleanInput = String(identifier).trim();
    const cleanPass = String(password).trim();

    // Check if phone or email
    let customer = await db.getCustomerByPhone(cleanInput);
    if (!customer) {
      customer = await db.getCustomerByEmail(cleanInput.toLowerCase());
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "No customer account found with this phone number or email." },
        { status: 404 }
      );
    }

    if (customer.password_hash !== cleanPass) {
      return NextResponse.json(
        { success: false, message: "Incorrect password or PIN. Please try again." },
        { status: 401 }
      );
    }

    if (!customer.is_active) {
      return NextResponse.json(
        { success: false, message: "Your customer account is currently inactive. Contact support." },
        { status: 403 }
      );
    }

    // Strict verification check: Customer MUST verify before they can get into their account for the first time
    const isVerified = customer.is_verified === true || String(customer.is_verified) === "true" || Number(customer.is_verified) === 1;

    if (!isVerified) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await db.updateCustomer(customer.id, {
        verification_code: code,
        verification_code_expires_at: expiresAt,
      });

      // 1. Dispatch via Email
      if (customer.email) {
        try {
          const { sendCustomerVerificationEmail } = await import("@/lib/email");
          await sendCustomerVerificationEmail(customer.email, customer.name, code, "login");
        } catch {}
      }

      // 2. Dispatch via SMS
      if (customer.phone) {
        try {
          const { sendCustomerSMS } = await import("@/lib/sms");
          await sendCustomerSMS({
            phone: customer.phone,
            message: `Your Big Jay Data verification code is: ${code}. Valid for 10 minutes.`,
          });
        } catch {}
      }

      return NextResponse.json({
        success: true,
        requires_verification: true,
        customer_id: customer.id,
        phone: customer.phone,
        email: customer.email,
        message: `Your account is not verified yet. Please enter the 6-digit verification code sent to your email (${customer.email}) and phone (${customer.phone}) to activate and sign in.`,
      });
    }

    const token = `bmgh_cust_${customer.id}_${Date.now()}`;
    const { password_hash, verification_code, verification_code_expires_at, ...safeCustomer } = customer;

    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully!",
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
    console.error("Customer login error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to log in." },
      { status: 500 }
    );
  }
}
