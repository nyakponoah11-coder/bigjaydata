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

    // 1. Dispatch to customer email
    let emailSent = false;
    if (customer.email) {
      try {
        const emailRes = await sendCustomerVerificationEmail(
          customer.email,
          customer.name,
          code,
          purpose === "login" ? "login" : "signup"
        );
        emailSent = Boolean(emailRes.success && !emailRes.isFallback);
      } catch (err) {
        console.warn("Failed to dispatch verification email:", err);
      }
    }

    // 2. Dispatch to customer phone via SMS
    let smsSent = false;
    if (customer.phone) {
      try {
        const { sendCustomerSMS } = await import("@/lib/sms");
        const smsRes = await sendCustomerSMS({
          phone: customer.phone,
          message: `Your Big Jay Data verification code is: ${code}. Valid for 10 minutes.`,
        });
        smsSent = Boolean(smsRes.success && !smsRes.isFallback);
      } catch (smsErr) {
        console.warn("Failed to dispatch verification SMS:", smsErr);
      }
    }

    console.log(
      `[Customer Auth OTP] Generated code ${code} for ${customer.phone} / ${customer.email || "No email"} (emailSent=${emailSent}, smsSent=${smsSent})`
    );

    return NextResponse.json({
      success: true,
      email_sent: emailSent,
      sms_sent: smsSent,
      verification_code: !emailSent ? code : undefined,
      dev_code: !emailSent ? code : undefined,
      message: emailSent
        ? (customer.email && customer.phone
            ? `A 6-digit verification code was sent to your registered email (${customer.email}) and phone (${customer.phone}).`
            : `A 6-digit verification code was sent to your registered contact.`)
        : `Email gateway is not configured yet. Your verification code is ${code}. It has been auto-filled below.`,
    });
  } catch (error: any) {
    console.error("Send verification code error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
