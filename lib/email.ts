import nodemailer from "nodemailer";
import { db } from "@/lib/db";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  message: string;
  messageId?: string;
  isFallback?: boolean;
}

/**
 * Checks whether a real outbound email service (Resend or SMTP) is active
 */
export async function isRealEmailConfigured(): Promise<boolean> {
  const envKey = process.env.RESEND_API_KEY?.trim();
  if (envKey && envKey.startsWith("re_") && envKey !== "re_your_api_key_here" && !envKey.includes("your_api_key")) {
    return true;
  }
  if (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) {
    return true;
  }
  try {
    const settings = await db.getSettings();
    const setKey = settings?.resend_api_key?.trim();
    if (setKey && setKey.startsWith("re_") && setKey !== "re_your_api_key_here" && !setKey.includes("your_api_key")) {
      return true;
    }
    if (settings?.smtp_user?.trim() && settings?.smtp_pass?.trim()) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Universal email dispatcher:
 * 1. Uses Resend API if configured in env or settings
 * 2. Uses SMTP / Gmail if configured in env or settings
 * 3. Gracefully logs to server stdout if no credentials configured yet
 */
export async function sendAgentEmail({ to, subject, html, text }: EmailPayload): Promise<EmailResult> {
  const cleanTo = String(to).trim().toLowerCase();

  let settings: any = null;
  try {
    settings = await db.getSettings();
  } catch {}

  // 1. Try Resend API if configured
  const rawKey = process.env.RESEND_API_KEY?.trim() || settings?.resend_api_key?.trim();
  const resendApiKey = rawKey && rawKey.startsWith("re_") && rawKey !== "re_your_api_key_here" && !rawKey.includes("your_api_key") ? rawKey : null;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || "FastData Partner Portal <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [cleanTo],
          subject,
          html,
          text: text || html.replace(/<[^>]+>/g, " "),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[Email Gateway - Resend] Sent to ${cleanTo} | ID: ${data.id}`);
        return { success: true, message: "Email sent successfully via Resend", messageId: data.id };
      } else {
        console.warn(`[Email Gateway - Resend Error]`, data);
      }
    } catch (err: any) {
      console.error("[Email Gateway - Resend Exception]", err?.message);
    }
  }

  // 2. Try SMTP (Nodemailer) if configured
  const smtpUser = process.env.SMTP_USER?.trim() || process.env.EMAIL_USER?.trim() || settings?.smtp_user?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim() || process.env.EMAIL_PASS?.trim() || settings?.smtp_pass?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim() || settings?.smtp_host?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || settings?.smtp_port) || 465;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"FastData Partner Desk" <${smtpUser}>`,
        to: cleanTo,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, " "),
      });

      console.log(`[Email Gateway - SMTP] Sent to ${cleanTo} | ID: ${info.messageId}`);
      return { success: true, message: "Email sent successfully via SMTP", messageId: info.messageId };
    } catch (err: any) {
      console.error("[Email Gateway - SMTP Exception]", err?.message);
    }
  }

  // 3. Fallback / Dev Logger
  console.log(`=======================================================`);
  console.log(`[EMAIL DISPATCH - SIMULATION MODE] (No SMTP/Resend key configured yet)`);
  console.log(`TO: ${cleanTo}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`CONTENT: ${text || html.replace(/<[^>]+>/g, " ")}`);
  console.log(`=======================================================`);

  return {
    success: true,
    isFallback: true,
    message: `Verification message generated for ${cleanTo}.`,
  };
}

/**
 * Send Withdrawal OTP to Agent Registered Email
 */
export async function sendWithdrawalOtpEmail(
  agentEmail: string,
  agentName: string,
  code: string,
  amount: number
): Promise<EmailResult> {
  const subject = `[FastData] Security Verification Code for GHS ${amount.toFixed(2)} Withdrawal`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Security Verification Code</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">FastData Partner Portal Withdrawal Request</p>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Hello <strong>${agentName}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        You requested a profit withdrawal of <strong>GHS ${amount.toFixed(2)}</strong>. Please use the 6-digit verification code below to authorize this payout:
      </p>

      <div style="background-color: #f1f5f9; border: 2px dashed #059669; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #047857;">${code}</span>
        <p style="font-size: 11px; color: #64748b; margin: 6px 0 0;">This code expires in 10 minutes</p>
      </div>

      <p style="color: #ef4444; font-size: 12px; line-height: 1.4;">
        <strong>Security Warning:</strong> Never share this code with anyone. FastData staff will never ask you for this code.
      </p>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
        FastData Automated Partner Network • Powered by FastData Desk
      </div>
    </div>
  `;

  return sendAgentEmail({ to: agentEmail, subject, html });
}

