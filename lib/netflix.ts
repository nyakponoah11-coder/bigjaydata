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
const DEFAULT_NETFLIX_API_KEY = "";

export interface NetflixPartnerInfoResult {
  success: boolean;
  balance: number;
  currency: string;
  wholesalePrice: number;
  partnerName: string;
  availableAccounts: number;
  accountEmail?: string;
  error?: string;
}

export async function getNetflixConfig() {
  const settings = await db.getSettings();
  const apiKey = (settings.netflix_api_key || process.env.DATA1_NETFLIX_API_KEY || "").trim();
  const apiUrl = (settings.netflix_api_url || DEFAULT_NETFLIX_API_URL).trim().replace(/\/+$/, "");
  const isEnabled = settings.netflix_enabled !== false;
  const retailPrice = Number(settings.netflix_price) > 0 ? Number(settings.netflix_price) : 25;
  const agentBasePrice = Number(settings.netflix_agent_base_price) > 0 ? Number(settings.netflix_agent_base_price) : 18;
  const fallbackBalance = settings.netflix_balance !== undefined ? Number(settings.netflix_balance) : 0;

  return {
    apiKey,
    apiUrl,
    isEnabled,
    retailPrice,
    agentBasePrice,
    wholesaleCost,
    fallbackBalance,
  };
}

/**
 * Fetches real-time partner wallet balance and account status directly from Data1
 */
export async function fetchNetflixPartnerInfo(): Promise<NetflixPartnerInfoResult> {
  const config = await getNetflixConfig();
  const fallbackBal = Number(config.fallbackBalance ?? 0);

  if (!config.apiKey) {
    return {
      success: fallbackBal > 0,
      balance: fallbackBal,
      currency: "GHS",
      wholesalePrice: 15,
      partnerName: "Bigjay",
      availableAccounts: Math.floor(fallbackBal / 15),
      error: "Data1 Netflix API key not configured",
    };
  }

  try {
    const res = await fetch("https://www.data1gh.com/api/partner/info", {
      method: "GET",
      headers: {
        "x-api-key": config.apiKey,
        "Accept": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    const data = await res.json().catch(() => ({}));
    console.log("[Data1 Partner Info]", res.status, JSON.stringify(data));

    // Extract balance from any standard or vendor format
    const candidateBalance =
      data.partner?.wallet_balance ??
      data.partner?.balance ??
      data.wallet_balance ??
      data.balance ??
      data.data?.wallet_balance ??
      data.data?.balance ??
      data.data?.partner?.wallet_balance ??
      data.data?.partner?.balance ??
      data.wallet?.balance;

    if (candidateBalance !== undefined && candidateBalance !== null && !isNaN(Number(candidateBalance))) {
      const balance = Number(candidateBalance);
      const wholesalePrice = Number(data.partner?.wholesale_price ?? data.wholesale_price ?? 15);
      const partnerName = data.partner?.name ?? data.name ?? "Bigjay";
      const accountEmail = data.netflix?.account_email ?? data.account_email;

      // Sync fresh live balance to database settings in background
      db.updateSettings({ netflix_balance: balance }).catch(() => {});

      return {
        success: true,
        balance,
        currency: data.partner?.currency ?? data.currency ?? "GHS",
        wholesalePrice,
        partnerName,
        availableAccounts: wholesalePrice > 0 ? Math.floor(balance / wholesalePrice) : 0,
        accountEmail,
      };
    }

    // If API responded but balance field not parsed, fallback to saved balance
    return {
      success: fallbackBal > 0,
      balance: fallbackBal,
      currency: "GHS",
      wholesalePrice: 15,
      partnerName: "Bigjay",
      availableAccounts: Math.floor(fallbackBal / 15),
      error: data.message || "Could not retrieve Data1 partner info",
    };
  } catch (err: any) {
    console.warn("[Data1 Partner Info Exception]:", err?.message);
    return {
      success: fallbackBal > 0,
      balance: fallbackBal,
      currency: "GHS",
      wholesalePrice: 15,
      partnerName: "Bigjay",
      availableAccounts: Math.floor(fallbackBal / 15),
      error: err?.message || "Failed to contact Data1 partner API",
    };
  }
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
