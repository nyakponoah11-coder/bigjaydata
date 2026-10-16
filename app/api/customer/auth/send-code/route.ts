import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendCustomerVerificationEmail, isRealEmailConfigured } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, customer_id, purpose = "signup" } = body;

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
        { success: false, message: "No customer account found." },
        { status: 404 }
      );
    }

    // Generate fresh 6-digit code with 10-minute validity
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await db.updateCustomer(customer.id, {
      verification_code: code,
      verification_code_expires_at: expiresAt,
    });

    const hasRealEmail = await isRealEmailConfigured();
    let emailSent = false;

    if (customer.email) {
      try {
        await sendCustomerVerificationEmail(
          customer.email,
          customer.name,
          code,
          purpose === "login" ? "login" : "signup"
        );
        emailSent = true;
      } catch (err) {
        console.warn("Failed to dispatch verification email:", err);
      }
    }

    console.log(
      `[Customer Auth OTP] Sent code ${code} to ${customer.phone} / ${customer.email || "No email"} (Expires in 10m)`
    );

    return NextResponse.json({
      success: true,
      message: customer.email && hasRealEmail
        ? `A 6-digit verification code was sent to ${customer.email}.`
        : `Verification code generated for ${customer.phone}.`,
      has_real_email: hasRealEmail,
      dev_code: code, // Provided for instant seamless localhost testing
    });
  } catch (error: any) {
    console.error("Send verification code error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
