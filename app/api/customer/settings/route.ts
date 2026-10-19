import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmailChangeOtpEmail } from "@/lib/email";
import { formatGhanaPhone } from "@/lib/datamart";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;
    const customer_id = body.customer_id || body.customerId;

    if (!customer_id) {
      return NextResponse.json(
        { success: false, message: "Customer ID is required.", error: "Customer ID is required." },
        { status: 400 }
      );
    }

    const customer = await db.getCustomerById(customer_id);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account not found.", error: "Customer account not found." },
        { status: 404 }
      );
    }

    // 1. ACTION: Update Profile (Name, Phone, Profile Picture)
    if (action === "update_profile") {
      const { name, phone, avatar_url } = body;
      const updates: any = {};

      if (name !== undefined) {
        const cleanName = String(name).trim();
        if (!cleanName || cleanName.length < 2) {
          return NextResponse.json(
            { success: false, message: "Please enter a valid full name." },
            { status: 400 }
          );
        }
        updates.name = cleanName;
      }

      if (phone !== undefined) {
        const formattedPhone = formatGhanaPhone(String(phone));
        if (!/^0[235][0-9]{8}$/.test(formattedPhone)) {
          return NextResponse.json(
            { success: false, message: "Please enter a valid 10-digit Ghanaian phone number (e.g. 0551234567)." },
            { status: 400 }
          );
        }
        // Check if phone taken by another user
        const existingPhone = await db.getCustomerByPhone(formattedPhone);
        if (existingPhone && existingPhone.id !== customer.id) {
          return NextResponse.json(
            { success: false, message: "This phone number is already registered to another account." },
            { status: 400 }
          );
        }
        updates.phone = formattedPhone;
      }

      if (avatar_url !== undefined) {
        updates.avatar_url = avatar_url;
      }

      const updated = await db.updateCustomer(customer.id, updates);
      const { password_hash, ...safeCustomer } = updated || customer;

      return NextResponse.json({
        success: true,
        customer: safeCustomer,
        message: "Profile updated successfully!",
      });
    }

    // 2. ACTION: Request Email Change (Dispatches 6-digit OTP to current OLD email)
    if (action === "request_email_change") {
      const cleanNewEmail = String(body.new_email || body.newEmail || "").trim().toLowerCase();

      if (!cleanNewEmail || !cleanNewEmail.includes("@") || !cleanNewEmail.includes(".")) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid new email address.", error: "Please enter a valid new email address." },
          { status: 400 }
        );
      }

      if (customer.email && customer.email.toLowerCase() === cleanNewEmail) {
        return NextResponse.json(
          { success: false, message: "New email is identical to your current email address.", error: "New email is identical to your current email address." },
          { status: 400 }
        );
      }

      // Check if another account is using new email
      const existingEmailCustomer = await db.getCustomerByEmail(cleanNewEmail);
      if (existingEmailCustomer && existingEmailCustomer.id !== customer.id) {
        return NextResponse.json(
          { success: false, message: "This email address is already registered to another account.", error: "This email address is already registered to another account." },
          { status: 400 }
        );
      }

      // If user currently has NO email registered, directly set it
      if (!customer.email) {
        const updated = await db.updateCustomer(customer.id, { email: cleanNewEmail });
        const { password_hash, ...safeCustomer } = updated || customer;
        return NextResponse.json({
          success: true,
          requires_otp: false,
          customer: safeCustomer,
          message: "Email address added successfully to your account!",
        });
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      await db.updateCustomer(customer.id, {
        pending_new_email: cleanNewEmail,
        email_change_code: otpCode,
        email_change_expires_at: expiresAt,
      });

      // Send OTP to OLD email address
      let emailSent = false;
      let emailFallback = true;
      try {
        const emailRes = await sendEmailChangeOtpEmail(customer.email, customer.name, cleanNewEmail, otpCode);
        emailSent = Boolean(emailRes.success && !emailRes.isFallback);
        emailFallback = !emailSent;
      } catch (e) {
        console.warn("Failed to dispatch email change OTP:", e);
      }

      // Mask old email for security (e.g. k***@gmail.com)
      const parts = customer.email.split("@");
      const maskedOldEmail =
        parts[0].length <= 2
          ? parts[0] + "***@" + parts[1]
          : parts[0][0] + "***" + parts[0].slice(-1) + "@" + parts[1];

      return NextResponse.json({
        success: true,
        requires_otp: true,
        old_email: maskedOldEmail,
        message: `A 6-digit confirmation code has been dispatched to your registered email (${maskedOldEmail}). Please check your inbox or spam folder.`,
      });
    }

    // 3. ACTION: Confirm Email Change with OTP
    if (action === "confirm_email_change") {
      const cleanCode = String(body.code || body.otp || "").trim();

      if (!cleanCode || cleanCode.length < 4) {
        return NextResponse.json(
          { success: false, message: "Please enter the 6-digit verification code.", error: "Please enter the 6-digit verification code." },
          { status: 400 }
        );
      }

      if (!customer.email_change_code || !customer.pending_new_email) {
        return NextResponse.json(
          { success: false, message: "No email change request is active. Please request a new code.", error: "No email change request is active. Please request a new code." },
          { status: 400 }
        );
      }

      if (customer.email_change_expires_at && customer.email_change_expires_at < Date.now()) {
        return NextResponse.json(
          { success: false, message: "Verification code has expired. Please request a new code.", error: "Verification code has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (customer.email_change_code.trim() !== cleanCode) {
        return NextResponse.json(
          { success: false, message: "Invalid verification code. Please check and try again.", error: "Invalid verification code. Please check and try again." },
          { status: 400 }
        );
      }

      const finalEmail = customer.pending_new_email;
      const updated = await db.updateCustomer(customer.id, {
        email: finalEmail,
        pending_new_email: null,
        email_change_code: null,
        email_change_expires_at: null,
      });

      const { password_hash, ...safeCustomer } = updated || customer;

      return NextResponse.json({
        success: true,
        customer: safeCustomer,
        message: `Email address successfully updated to ${finalEmail}!`,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action specified." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Customer settings error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
