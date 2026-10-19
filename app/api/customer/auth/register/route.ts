import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, password } = body;

    if (!name || !phone || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Full name, phone number, email address, and password/PIN are required." },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    const cleanPhone = String(phone).replace(/[^0-9]/g, "");
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address. Your verification code will be sent to this email." },
        { status: 400 }
      );
    }

    if (cleanPhone.length < 9) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid Ghanaian phone number (at least 9-10 digits)." },
        { status: 400 }
      );
    }

    if (cleanPass.length < 4) {
      return NextResponse.json(
        { success: false, message: "Password or PIN must be at least 4 characters long." },
        { status: 400 }
      );
    }

    // Check existing customer by phone
    const existingCustomer = await db.getCustomerByPhone(cleanPhone);
    if (existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this phone number already exists. Please log in instead.",
        },
        { status: 409 }
      );
    }

    if (cleanEmail) {
      const existingEmail = await db.getCustomerByEmail(cleanEmail);
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "An account with this email address already exists. Please log in instead.",
          },
          { status: 409 }
        );
      }
    }

    // Generate 6-digit verification code (valid for 10 minutes)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const newCustomer = await db.createCustomer({
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      password_hash: cleanPass,
      is_verified: false,
      verification_code: verificationCode,
      verification_code_expires_at: expiresAt,
      provider: "local",
    });

    // Send verification email if customer provided email
    let emailSent = false;
    let emailFallback = true;
    if (cleanEmail) {
      try {
        const { sendCustomerVerificationEmail } = await import("@/lib/email");
        const emailRes = await sendCustomerVerificationEmail(cleanEmail, cleanName, verificationCode, "signup");
        emailSent = Boolean(emailRes.success && !emailRes.isFallback);
        emailFallback = !emailSent;
      } catch (err) {
        console.warn("Failed to dispatch sign-up verification email:", err);
      }
    }

    console.log(`[Customer Register] New account created for ${cleanName} (${cleanPhone}). Verification Code: ${verificationCode}`);

    return NextResponse.json({
      success: true,
      requires_verification: true,
      customer_id: newCustomer.id,
      phone: newCustomer.phone,
      email: newCustomer.email,
      name: newCustomer.name,
      has_real_email: emailSent,
      dev_code: emailFallback ? verificationCode : undefined,
      message: emailSent
        ? `Account created! We've sent a 6-digit verification code to your email (${cleanEmail}). Please check your inbox or spam folder.`
        : `Account created! Your instant verification code is ${verificationCode}.`,
    });
  } catch (error: any) {
    console.error("Customer register error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create customer account." },
      { status: 500 }
    );
  }
}
