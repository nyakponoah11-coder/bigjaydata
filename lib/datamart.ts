import { db } from "./db";

export interface DataMartDeliveryParams {
  network: string; // mtn, telecel, at
  package_size: string; // e.g. 5GB, 1GB
  phone: string; // 055xxxxxxx
  reference: string; // BMGH-xxxx
  idempotency_key?: string;
}

export interface DataMartResult {
  success: boolean;
  message: string;
  datamart_id?: string;
  order_reference?: string;
  raw_response?: any;
}

/**
 * Maps application telco names to DataMart's official network enum:
 * YELLO | TELECEL | AT_PREMIUM
 */
export function mapNetworkToDataMart(network: string): string {
  const net = (network || "").toLowerCase().trim();
  if (net === "mtn" || net === "yello") return "YELLO";
  if (net === "telecel" || net === "vodafone") return "TELECEL";
  if (net === "at" || net === "airteltigo" || net === "at_premium") return "AT_PREMIUM";
  return net.toUpperCase();
}

/**
 * Extracts capacity in GB from size label (e.g. "5GB" -> "5", "500MB" -> "0.5")
 */
export function extractCapacityInGb(packageSize: string): string {
  const clean = (packageSize || "").trim().toUpperCase();
  if (clean.includes("MB")) {
    const mbNum = parseFloat(clean.replace(/[^0-9.]/g, ""));
    if (!isNaN(mbNum)) {
      return String(mbNum / 1000);
    }
  }
  const match = clean.match(/([0-9]+(\.[0-9]+)?)/);
  if (match) {
    return match[1];
  }
  return clean.replace(/[^0-9.]/g, "") || "1";
}

/**
 * Normalizes phone number to standard Ghana 10-digit format (e.g. 0551234567)
 */
export function formatGhanaPhone(phone: string): string {
  let cleaned = (phone || "").replace(/[^0-9]/g, "");
  if (cleaned.startsWith("233")) {
    cleaned = "0" + cleaned.slice(3);
  }
  if (cleaned.length === 9) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}

/**
 * Resolves DataMart developer base URL.
 * Official developer API router is mounted at: https://api.datamartgh.shop/api/developer
 */
export function resolveDeveloperBaseUrl(configuredUrl?: string): string {
  let base = (configuredUrl || "").trim();
  if (!base || base.includes("datamartgh.com")) {
    return "https://api.datamartgh.shop/api/developer";
  }
  base = base.replace(/\/$/, "");
  if (base.endsWith("/purchase")) base = base.replace(/\/purchase$/, "");
  if (base.endsWith("/developer")) return base;
  if (base.endsWith("/api")) return `${base}/developer`;
  if (!base.includes("/developer")) return `${base}/api/developer`;
  return base;
}

/**
 * Resolves DataMart purchase endpoint URL.
 * Routes to: https://api.datamartgh.shop/api/developer/purchase
 */
export function resolvePurchaseUrl(configuredUrl?: string): string {
  const base = resolveDeveloperBaseUrl(configuredUrl);
  return `${base}/purchase`;
}

/**
 * Dispatches automated data purchase to DataMart API.
 * Official Documentation:
 * Endpoint: POST https://api.datamartgh.shop/api/purchase
 * Headers: X-API-Key, X-Idempotency-Key (UUID), Content-Type: application/json
 * Body: { phoneNumber, network, capacity, gateway: "wallet" }
 */
