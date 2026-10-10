import { db } from "./db";

export interface PaystackVerifyResult {
  success: boolean;
  amount: number; // in GHS (e.g., 25.00)
  reference: string;
  customer_email?: string;
  channel?: string;
  raw?: any;
  message?: string;
}

export async function verifyPaystackTransaction(paystackRef: string): Promise<PaystackVerifyResult> {
  try {
    const settings = await db.getSettings();
    const secretKey = settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || "";

    if (!paystackRef || paystackRef.startsWith("demo_") || paystackRef.startsWith("test_")) {
      return {
        success: false,
        amount: 0,
        reference: paystackRef || "",
        message: "Demo or test reference cannot be verified for live orders",
      };
    }

    const isInvalidSecret = !secretKey || secretKey.length < 20 || secretKey.includes("sample") || secretKey.includes("placeholder");

    if (isInvalidSecret) {
      console.warn(`[Paystack] Paystack secret key is missing or dummy. Cannot verify ref: ${paystackRef}`);
      return {
        success: false,
        amount: 0,
        reference: paystackRef,
        message: "Paystack secret key is not properly configured in Admin Settings.",
      };
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackRef)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const resJson = await response.json();

    if (response.ok && resJson.status === true && resJson.data?.status === "success") {
      // Paystack amount is in pesewas (100 pesewas = 1 GHS)
      const amountInGHS = Number(resJson.data.amount) / 100;
      return {
        success: true,
        amount: amountInGHS,
        reference: resJson.data.reference,
        customer_email: resJson.data.customer?.email,
        channel: resJson.data.channel,
        raw: resJson.data,
      };
    } else {
      return {
        success: false,
        amount: 0,
        reference: paystackRef,
        message: resJson?.message || "Paystack verification failed",
        raw: resJson,
      };
    }
  } catch (error: any) {
    console.error("[Paystack] Verification error:", error);
    return {
      success: false,
      amount: 0,
      reference: paystackRef,
      message: error?.message || "Failed to reach Paystack verification server",
    };
  }
}
