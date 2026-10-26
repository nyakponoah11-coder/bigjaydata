import { NextResponse } from "next/server";
import { db, NetflixPartner } from "@/lib/db";
import { getNetflixConfig, createNetflixOrder } from "@/lib/netflix";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getApiKey(req: Request, body?: any): string | null {
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.substring(7).trim();
  }

  if (body?.api_key) return String(body.api_key).trim();

  const { searchParams } = new URL(req.url);
  const qKey = searchParams.get("api_key");
  if (qKey) return qKey.trim();

  return null;
}

export async function GET(req: Request) {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return NextResponse.json(
        { status: "error", success: false, error: "unauthorized", message: "API key is required. Provide via 'x-api-key' header or '?api_key=' query." },
        { status: 401 }
      );
    }

    const partner = await db.getNetflixPartnerByApiKey(apiKey);
    if (!partner) {
      return NextResponse.json(
        { status: "error", success: false, error: "invalid_key", message: "Invalid Netflix partner API key." },
        { status: 401 }
      );
    }

    if (!partner.is_active) {
      return NextResponse.json(
        { status: "error", success: false, error: "account_suspended", message: "This partner account has been suspended." },
        { status: 403 }
      );
    }

    const allOrders = await db.getOrders();
    const partnerOrders = allOrders
      .filter((o) => o.partner_id === partner.id || o.source === "partner_api")
      .slice(0, 50);

    return NextResponse.json({
      status: "success",
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        balance: partner.balance,
        wholesale_price: partner.base_price,
        base_price: partner.base_price,
        currency: "GHS",
        available_accounts: partner.base_price > 0 ? Math.floor(partner.balance / partner.base_price) : 0,
        total_spent: partner.total_spent,
        total_orders: partner.total_orders,
        is_active: partner.is_active,
      },
      orders_count: partnerOrders.length,
      orders: partnerOrders,
    });
  } catch (error: any) {
    console.error("[Partner Netflix GET Error]:", error);
    return NextResponse.json(
      { status: "error", success: false, error: "server_error", message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { status: "error", success: false, error: "bad_request", message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const apiKey = getApiKey(req, body);
    if (!apiKey) {
      return NextResponse.json(
        {
          status: "error",
          success: false,
          error: "unauthorized",
          message: "API key is missing. Provide via 'x-api-key' header or 'api_key' in request body.",
        },
        { status: 401 }
      );
    }

    // Lookup partner account
    let partner: NetflixPartner | null = await db.getNetflixPartnerByApiKey(apiKey);

    // Fallback: check if developer account
    if (!partner) {
      const dev = await db.getDeveloperAccountByApiKey(apiKey);
      if (dev) {
        const settings = await db.getSettings();
        partner = {
          id: dev.id,
          name: dev.name,
          email: dev.email,
          phone: dev.phone,
          api_key: dev.api_key,
          balance: dev.balance,
          base_price: Number(settings.netflix_agent_base_price || 18),
          is_active: dev.is_active,
          total_spent: dev.total_spent,
          total_orders: dev.total_orders,
          created_at: dev.created_at,
        };
      }
    }

    if (!partner) {
      return NextResponse.json(
        { status: "error", success: false, error: "invalid_key", message: "Invalid partner API key." },
        { status: 401 }
      );
    }

    if (!partner.is_active) {
      return NextResponse.json(
        {
          status: "error",
          success: false,
          error: "account_suspended",
          message: "This partner account has been suspended. Please contact platform support.",
        },
        { status: 403 }
      );
    }

    // Check Netflix master switch
    const config = await getNetflixConfig();
    if (!config.isEnabled) {
      return NextResponse.json(
        {
          status: "error",
          success: false,
          error: "service_disabled",
          message: "Netflix provisioning service is temporarily disabled by platform administration.",
        },
        { status: 503 }
      );
    }

    const {
      customer_name,
      customer_phone,
      customer_email,
      partner_reference,
      reference,
      duration_days = 30,
    } = body;

    const cleanPhone = String(customer_phone || "").replace(/\s+/g, "").trim();
    const cleanEmail = String(customer_email || "").trim().toLowerCase();
    const partnerRef = String(partner_reference || reference || `BMGH-NF${Math.floor(10000000 + Math.random() * 90000000)}`).trim();

    if (!cleanPhone || !cleanEmail) {
      return NextResponse.json(
        {
          status: "error",
          success: false,
          error: "missing_fields",
          message: "Fields 'customer_phone' and 'customer_email' are required.",
          example: {
            customer_name: "John Doe",
            customer_phone: "0541234567",
            customer_email: "customer@example.com",
            partner_reference: "MY-REF-1001",
            duration_days: 30,
          },
        },
        { status: 400 }
      );
    }

    // Determine the base price given to this partner
    const basePrice = Number(partner.base_price > 0 ? partner.base_price : (config.agentBasePrice || 18));

    // CHECK PARTNER WALLET BALANCE:
    // If balance is zero or less than base price, return OUT OF STOCK immediately
    if (partner.balance <= 0 || partner.balance < basePrice) {
      return NextResponse.json(
        {
          status: "error",
          success: false,
          error: "out_of_stock",
          message: `Out of stock: Insufficient account balance. Required: GH₵ ${basePrice.toFixed(2)}, Available: GH₵ ${partner.balance.toFixed(2)}. Please fund your partner wallet.`,
          available_balance: Number(partner.balance.toFixed(2)),
          required_balance: basePrice,
        },
        { status: 400 }
      );
    }

    // Check idempotency: check if order reference already exists
    const existingOrder = await db.getOrderByReference(partnerRef);
    if (existingOrder && existingOrder.delivery_status === "delivered") {
      return NextResponse.json({
        status: "success",
        success: true,
        message: "Order already fulfilled.",
        order: {
          reference: existingOrder.reference,
          partner_reference: partnerRef,
          netflix_email: existingOrder.netflix_email,
          status: "active",
          duration_days: 30,
          amount_charged: existingOrder.amount,
          remaining_balance: partner.balance,
        },
      });
    }

    // DEDUCT BASE PRICE FROM PARTNER ACCOUNT
    const deductRes = await db.deductNetflixPartner(
      partner.id,
      basePrice,
      `Netflix 30-Day for ${cleanPhone} (Ref: ${partnerRef})`
    );

    if (!deductRes.success) {
      return NextResponse.json(
        {
          status: "error",
          success: false,
          error: "out_of_stock",
          message: "Out of stock: Insufficient partner balance.",
          available_balance: partner.balance,
          required_balance: basePrice,
        },
        { status: 400 }
      );
    }

    // Track order count & total spent on partner account
    const freshPartner = await db.getNetflixPartnerById(partner.id);
    if (freshPartner) {
      await db.updateNetflixPartner(partner.id, {
        total_spent: Number(((freshPartner.total_spent || 0) + basePrice).toFixed(2)),
        total_orders: (freshPartner.total_orders || 0) + 1,
        last_used_at: new Date().toISOString(),
      });
    }

    console.log(`[Netflix Partner Order] ${partner.name} (${partner.email}) debited GH₵ ${basePrice}. New balance: GH₵ ${deductRes.new_balance}. Provisioning order ${partnerRef}...`);

    // Dispatch to Data1 upstream provider
    const apiResult = await createNetflixOrder({
      customer_name: customer_name || partner.name,
      customer_phone: cleanPhone,
      customer_email: cleanEmail,
      partner_reference: partnerRef,
      duration_days: Number(duration_days) || 30,
    });

    // If upstream provider fails, REVERSE the deduction so partner is not wrongfully charged
    if (!apiResult.success) {
      console.warn(`[Netflix Partner Order Failed] Upstream error: ${apiResult.error}. Reversing GH₵ ${basePrice} to partner ${partner.name}...`);
      await db.creditNetflixPartner(
        partner.id,
        basePrice,
        `Reversal for failed order ${partnerRef}: ${apiResult.error}`
      );

      const rolledBack = await db.getNetflixPartnerById(partner.id);
      if (rolledBack) {
        await db.updateNetflixPartner(partner.id, {
          total_spent: Math.max(0, Number(((rolledBack.total_spent || 0) - basePrice).toFixed(2))),
          total_orders: Math.max(0, (rolledBack.total_orders || 1) - 1),
        });
      }

      return NextResponse.json(
        {
          status: "error",
          success: false,
          error: "provider_error",
          message: apiResult.error || "Failed to provision Netflix access with provider. Charged amount has been refunded to your wallet.",
          refunded_amount: basePrice,
          remaining_balance: rolledBack?.balance ?? partner.balance,
        },
        { status: 502 }
      );
    }

    // Record order in master database
    const order = await db.createOrder({
      reference: partnerRef,
      network: "netflix",
      package_size: "30-Day Premium Access",
      phone: cleanPhone,
      amount: basePrice,
      paystack_ref: `PARTNER-${partner.id.slice(0, 8)}`,
      payment_status: "paid",
      delivery_status: "delivered",
      status: "delivered",
      source: "partner_api",
      partner_id: partner.id,
      partner_name: partner.name,
      customer_name: customer_name || partner.name,
      customer_email: cleanEmail,
      service_type: "netflix",
      netflix_email: apiResult.netflix_email,
      netflix_reference: apiResult.reference,
      duration_days: Number(duration_days) || 30,
    });

    const finalPartner = await db.getNetflixPartnerById(partner.id);

    return NextResponse.json({
      status: "success",
      success: true,
      message: "Netflix 30-Day access profile created successfully.",
      order: {
        id: order.id,
        reference: partnerRef,
        partner_reference: partnerRef,
        netflix_reference: apiResult.reference,
        netflix_email: apiResult.netflix_email,
        status: "active",
        duration_days: Number(duration_days) || 30,
        amount_deducted: basePrice,
        remaining_balance: finalPartner?.balance ?? deductRes.new_balance,
        created_at: order.created_at,
      },
    });
  } catch (error: any) {
    console.error("[Partner Netflix POST Error]:", error);
    return NextResponse.json(
      { status: "error", success: false, error: "server_error", message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
