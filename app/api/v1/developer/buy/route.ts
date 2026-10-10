import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getApiKey(req: Request): string | null {
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.substring(7).trim();
  }

  return null;
}

export async function POST(req: Request) {
  try {
    // 1. Check Master Switch
    const config = await db.getDeveloperApiConfig();
    if (!config.is_enabled) {
      return NextResponse.json(
        {
          success: false,
          error: "service_disabled",
          message: "Developer API service is temporarily disabled by platform administration.",
        },
        { status: 403 }
      );
    }

    // 2. Validate API Key
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "unauthorized",
          message: "API key is missing. Provide via 'x-api-key' header or 'Authorization: Bearer <key>'.",
        },
        { status: 401 }
      );
    }

    const developer = await db.getDeveloperAccountByApiKey(apiKey);
    if (!developer) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_key",
          message: "Invalid API key.",
        },
        { status: 401 }
      );
    }

    if (!developer.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: "account_suspended",
          message: "This developer API key has been suspended. Please contact platform support.",
        },
        { status: 403 }
      );
    }

    // 3. Parse and Validate Request Payload
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "bad_request", message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { network, package_size, phone, reference } = body;

    if (!network || !package_size || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "missing_fields",
          message: "Fields 'network', 'package_size', and 'phone' are required.",
          example: {
            network: "mtn",
            package_size: "5GB",
            phone: "0551234567",
            reference: "MY-REF-001",
          },
        },
        { status: 400 }
      );
    }

    const cleanNetwork = String(network).toLowerCase().trim();
    const cleanSize = String(package_size).toUpperCase().trim();
    const cleanPhone = String(phone).replace(/\s+/g, "").trim();

    // 4. Find matching API product
    const products = await db.getDeveloperApiProducts();
    const matchedProduct = products.find(
      (p) =>
        p.is_active &&
        p.network.toLowerCase() === cleanNetwork &&
        p.size.toUpperCase() === cleanSize
    );

    if (!matchedProduct) {
      const available = products
        .filter((p) => p.is_active && p.network.toLowerCase() === cleanNetwork)
        .map((p) => p.size);

      return NextResponse.json(
        {
          success: false,
          error: "package_not_found",
          message: `Package '${cleanSize}' not available for network '${cleanNetwork}'.`,
          available_sizes: available,
        },
        { status: 404 }
      );
    }

    const price = Number(matchedProduct.api_price);

    // 5. Check Developer Balance
    if (developer.balance < price) {
      return NextResponse.json(
        {
          success: false,
          error: "insufficient_balance",
          message: `Insufficient wallet balance. Required: GHS ${price.toFixed(2)}, Available: GHS ${developer.balance.toFixed(2)}. Please fund your wallet.`,
          required: price,
          current_balance: Number(developer.balance.toFixed(2)),
        },
        { status: 402 }
      );
    }

    // 6. Deduct balance from developer wallet
    const newBalance = Number((developer.balance - price).toFixed(2));
    await db.updateDeveloperAccount(developer.id, {
      balance: newBalance,
      total_spent: Number(((developer.total_spent || 0) + price).toFixed(2)),
      total_orders: (developer.total_orders || 0) + 1,
      last_used_at: new Date().toISOString(),
    });

    // 7. Generate unique order reference
    const orderRef = reference?.trim() || `FD-API-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    console.log(`[Developer API Buy] ${developer.name} (${developer.email}) purchasing ${cleanNetwork} ${cleanSize} for ${cleanPhone} (Ref: ${orderRef}, GHS ${price})`);

    // 8. Dispatch to DataMart automated delivery engine
    let deliveryRes: any;
    try {
      deliveryRes = await sendDataMartDelivery({
        network: cleanNetwork,
        package_size: matchedProduct.size,
        phone: cleanPhone,
        reference: orderRef,
      });
    } catch (err: any) {
      console.error("[Developer API Delivery Exception]:", err);
      deliveryRes = {
        success: false,
        message: err?.message || "Delivery gateway communication error",
        raw_response: { error: String(err) },
      };
    }

    const deliveryStatus = deliveryRes.success ? "delivered" : "processing";

    // 9. Record order in master database with explicit API attribution
    const order = await db.createOrder({
      reference: orderRef,
      network: cleanNetwork,
      package_size: matchedProduct.size,
      phone: cleanPhone,
      amount: price,
      paystack_ref: `API-KEY-${developer.id.slice(0, 8)}`,
      payment_status: "paid",
      delivery_status: deliveryStatus,
      status: deliveryStatus,
      datamart_response: deliveryRes.raw_response || deliveryRes,
      source: "api",
      api_key_id: developer.id,
      developer_name: developer.name,
    });

    return NextResponse.json({
      success: true,
      order_id: order.id,
      reference: orderRef,
      network: cleanNetwork,
      package_size: matchedProduct.size,
      recipient: cleanPhone,
      amount_charged: price,
      remaining_balance: newBalance,
      delivery_status: deliveryStatus,
      delivery_message: deliveryRes.message || "Order queued and processing",
      created_at: order.created_at,
    });
  } catch (error: any) {
    console.error("[Developer API Buy Route Error]:", error);
    return NextResponse.json(
      { success: false, error: "server_error", message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
