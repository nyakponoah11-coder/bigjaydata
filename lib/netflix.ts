import { db } from "./db";

export interface NetflixOrderParams {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  partner_reference: string;
  duration_days?: number;
}

export interface NetflixOrderResult {
  success: boolean;
  reference?: string;
  partner_reference?: string;
  netflix_email?: string;
  status?: string;
  duration_days?: number;
  expires_at?: string;
  instructions?: string[];
  message?: string;
  error?: string;
  raw?: any;
}

export interface NetflixFetchCodeResult {
  success: boolean;
  status: "success" | "pending" | "error";
  code?: string | null;
  netflix_email?: string;
  expires_in?: string;
  error?: string;
  retryable?: boolean;
}

const DEFAULT_NETFLIX_API_URL = "https://www.data1gh.com/api/partner/netflix";
const DEFAULT_NETFLIX_API_KEY = "d1_live_nf_bigjay_1zwxy0f7zqi3";

export async function getNetflixConfig() {
  const settings = await db.getSettings();
  const apiKey = (settings.netflix_api_key || process.env.DATA1_NETFLIX_API_KEY || DEFAULT_NETFLIX_API_KEY).trim();
  const apiUrl = (settings.netflix_api_url || DEFAULT_NETFLIX_API_URL).trim().replace(/\/+$/, "");
  const isEnabled = settings.netflix_enabled !== false;
  const retailPrice = Number(settings.netflix_price) > 0 ? Number(settings.netflix_price) : 25;
  const agentBasePrice = Number(settings.netflix_agent_base_price) > 0 ? Number(settings.netflix_agent_base_price) : 18;
  const wholesaleCost = 15; // GH₵ 15 Data1 wholesale rate
  const balance = Number(settings.netflix_balance !== undefined ? settings.netflix_balance : 150);

  return {
    apiKey,
    apiUrl,
    isEnabled,
    retailPrice,
    agentBasePrice,
    wholesaleCost,
    balance,
  };
}

export async function updateNetflixBalance(newBalance: number) {
  const clean = Math.max(0, Number(newBalance) || 0);
  return await db.updateSettings({ netflix_balance: clean });
}

export async function deductNetflixBalance(amount: number = 15) {
  const settings = await db.getSettings();
  const current = Number(settings.netflix_balance !== undefined ? settings.netflix_balance : 150);
  const updated = Math.max(0, Number((current - amount).toFixed(2)));
  return await db.updateSettings({ netflix_balance: updated });
}

export async function topUpNetflixBalance(amount: number) {
  const settings = await db.getSettings();
  const current = Number(settings.netflix_balance !== undefined ? settings.netflix_balance : 0);
  const updated = Number((current + Number(amount)).toFixed(2));
  return await db.updateSettings({ netflix_balance: updated });
}

/**
 * Creates a Netflix 30-Day access profile on Data1 partner API
 */
export async function createNetflixOrder(params: NetflixOrderParams): Promise<NetflixOrderResult> {
  const config = await getNetflixConfig();

  if (!config.apiKey) {
    return {
      success: false,
      error: "Data1 Netflix API key is not configured.",
    };
  }

  const endpoint = `${config.apiUrl}/order`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_name: params.customer_name || "Customer",
        customer_phone: params.customer_phone,
        customer_email: params.customer_email,
        partner_reference: params.partner_reference,
        duration_days: params.duration_days || 30,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (data.status === "success" && data.order) {
      // Auto-deduct wholesale rate from tracked Netflix partner balance
      try {
        await deductNetflixBalance(15);
      } catch (deductErr) {
        console.warn("[Netflix Balance] Deduct warning:", deductErr);
      }

      return {
        success: true,
        reference: data.order.reference,
        partner_reference: data.order.partner_reference,
        netflix_email: data.order.netflix_email,
        status: data.order.status || "active",
        duration_days: data.order.duration_days || 30,
        expires_at: data.order.expires_at,
        instructions: data.order.instructions,
        message: data.message || "Netflix 30-Day access created successfully.",
        raw: data,
      };
    }

    return {
      success: false,
      error: data.error || data.message || "Failed to create Netflix access on partner gateway.",
      raw: data,
    };
  } catch (err: any) {
    console.error("[Netflix Partner API] Order exception:", err);
    return {
      success: false,
      error: err?.message || "Network error connecting to Netflix partner API.",
    };
  }
}

/**
 * Fetches the 4-digit Netflix sign-in code for a customer's order reference
 */
export async function fetchNetflixSignInCode(reference: string): Promise<NetflixFetchCodeResult> {
  const config = await getNetflixConfig();

  if (!config.apiKey) {
    return {
      success: false,
      status: "error",
      error: "Netflix API key is not configured.",
    };
  }

  const endpoint = `${config.apiUrl}/fetch-code`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reference }),
    });

    const data = await res.json().catch(() => ({}));

    if (data.status === "success" && data.code) {
      return {
        success: true,
        status: "success",
        code: String(data.code),
        netflix_email: data.netflix_email,
        expires_in: data.expires_in || "15 minutes",
      };
    }

    if (data.status === "pending" || data.retryable) {
      return {
        success: false,
        status: "pending",
        retryable: true,
        netflix_email: data.netflix_email,
        error:
          data.error ||
          "No recent sign-in code email found in mailbox. Enter the email on Netflix, click 'Send sign-in code', wait 20 seconds, and request again.",
      };
    }

    return {
      success: false,
      status: "error",
      error: data.error || data.message || "Failed to fetch Netflix sign-in code.",
    };
  } catch (err: any) {
    console.error("[Netflix Partner API] Fetch Code exception:", err);
    return {
      success: false,
      status: "error",
      error: err?.message || "Network error fetching Netflix sign-in code.",
    };
  }
}

/**
 * Tests Data1 Netflix API Key connectivity
 */
export async function testNetflixConnection(customKey?: string) {
  const config = await getNetflixConfig();
  const keyToTest = (customKey || config.apiKey).trim();

  if (!keyToTest) {
    return {
      success: false,
      message: "API Key cannot be empty.",
    };
  }

  try {
    // Send request to status endpoint to verify authorization
    const res = await fetch(`${config.apiUrl}/status`, {
      method: "POST",
      headers: {
        "x-api-key": keyToTest,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await res.json().catch(() => ({}));

    // If API key is valid, Data1 responds with 200/400 validation error (e.g. Missing required 'reference' parameter)
    // If invalid, it returns 401 Unauthorized or error
    if (res.status === 401 || data.error?.toLowerCase().includes("invalid api key") || data.error?.toLowerCase().includes("unauthorized")) {
      return {
        success: false,
        message: "Invalid Data1 API Key. Authorization rejected by partner gateway.",
      };
    }

    return {
      success: true,
      message: "Data1 Netflix Reseller API connected successfully! Partner authentication verified.",
      partner: "Bigjay",
      wholesale_rate: "GH₵ 15 per 30-day access",
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to Data1 API: ${err?.message || err}`,
    };
  }
}