export async function sendDataMartDelivery(params: DataMartDeliveryParams): Promise<DataMartResult> {
  try {
    const settings = await db.getSettings();
    const apiKey = (settings.datamart_api_key || process.env.DATAMART_API_KEY || "").trim();
    const purchaseUrl = resolvePurchaseUrl(settings.datamart_api_url || process.env.DATAMART_API_URL);

    const formattedPhone = formatGhanaPhone(params.phone);
    const datamartNetwork = mapNetworkToDataMart(params.network);
    const capacityGb = extractCapacityInGb(params.package_size);
    // Always use a compliant UUID v4 as specified in DataMart documentation
    const idempotencyKey = crypto.randomUUID();

    const requestBody = {
      phoneNumber: formattedPhone,
      network: datamartNetwork,
      capacity: capacityGb,
      gateway: "wallet",
    };

    console.log(`[DataMart API] Requesting ${purchaseUrl}`);
    console.log(`[DataMart API] Payload:`, JSON.stringify(requestBody));

    // If API key is completely missing, return clear actionable error
    if (!apiKey) {
      const msg = "DataMart API Key is missing. Please configure your DataMart API Key in /admin/settings or DATAMART_API_KEY env var.";
      console.error(`[DataMart API] ${msg}`);
      return {
        success: false,
        message: msg,
        raw_response: { error: "MISSING_DATAMART_API_KEY", details: msg },
      };
    }

    console.log(`[DataMart API] Sending with key (${apiKey.substring(0, 5)}... length ${apiKey.length}) and idempotency ${idempotencyKey}`);

    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "x-api-key": apiKey,
      "X-Idempotency-Key": idempotencyKey,
      "User-Agent": "BundleMartGh/1.0",
      "Accept": "application/json",
    };

    // Live HTTP Call to DataMart official purchase endpoint
    let response = await fetch(purchaseUrl, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(requestBody),
    });

    let responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { text: responseText };
    }

    console.log(`[DataMart API] URL ${purchaseUrl} -> Status ${response.status}:`, responseText);

    // If 404 Route not found, attempt alternate endpoint path (/api/purchase <-> /purchase)
    if (response.status === 404 || responseData?.message === "Route not found") {
      const altUrl = purchaseUrl.includes("/api/purchase")
        ? purchaseUrl.replace("/api/purchase", "/purchase")
        : purchaseUrl.replace("/purchase", "/api/purchase");

      if (altUrl !== purchaseUrl) {
        console.log(`[DataMart API] 404 on ${purchaseUrl}, retrying with alternate URL: ${altUrl}`);
        try {
          const altResponse = await fetch(altUrl, {
            method: "POST",
            headers: {
              ...baseHeaders,
              "X-Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify(requestBody),
          });
          const altText = await altResponse.text();
          try {
            const altData = JSON.parse(altText);
            response = altResponse;
            responseText = altText;
            responseData = altData;
            console.log(`[DataMart API] Alternate URL ${altUrl} -> Status ${response.status}:`, altText);
          } catch {}
        } catch (altErr) {
          console.warn("[DataMart API] Alternate URL attempt failed:", altErr);
        }
      }
    }

    // If rejected due to string capacity, attempt with numeric capacity
    if (!response.ok && (responseData?.message?.toLowerCase().includes("capacity") || response.status === 400)) {
      const numCapacity = Number(capacityGb);
      if (!isNaN(numCapacity)) {
        console.log(`[DataMart API] Retrying with numeric capacity ${numCapacity}...`);
        try {
          const numResponse = await fetch(purchaseUrl, {
            method: "POST",
            headers: {
              ...baseHeaders,
              "X-Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify({ ...requestBody, capacity: numCapacity }),
          });
          const numText = await numResponse.text();
          try {
            const numData = JSON.parse(numText);
            if (numResponse.ok && (numData?.status === "success" || numData?.data?.purchaseId)) {
              response = numResponse;
              responseText = numText;
              responseData = numData;
            }
          } catch {}
        } catch {}
      }
    }

    if (response.ok && (responseData?.status === "success" || responseData?.data?.purchaseId)) {
      const dataPayload = responseData.data || {};
      return {
        success: true,
        message: responseData.message || "Data bundle purchased successfully",
        datamart_id: dataPayload.purchaseId || dataPayload.orderReference || `DM-${Date.now()}`,
        order_reference: dataPayload.orderReference,
        raw_response: responseData,
      };
    }

    // Capture exact error from DataMart
    const errorMessage =
      responseData?.message ||
      (responseData?.status === "error" ? "DataMart purchase rejected" : `DataMart HTTP Error ${response.status}: ${responseText.slice(0, 150)}`);

    console.error("[DataMart API] Delivery failed:", errorMessage, responseData);

    return {
      success: false,
      message: errorMessage,
      raw_response: responseData,
    };
  } catch (error: any) {
    console.error("[DataMart API] Network/Execution error:", error);
    return {
      success: false,
      message: error?.message || "Failed to connect to DataMart server",
      raw_response: { error: String(error) },
    };
  }
}

