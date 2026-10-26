export interface SMSParams {
  phone: string;
  message: string;
  senderId?: string;
}

export interface SMSResult {
  success: boolean;
  message: string;
  sms_id?: string;
  isFallback?: boolean;
}

/**
 * Dispatches transactional SMS notifications via Arkesel SMS Gateway in Ghana.
 */
export async function sendCustomerSMS({ phone, message, senderId = "BigJayData" }: SMSParams): Promise<SMSResult> {
  const cleanPhone = phone.trim().replace(/\D/g, "");
  let formattedPhone = cleanPhone;
  if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
    formattedPhone = "233" + cleanPhone.slice(1);
  }

  const apiKey = (
    process.env.ARKESEL_API_KEY ||
    process.env.VITE_ARKESEL_API_KEY ||
    process.env.ARKESEL_KEY ||
    ""
  ).trim();

  if (!apiKey) {
    console.warn("[SMS Gateway] ARKESEL_API_KEY not configured. Logging SMS locally:", { phone: formattedPhone, message });
    return {
      success: true,
      message: "SMS simulated (no API key configured)",
      sms_id: "SIM-" + Date.now(),
      isFallback: true,
    };
  }

  try {
    console.log(`[SMS Gateway] Sending Arkesel SMS to ${formattedPhone} (Sender: ${senderId})`);
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: senderId.slice(0, 11),
        message,
        recipients: [formattedPhone],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && (data?.status === "success" || data?.code === "1000")) {
      return {
        success: true,
        message: "SMS dispatched successfully",
        sms_id: data?.data?.sms_id || "ARK-" + Date.now(),
        isFallback: false,
      };
    }

    console.warn("[SMS Gateway] Arkesel response error:", data);
    return {
      success: false,
      message: data?.message || "Failed to send SMS via Arkesel",
    };
  } catch (err: any) {
    console.error("[SMS Gateway] Network error:", err?.message);
    return {
      success: false,
      message: err?.message || "SMS dispatch network error",
    };
  }
}
