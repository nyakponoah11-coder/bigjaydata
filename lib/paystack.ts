import { db, isValidPaystackSecret } from "./db";

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
    let secretKey = (settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || "").trim();

    // Sanitize secret key: strip quotes, whitespace, accidental 'Bearer '
    if ((secretKey.startsWith('"') && secretKey.endsWith('"')) || (secretKey.startsWith("'") && secretKey.endsWith("'"))) {
      secretKey = secretKey.slice(1, -1).trim();
    }
    if (secretKey.toLowerCase().startsWith("bearer ")) {
      secretKey = secretKey.slice(7).trim();
    }

    // If key in settings is not valid or masked, fallback to environment
    if (!isValidPaystackSecret(secretKey)) {
      if (isValidPaystackSecret(process.env.PAYSTACK_SECRET_KEY)) {
        secretKey = process.env.PAYSTACK_SECRET_KEY!.trim().replace(/['"]/g, "").replace(/^Bearer\s+/i, "");
      }
    }

    if (!paystackRef || paystackRef.startsWith("demo_") || paystackRef.startsWith("test_")) {
      return {
        success: false,
        amount: 0,
        reference: paystackRef || "",
        message: "Demo or test reference cannot be verified for live orders",
      };
    }

    if (secretKey.startsWith("pk_")) {
      return {
        success: false,
        amount: 0,
        reference: paystackRef,
        message: "Invalid Key Configuration: A Public Key (starts with pk_) was entered in the Secret Key field in Admin Settings. Please paste your Paystack Secret Key (starts with sk_).",
      };
    }

    const isInvalidSecret = !isValidPaystackSecret(secretKey);

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
      let failMsg = resJson?.message || "Paystack verification failed";
      if (failMsg === "Invalid key" || response.status === 401) {
        failMsg = "Invalid key: Paystack rejected the Secret Key. Please verify you copied your Secret Key (starts with sk_) from Paystack Dashboard > Settings > API Keys.";
      }
      return {
        success: false,
        amount: 0,
        reference: paystackRef,
        message: failMsg,
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

export interface PaystackTransferParams {
  amount: number; // in GHS
  recipient_phone: string;
  recipient_name: string;
  network: string; // mtn, telecel, at
  reason?: string;
}

export interface PaystackTransferResult {
  success: boolean;
  message: string;
  transfer_code?: string;
  recipient_code?: string;
  status?: string;
  raw?: any;
}

function cleanGhanaMomoNumber(phone: string): string {
  let p = phone.replace(/[^0-9]/g, "");
  if (p.startsWith("233") && p.length === 12) {
    p = "0" + p.substring(3);
  }
  return p;
}

function mapNetworkToPaystackBankCode(network: string): string {
  const n = (network || "").toLowerCase().trim();
  if (n.includes("telecel") || n.includes("voda")) return "VOD";
  if (n.includes("at") || n.includes("tigo") || n.includes("airtel")) return "ATL";
  return "MTN";
}

/**
 * Disburses real Mobile Money payout to an agent via Paystack Transfers API
 */
export async function disbursePaystackTransfer(params: PaystackTransferParams): Promise<PaystackTransferResult> {
  try {
    const settings = await db.getSettings();
    let secretKey = (settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || "").trim().replace(/['"]/g, "").replace(/^Bearer\s+/i, "");
    if (!isValidPaystackSecret(secretKey) && isValidPaystackSecret(process.env.PAYSTACK_SECRET_KEY)) {
      secretKey = process.env.PAYSTACK_SECRET_KEY!.trim().replace(/['"]/g, "").replace(/^Bearer\s+/i, "");
    }

    if (!isValidPaystackSecret(secretKey)) {
      return {
        success: false,
        message: "Paystack secret key is missing or invalid in Admin Settings. Please configure your live Paystack secret key.",
      };
    }

    const cleanPhone = cleanGhanaMomoNumber(params.recipient_phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        message: `Invalid Mobile Money number format: ${params.recipient_phone}. Must be a valid 10-digit Ghana number.`,
      };
    }

    const bankCode = mapNetworkToPaystackBankCode(params.network);
    const amountInPesewas = Math.round(Number(params.amount) * 100);

    if (isNaN(amountInPesewas) || amountInPesewas <= 0) {
      return {
        success: false,
        message: "Invalid payout amount specified.",
      };
    }

    // 1. Create or get transfer recipient on Paystack
    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "mobile_money",
        name: params.recipient_name?.trim() || "Agent Partner",
        account_number: cleanPhone,
        bank_code: bankCode,
        currency: "GHS",
        description: `MoMo Payout - ${params.network.toUpperCase()} (${cleanPhone})`,
      }),
    });

    const recipientData = await recipientRes.json().catch(() => null);

    if (!recipientRes.ok || !recipientData?.status || !recipientData.data?.recipient_code) {
      const errMsg = recipientData?.message || "Failed to create Mobile Money recipient on Paystack.";
      console.error("[Paystack Transfer Recipient Error]:", recipientData);
      return {
        success: false,
        message: errMsg,
        raw: recipientData,
      };
    }

    const recipientCode = recipientData.data.recipient_code;

    // 2. Initiate outbound transfer
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: amountInPesewas,
        recipient: recipientCode,
        reason: params.reason || `Agent Profit Payout - GHS ${Number(params.amount).toFixed(2)}`,
        currency: "GHS",
      }),
    });

    const transferData = await transferRes.json().catch(() => null);

    if (!transferRes.ok || !transferData?.status) {
      const errMsg = transferData?.message || "Paystack transfer request failed.";
      console.error("[Paystack Transfer Initiate Error]:", transferData);
      return {
        success: false,
        message: errMsg,
        recipient_code: recipientCode,
        raw: transferData,
      };
    }

    const transferCode = transferData.data?.transfer_code;
    const transferStatus = transferData.data?.status || "pending";

    return {
      success: true,
      message: `Paystack payout of GHS ${Number(params.amount).toFixed(2)} initiated successfully to ${cleanPhone} (${params.network.toUpperCase()}). Status: ${transferStatus}`,
      transfer_code: transferCode,
      recipient_code: recipientCode,
      status: transferStatus,
      raw: transferData.data,
    };
  } catch (error: any) {
    console.error("[Paystack Transfer Exception]:", error);
    return {
      success: false,
      message: error?.message || "Failed to connect to Paystack Transfer service.",
    };
  }
}

/**
 * Check Paystack balance in GHS
 */
export async function checkPaystackBalance(): Promise<{ success: boolean; balanceGHS?: number; message?: string }> {
  try {
    const settings = await db.getSettings();
    let secretKey = (settings.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || "").trim().replace(/['"]/g, "").replace(/^Bearer\s+/i, "");
    if (!isValidPaystackSecret(secretKey) && isValidPaystackSecret(process.env.PAYSTACK_SECRET_KEY)) {
      secretKey = process.env.PAYSTACK_SECRET_KEY!.trim().replace(/['"]/g, "").replace(/^Bearer\s+/i, "");
    }
    if (!isValidPaystackSecret(secretKey)) return { success: false, message: "Paystack secret key is missing or invalid" };

    const res = await fetch("https://api.paystack.co/balance", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.status && Array.isArray(json.data)) {
      const ghsBalance = json.data.find((b: any) => b.currency === "GHS");
      const balanceGHS = ghsBalance ? Number(ghsBalance.balance) / 100 : 0;
      return { success: true, balanceGHS };
    }
    return { success: false, message: json?.message || "Failed to fetch balance" };
  } catch (err: any) {
    return { success: false, message: err?.message };
  }
}