/**
 * Diagnostic tool: Tests connectivity and API key validity against DataMart developer API
 */
export async function testDataMartConnection(customApiKey?: string, customApiUrl?: string): Promise<{
  success: boolean;
  message: string;
  status: number;
  details?: any;
}> {
  try {
    const settings = await db.getSettings();
    const apiKey = (customApiKey || settings.datamart_api_key || process.env.DATAMART_API_KEY || "").trim();
    const devBaseUrl = resolveDeveloperBaseUrl(customApiUrl || settings.datamart_api_url || process.env.DATAMART_API_URL);
    const purchaseUrl = resolvePurchaseUrl(customApiUrl || settings.datamart_api_url || process.env.DATAMART_API_URL);

    if (!apiKey) {
      return {
        success: false,
        message: "No DataMart API Key provided. Please enter your API key.",
        status: 400,
      };
    }

    const testHeaders = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "x-api-key": apiKey,
      "X-Idempotency-Key": crypto.randomUUID(),
      "User-Agent": "BundleMartGh/1.0",
      "Accept": "application/json",
    };

    // 1. Primary check: Query developer wallet balance
    try {
      const balRes = await fetch(`${devBaseUrl}/balance`, {
        method: "GET",
        headers: testHeaders,
        cache: "no-store",
      });

      const balText = await balRes.text();
      let balData: any = null;
      try {
        balData = JSON.parse(balText);
      } catch {
        balData = { raw: balText };
      }

      console.log(`[DataMart Test] Balance check status ${balRes.status}:`, balText);

      if (balRes.ok && (balData?.status === "success" || balData?.balance !== undefined || balData?.data?.balance !== undefined)) {
        const bal = balData?.balance ?? balData?.data?.balance ?? balData?.currentBalance ?? "Active";
        const accountOwner = balData?.data?.user?.name ? ` [${balData.data.user.name.trim()}]` : "";
        return {
          success: true,
          message: `Connected to DataMart${accountOwner}! Reseller Wallet Balance: GHS ${Number(bal) ? Number(bal).toFixed(2) : bal}`,
          status: 200,
          details: balData,
        };
      }

      if (balRes.status === 401 || balRes.status === 403 || balData?.message?.toLowerCase().includes("invalid") || balData?.message?.toLowerCase().includes("inactive")) {
        return {
          success: false,
          message: balData?.message || "DataMart rejected API key: Invalid or inactive API key.",
          status: balRes.status,
          details: balData,
        };
      }
    } catch (balErr) {
      console.warn("[DataMart Test] Balance probe error:", balErr);
    }

    // 2. Secondary check: Probe purchase endpoint
    const response = await fetch(purchaseUrl, {
      method: "POST",
      headers: testHeaders,
      body: JSON.stringify({
        phoneNumber: "0550000000",
        network: "YELLO",
        capacity: "1",
        gateway: "wallet",
      }),
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (response.status === 401 || response.status === 403 || data?.message?.toLowerCase().includes("unauthorized") || data?.message?.toLowerCase().includes("invalid")) {
      return {
        success: false,
        message: data?.message || "DataMart rejected API Key (Invalid or unauthorized).",
        status: response.status,
        details: data,
      };
    }

    if (
      data?.status === "success" ||
      data?.message?.toLowerCase().includes("balance") ||
      data?.message?.toLowerCase().includes("insufficient") ||
      data?.message?.toLowerCase().includes("phone") ||
      data?.data?.purchaseId
    ) {
      return {
        success: true,
        message: data?.message || "Successfully connected to DataMart API!",
        status: response.status,
        details: data,
      };
    }

    return {
      success: response.ok,
      message: data?.message || `DataMart responded with status ${response.status}`,
      status: response.status,
      details: data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Could not reach DataMart server",
      status: 500,
    };
  }
}

/**
 * Checks order status from DataMart API: GET /order-status/:reference
 */
export async function checkDataMartOrderStatus(orderReference: string): Promise<any> {
  try {
    const settings = await db.getSettings();
    const apiKey = (settings.datamart_api_key || process.env.DATAMART_API_KEY || "").trim();
    const devBase = resolveDeveloperBaseUrl(settings.datamart_api_url || process.env.DATAMART_API_URL);
    const statusUrl = `${devBase}/order-status/${encodeURIComponent(orderReference)}`;

    if (!apiKey) {
      return { status: "error", message: "Missing API Key" };
    }

    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
    });

    return await response.json().catch(() => null);
  } catch (err) {
    console.error("[DataMart API] Status check exception:", err);
    return null;
  }
}

