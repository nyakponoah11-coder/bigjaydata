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
      let fromEmail = process.env.EMAIL_FROM?.trim() || settings?.email_from?.trim();
      if (!fromEmail) {
        fromEmail = `${settings?.store_name || "Data Ease"} <onboarding@resend.dev>`;
      } else if (!fromEmail.includes("<") && fromEmail.includes("@")) {
        fromEmail = `${settings?.store_name || "Data Ease"} <${fromEmail}>`;
      }

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
      if (res.ok && data?.id) {
        console.log(`[Email Gateway - Resend] Sent to ${cleanTo} | ID: ${data.id}`);
        return { success: true, message: "Email sent successfully via Resend", messageId: data.id, isFallback: false };
      } else {
        console.warn(`[Email Gateway - Resend Error]`, data);
      }
    } catch (err: any) {
      console.error("[Email Gateway - Resend Exception]", err?.message);
    }
  }

  // 2. Try SMTP (Nodemailer) if configured
  const smtpUser = process.env.SMTP_USER?.trim() || process.env.EMAIL_USER?.trim() || settings?.smtp_user?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim() || settings?.smtp_host?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || settings?.smtp_port) || 465;
  const rawSmtpPass = process.env.SMTP_PASS?.trim() || process.env.EMAIL_PASS?.trim() || settings?.smtp_pass?.trim();
  const smtpPass = rawSmtpPass ? (smtpHost.includes("gmail") ? rawSmtpPass.replace(/\s+/g, "") : rawSmtpPass.trim()) : "";

  if (smtpUser && smtpPass) {
    try {
      const isSecure = smtpPort === 465;
      const isGmail = smtpHost.toLowerCase().includes("gmail") || smtpUser.toLowerCase().includes("gmail");

      const transportConfig: any = isGmail
        ? {
            service: "gmail",
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          }
        : {
            host: smtpHost,
            port: smtpPort,
            secure: isSecure,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          };

      const transporter = nodemailer.createTransport(transportConfig);

      let senderFrom = process.env.EMAIL_FROM?.trim() || settings?.email_from?.trim();
      if (!senderFrom || !senderFrom.includes("@")) {
        senderFrom = `"${settings?.store_name || "Data Ease"}" <${smtpUser}>`;
      } else if (!senderFrom.includes("<")) {
        senderFrom = `"${settings?.store_name || "Data Ease"}" <${senderFrom}>`;
      }

      const info = await transporter.sendMail({
        from: senderFrom,
        to: cleanTo,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, " "),
      });

      console.log(`[Email Gateway - SMTP] Sent to ${cleanTo} | ID: ${info.messageId}`);
      return { success: true, message: "Email sent successfully via SMTP", messageId: info.messageId, isFallback: false };
    } catch (err: any) {
      console.error("[Email Gateway - SMTP Exception]", err?.message);
      let userFriendlyMsg = err?.message || "Failed to deliver email via SMTP.";
      if (err?.message?.includes("535") || err?.code === "EAUTH") {
        userFriendlyMsg = `Gmail Authentication Failed (535): Invalid username or App Password. Google rejected login for "${smtpUser}". Ensure the 16-character App Password was generated inside this exact Google account and that 2-Step Verification is enabled.`;
      }
      return {
        success: false,
        isFallback: false,
        message: userFriendlyMsg,
      };
    }
  }

  // 3. Fallback / Simulation Logger
  console.log(`=======================================================`);
  console.log(`[EMAIL DISPATCH - SIMULATION MODE] (No SMTP/Resend key configured yet)`);
  console.log(`TO: ${cleanTo}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`CONTENT: ${text || html.replace(/<[^>]+>/g, " ")}`);
  console.log(`=======================================================`);

  return {
    success: false,
    isFallback: true,
    message: `Verification message generated for ${cleanTo} (simulation mode).`,
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

/**
 * Send Developer API Key Verification Code
 */
export async function sendDeveloperVerificationOtpEmail(
  developerEmail: string,
  developerName: string,
  code: string
): Promise<EmailResult> {
  const subject = `[FastData Developer API] Your 6-Digit Key Verification Code: ${code}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #1e293b; border-radius: 20px; background-color: #0b1120; color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 8px 16px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 999px; margin-bottom: 12px;">
          <span style="font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 1px;">FastData API Gateway</span>
        </div>
        <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">API Key Verification</h2>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">Secure programmatic access credentials</p>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Hello <strong>${developerName}</strong>,</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        You requested to generate a production API Key for FastData automated mobile data fulfillment. Use the 6-digit verification code below to authorize and generate your secret key:
      </p>

      <div style="background-color: #0f172a; border: 2px dashed #6366f1; border-radius: 14px; padding: 20px; text-align: center; margin: 26px 0;">
        <span style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #a5b4fc;">
          ${code}
        </span>
        <p style="font-size: 11px; color: #64748b; margin: 8px 0 0;">Expires in 10 minutes • One-time authorization</p>
      </div>

      <div style="background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
        <p style="color: #fca5a5; font-size: 12px; margin: 0; line-height: 1.5;">
          <strong>Security Warning:</strong> Never share your verification code or API keys. FastData engineers will never ask for your API secret.
        </p>
      </div>

      <div style="border-top: 1px solid #1e293b; margin-top: 26px; padding-top: 18px; font-size: 11px; color: #64748b; text-align: center;">
        FastData Developer Platform • High-Speed Telco APIs for Ghana
      </div>
    </div>
  `;

  return sendAgentEmail({ to: developerEmail, subject, html });
}

/**
 * Send Customer Account Verification Code (Sign Up & Login)
 */
export async function sendCustomerVerificationEmail(
  customerEmail: string,
  customerName: string,
  code: string,
  purpose: "signup" | "login" = "signup"
): Promise<EmailResult> {
  const isSignup = purpose === "signup";
  const subject = `[BundleMartGh] Your 6-Digit ${isSignup ? "Sign Up" : "Login"} Verification Code: ${code}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; border: 1px solid #1e293b; border-radius: 20px; background-color: #0b1120; color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 6px 14px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 999px; margin-bottom: 12px;">
          <span style="font-size: 11px; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px;">BundleMartGh Security</span>
        </div>
        <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Account Verification</h2>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">One-Time Verification Code</p>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Hello <strong>${customerName || "Customer"}</strong>,</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        ${
          isSignup
            ? "Thank you for creating an account on BundleMartGh! Please use the 6-digit verification code below to verify your account and activate your automated data wallet:"
            : "You requested a verification code to sign into your BundleMartGh account. Use the code below to complete your login:"
        }
      </p>

      <div style="background-color: #0f172a; border: 2px dashed #f59e0b; border-radius: 14px; padding: 20px; text-align: center; margin: 26px 0;">
        <span style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #fbbf24;">
          ${code}
        </span>
        <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0;">Expires in 10 minutes • Valid for one-time use</p>
      </div>

      <div style="background-color: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
        <p style="color: #6ee7b7; font-size: 12px; margin: 0; line-height: 1.5;">
          <strong>Security Tip:</strong> Never share this code with anyone. BundleMartGh staff will never ask for your verification code.
        </p>
      </div>

      <div style="border-top: 1px solid #1e293b; margin-top: 26px; padding-top: 18px; font-size: 11px; color: #64748b; text-align: center;">
        BundleMartGh • Instant Automated MTN, Telecel & AT Data Bundles in Ghana
      </div>
    </div>
  `;

  return sendAgentEmail({ to: customerEmail, subject, html });
}

/**
 * Send Customer Email Change Verification Code to OLD Email
 */
export async function sendEmailChangeOtpEmail(
  oldEmail: string,
  customerName: string,
  newEmail: string,
  code: string
): Promise<EmailResult> {
  const subject = `[BundleMartGh] Confirm Email Address Change: ${code}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; border: 1px solid #1e293b; border-radius: 20px; background-color: #0b1120; color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 6px 14px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 999px; margin-bottom: 12px;">
          <span style="font-size: 11px; font-weight: 800; color: #f87171; text-transform: uppercase; letter-spacing: 1px;">Security Alert • Email Update</span>
        </div>
        <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Confirm Email Change</h2>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">Authorization Required From Your Current Email</p>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Hello <strong>${customerName || "Customer"}</strong>,</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        A request was made to change the email address on your BundleMartGh account to:
      </p>

      <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 12px 16px; margin: 16px 0; text-align: center;">
        <span style="color: #38bdf8; font-weight: 800; font-size: 15px; font-family: monospace;">${newEmail}</span>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        To authorize this change, please enter the following 6-digit confirmation code in your account settings:
      </p>

      <div style="background-color: #0f172a; border: 2px dashed #f59e0b; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #fbbf24;">
          ${code}
        </span>
        <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0;">Expires in 10 minutes • If you did not request this, please change your password immediately.</p>
      </div>

      <div style="border-top: 1px solid #1e293b; margin-top: 26px; padding-top: 18px; font-size: 11px; color: #64748b; text-align: center;">
        BundleMartGh • Instant Automated MTN, Telecel & AT Data Bundles in Ghana
      </div>
    </div>
  `;

  return sendAgentEmail({ to: oldEmail, subject, html });
}