/**
 * Send Password Reset Code or New PIN to Agent Registered Email
 */
export async function sendPasswordResetEmail(
  agentEmail: string,
  agentName: string,
  codeOrPassword: string,
  isAdminReset: boolean = false
): Promise<EmailResult> {
  const subject = isAdminReset
    ? `[FastData] Your Partner Portal Password Has Been Reset`
    : `[FastData] Password Reset Verification Code`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px;">
          ${isAdminReset ? "Account Password Reset" : "Password Reset Code"}
        </h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">FastData Partner Portal</p>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Hello <strong>${agentName}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        ${
          isAdminReset
            ? "Your account password / PIN was reset by system administration. Please use your new login credentials below:"
            : "We received a request to reset your password. Use the verification code below to set a new password:"
        }
      </p>

      <div style="background-color: #f1f5f9; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: ${isAdminReset ? "24px" : "32px"}; font-weight: 800; letter-spacing: ${isAdminReset ? "2px" : "6px"}; color: #0369a1;">
          ${codeOrPassword}
        </span>
        <p style="font-size: 11px; color: #64748b; margin: 6px 0 0;">
          ${isAdminReset ? "Login with this password and your email/phone" : "This code expires in 15 minutes"}
        </p>
      </div>

      <p style="color: #64748b; font-size: 12px; line-height: 1.4;">
        If you did not request this, please contact our support desk immediately.
      </p>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
        FastData Automated Partner Network • Powered by FastData Desk
      </div>
    </div>
  `;

  return sendAgentEmail({ to: agentEmail, subject, html });
}

/**
 * Send Suspension or Reactivation Notice
 */
export async function sendSuspensionEmail(
  agentEmail: string,
  agentName: string,
  isSuspended: boolean
): Promise<EmailResult> {
  const subject = isSuspended
    ? `[FastData Notice] Your Partner Account Has Been Suspended`
    : `[FastData Notice] Your Partner Account Has Been Reactivated`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: ${isSuspended ? "#dc2626" : "#059669"}; margin: 0; font-size: 22px;">
          ${isSuspended ? "Account Suspended" : "Account Reactivated"}
        </h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">FastData Partner Portal</p>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Hello <strong>${agentName}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        ${
          isSuspended
            ? "Your FastData partner account and public storefront have been placed on suspension by the administration. While suspended, your storefront is closed and you will not be able to log into your partner dashboard."
            : "Great news! Your FastData partner account and storefront have been reactivated. You can now log into your dashboard and accept customer orders."
        }
      </p>

      <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
        If you have questions regarding this action, please reply to this email or contact support.
      </p>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
        FastData Automated Partner Network • Powered by FastData Desk
      </div>
    </div>
  `;

  return sendAgentEmail({ to: agentEmail, subject, html });
}

/**
 * Send Login 2FA Verification Code to Agent Registered Email
 */
export async function sendLoginOtpEmail(
  agentEmail: string,
  agentName: string,
  code: string
): Promise<EmailResult> {
  const subject = `[FastData] Your Login Verification Code: ${code}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Partner Login Verification</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">FastData Partner Portal</p>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Hello <strong>${agentName}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        A sign-in attempt was initiated for your partner account. Enter the 6-digit verification code below to authorize your login session:
      </p>

      <div style="background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #15803d;">
          ${code}
        </span>
        <p style="font-size: 11px; color: #64748b; margin: 6px 0 0;">Valid for 10 minutes</p>
      </div>

      <p style="color: #ef4444; font-size: 12px; line-height: 1.4;">
        <strong>Security Notice:</strong> If you did not initiate this login request, change your password immediately or contact our support team.
      </p>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
        FastData Automated Partner Network • Powered by FastData Desk
      </div>
    </div>
  `;

  return sendAgentEmail({ to: agentEmail, subject, html });
}