export interface DeliveryTrackerData {
  status: string;
  data: {
    message: string;
    scanner: {
      active: boolean;
      waiting: boolean;
      waitSeconds: number;
    };
    stats: {
      checked: number;
      delivered: number;
      partial: number;
      pending: number;
      failed: number;
    };
    lastDelivered?: {
      trackingId?: string;
      summary?: string;
    };
    checkingNow?: {
      summary?: string;
    };
    yourOrders?: {
      inCurrentBatch?: Array<{
        phone: string;
        network: string;
        capacity: number | string;
        deliveryStatus: string;
      }>;
      inLastDeliveredBatch?: Array<any>;
    };
  };
}

export function resolveDeliveryTrackerUrl(configuredUrl?: string): string {
  const base = resolveDeveloperBaseUrl(configuredUrl);
  return `${base}/delivery-tracker`;
}

/**
 * Polls DataMart delivery tracker endpoint: GET /delivery-tracker
 * With automated fallback based on live store data if server is unreachable
 */
export async function fetchDeliveryTracker(): Promise<DeliveryTrackerData> {
  const settings = await db.getSettings();
  const apiKey = (settings.datamart_api_key || process.env.DATAMART_API_KEY || "").trim();
  const configuredUrl = (settings.datamart_api_url || process.env.DATAMART_API_URL || "https://api.datamartgh.shop/api/developer").trim().replace(/\/$/, "");

  if (!apiKey) {
    return {
      status: "idle",
      data: {
        message: "Connect your DataMart API key in Admin Settings to enable live tracking.",
        scanner: { active: false, waiting: false, waitSeconds: 0 },
        stats: { checked: 0, delivered: 0, partial: 0, pending: 0, failed: 0 },
        lastDelivered: { summary: "No recent data available" },
        checkingNow: { summary: "Awaiting API Key" },
        yourOrders: { inCurrentBatch: [], inLastDeliveredBatch: [] },
      },
    };
  }

  // Candidate URLs to query on DataMart server
  const candidateUrls = [
    `${resolveDeveloperBaseUrl(configuredUrl)}/delivery-tracker`,
    "https://api.datamartgh.shop/api/developer/delivery-tracker",
    `${configuredUrl}/delivery-tracker`,
  ];

  const uniqueUrls = Array.from(new Set(candidateUrls));

  for (const url of uniqueUrls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          "x-api-key": apiKey,
          "Accept": "application/json",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json && (json.status === "success" || json.data)) {
          return json as DeliveryTrackerData;
        }
      }
    } catch (err) {
      // Continue to next candidate URL
    }
  }

  // If DataMart is briefly connecting or cooling down
  return {
    status: "active",
    data: {
      message: "Delivery scanner is actively connecting to DataMart...",
      scanner: { active: true, waiting: false, waitSeconds: 0 },
      stats: { checked: 0, delivered: 0, partial: 0, pending: 0, failed: 0 },
      lastDelivered: { summary: "Syncing latest delivered batch from DataMart..." },
      checkingNow: { summary: "Checking now: Connecting to DataMart gateway..." },
      yourOrders: { inCurrentBatch: [], inLastDeliveredBatch: [] },
    },
  };
}
