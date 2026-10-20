import { NextResponse } from "next/server";
import { sendAgentEmail } from "@/lib/email";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { test_email, resend_api_key, email_from, smtp_user, smtp_pass, smtp_host, smtp_port } = body;

    const rawTarget = test_email || body.targetEmail || body.target_email || body.testEmail || body.email || "";
    const targetEmail = String(rawTarget).trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address to send the test verification code to." },
        { status: 400 }
      );
    }

    const host = smtp_host || "smtp.gmail.com";
    const cleanedPass = smtp_pass && host.includes("gmail") ? String(smtp_pass).replace(/\s+/g, "") : (smtp_pass || "");

    // Save temporary email settings to db if provided, so test uses the exact credentials
    if (resend_api_key !== undefined || smtp_user !== undefined) {
      await db.updateSettings({
        resend_api_key: resend_api_key ? String(resend_api_key).trim() : "",
        email_from: email_from ? String(email_from).trim() : "",
        smtp_user: smtp_user ? String(smtp_user).trim() : "",
        smtp_pass: cleanedPass,
        smtp_host: host.trim(),
        smtp_port: Number(smtp_port) || 465,
      });
    }

    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const settings = await db.getSettings();

    const subject = `[${settings.store_name || "Data Ease"}] Email Gateway Test Verification Code: ${testCode}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
        <h2 style="color: #0f172a; margin-top: 0;">Email Gateway Test</h2>
        <p style="color: #475569; font-size: 14px;">This is a test verification email from <strong>${settings.store_name || "Data Ease"}</strong>.</p>
        <div style="background-color: #f8fafc; border: 2px dashed #10b981; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #059669;">${testCode}</span>
          <p style="font-size: 11px; color: #64748b; margin: 6px 0 0;">Test Code • Real Delivery Successful</p>
        </div>
        <p style="color: #10b981; font-size: 13px; font-weight: 600;">If you received this message, your outbound email delivery gateway is properly configured and working!</p>
      </div>
    `;

    const result = await sendAgentEmail({
      to: targetEmail,
      subject,
      html,
    });

    if (!result.success || result.isFallback) {
      return NextResponse.json({
        success: false,
        message: result.message || "Failed to deliver test email. Check your Resend API Key or SMTP credentials.",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully delivered to ${targetEmail} (Message ID: ${result.messageId || "delivered"}).`,
    });
  } catch (error: any) {
    console.error("Test email route error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to send test email." },
      { status: 500 }
    );
  }
}
