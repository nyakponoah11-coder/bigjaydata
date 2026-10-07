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
export function mapNetworkToDataMart(network: string): "YELLO" | "TELECEL" | "AT_PREMIUM" | string {
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
 * Resolves DataMart purchase endpoint URL
 */
function resolvePurchaseUrl(configuredUrl: string): string {
  const base = (configuredUrl || "https://api.datamartgh.shop/api").replace(/\/$/, "");
  if (base.endsWith("/purchase")) return base;
  if (base.endsWith("/api")) return `${base}/purchase`;
  return `${base}/api/purchase`;
}

/**
 * Dispatches automated data purchase to DataMart API.
 * Endpoint: POST /purchase
 * Headers: X-API-Key, X-Idempotency-Key, Content-Type
 * Body: { phoneNumber, network, capacity, gateway: "wallet" }
 */
export async function sendDataMartDelivery(params: DataMartDeliveryParams): Promise<DataMartResult> {
  try {
    const settings = await db.getSettings();
    const apiKey = settings.datamart_api_key || process.env.DATAMART_API_KEY || "";
    const rawUrl = settings.datamart_api_url || process.env.DATAMART_API_URL || "https://api.datamartgh.shop/api";
    const purchaseUrl = resolvePurchaseUrl(rawUrl);

    const formattedPhone = formatGhanaPhone(params.phone);
    const datamartNetwork = mapNetworkToDataMart(params.network);
    const capacityGb = extractCapacityInGb(params.package_size);
    const idempotencyKey = params.idempotency_key || crypto.randomUUID();

    const requestBody = {
      phoneNumber: formattedPhone,
      network: datamartNetwork,
      capacity: capacityGb,
      gateway: "wallet",
    };

    console.log(
      `[DataMart API] Sending purchase to ${purchaseUrl}:`,
      JSON.stringify(requestBody)
    );

    // Sandbox / Test Mode fallback if no real live API key is configured
    const isMockOrTest =
      !apiKey ||
      apiKey.includes("placeholder") ||
      apiKey.includes("sample") ||
      apiKey.startsWith("dm_test_");

    if (isMockOrTest) {
      console.log("[DataMart API] Simulated/Sandbox mode active (no live dm_live key). Simulating success.");
      return {
        success: true,
        message: "Data bundle purchased successfully (Sandbox Simulation)",
        datamart_id: "DM-SIM-" + Math.floor(100000 + Math.random() * 900000),
        order_reference: "GN-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        raw_response: {
          status: "success",
          message: "Data bundle purchased successfully (Simulation)",
          data: {
            purchaseId: "sim_" + Date.now(),
            orderReference: "GN-SIM-" + params.reference,
            network: datamartNetwork,
            capacity: Number(capacityGb),
            orderStatus: "completed",
            processingMethod: "standard",
          },
        },
      };
    }

    // Live HTTP Call to DataMart official purchase endpoint
    const response = await fetch(purchaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey.trim(),
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json().catch(() => null);

    console.log(`[DataMart API] Response status ${response.status}:`, JSON.stringify(responseData));

    if (response.ok && responseData?.status === "success") {
      const dataPayload = responseData.data || {};
      return {
        success: true,
        message: responseData.message || "Data bundle purchased successfully",
        datamart_id: dataPayload.purchaseId || dataPayload.orderReference || `DM-${Date.now()}`,
        order_reference: dataPayload.orderReference,
        raw_response: responseData,
      };
    }

    // Error or failure from DataMart
    const errorMessage =
      responseData?.message ||
      (responseData?.status === "error" ? "DataMart purchase rejected" : `DataMart Error (${response.status})`);

    console.error("[DataMart API] Delivery failed:", errorMessage, responseData);

    return {
      success: false,
      message: errorMessage,
      raw_response: responseData || { status: response.status, statusText: response.statusText },
    };
  } catch (error: any) {
    console.error("[DataMart API] Execution exception:", error);
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
    const apiKey = settings.datamart_api_key || process.env.DATAMART_API_KEY || "";
    const rawUrl = (settings.datamart_api_url || process.env.DATAMART_API_URL || "https://api.datamartgh.shop/api").replace(/\/$/, "");
    const base = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;
    const statusUrl = `${base}/order-status/${encodeURIComponent(orderReference)}`;

    if (!apiKey || apiKey.startsWith("dm_test_")) {
      return { status: "success", data: { orderStatus: "completed" } };
    }

    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey.trim(),
      },
    });

    return await response.json().catch(() => null);
  } catch (err) {
    console.error("[DataMart API] Status check exception:", err);
    return null;
  }
}
