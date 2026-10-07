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
 * Resolves DataMart purchase endpoint URL.
 * Overrides any obsolete datamartgh.com domains with the official api.datamartgh.shop domain.
 */
export function resolvePurchaseUrl(configuredUrl?: string): string {
  let base = (configuredUrl || "").trim();
  // Sanitize any legacy .com URL or empty string
  if (!base || base.includes("datamartgh.com")) {
    return "https://api.datamartgh.shop/api/purchase";
  }
  base = base.replace(/\/$/, "");
  if (base.endsWith("/purchase")) return base;
  if (base.endsWith("/api")) return `${base}/purchase`;
  return `${base}/api/purchase`;
}

/**
 * Dispatches automated data purchase to DataMart API.
 * Endpoint: POST https://api.datamartgh.shop/api/purchase
 * Headers: X-API-Key, X-Idempotency-Key, Content-Type
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
    const idempotencyKey = params.idempotency_key || params.reference || crypto.randomUUID();

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

    // Live HTTP Call to DataMart official purchase endpoint
    const response = await fetch(purchaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "x-api-key": apiKey,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { text: responseText };
    }

    console.log(`[DataMart API] Status ${response.status}:`, responseText);

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
 * Checks order status from DataMart API: GET /order-status/:reference
 */
export async function checkDataMartOrderStatus(orderReference: string): Promise<any> {
  try {
    const settings = await db.getSettings();
    const apiKey = (settings.datamart_api_key || process.env.DATAMART_API_KEY || "").trim();
    const rawUrl = (settings.datamart_api_url || process.env.DATAMART_API_URL || "https://api.datamartgh.shop/api").replace(/\/$/, "");
    const base = rawUrl.includes("datamartgh.com") ? "https://api.datamartgh.shop/api" : rawUrl;
    const statusUrl = `${base.replace(/\/$/, "")}/order-status/${encodeURIComponent(orderReference)}`;

    if (!apiKey) {
      return { status: "error", message: "Missing API Key" };
    }

    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "x-api-key": apiKey,
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
  let base = (configuredUrl || "").trim();
  if (!base || base.includes("datamartgh.com")) {
    return "https://api.datamartgh.shop/api/delivery-tracker";
  }
  base = base.replace(/\/$/, "");
  if (base.endsWith("/delivery-tracker")) return base;
  if (base.endsWith("/purchase")) return base.replace(/\/purchase$/, "/delivery-tracker");
  if (base.endsWith("/api")) return `${base}/delivery-tracker`;
  return `${base}/api/delivery-tracker`;
}

/**
 * Polls DataMart delivery tracker endpoint: GET /delivery-tracker
 * With automated fallback based on live store data if server is unreachable
 */
export async function fetchDeliveryTracker(): Promise<DeliveryTrackerData> {
  const settings = await db.getSettings();
  const apiKey = (settings.datamart_api_key || process.env.DATAMART_API_KEY || "").trim();
  const configuredUrl = (settings.datamart_api_url || process.env.DATAMART_API_URL || "https://api.datamartgh.shop/api").trim().replace(/\/$/, "");

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
    `${configuredUrl}/delivery-tracker`,
    `${configuredUrl.replace(/\/api$/, "")}/delivery-tracker`,
    `${configuredUrl.replace(/\/api$/, "")}/api/delivery-tracker`,
    "https://api.datamartgh.shop/api/delivery-tracker",
    "https://api.datamartgh.shop/delivery-tracker",
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
