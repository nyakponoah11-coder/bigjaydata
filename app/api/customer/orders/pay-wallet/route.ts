import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sendDataMartDelivery } from "@/lib/datamart";
import { getNetflixConfig, createNetflixOrder } from "@/lib/netflix";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, network, package_size, phone, amount } = body;

    if (!customer_id || !network || !package_size || !phone || amount === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required order parameters." },
        { status: 400 }
      );
    }

    // Verify customer session from cookie if available
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("bmgh_customer_session")?.value;
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(sessionCookie);
        if (parsed?.id && parsed.id !== customer_id) {
          return NextResponse.json(
            { success: false, message: "Unauthorized session for this customer account." },
            { status: 403 }
          );
        }
      } catch {}
    }

    const cleanPhone = String(phone).replace(/[^0-9]/g, "");
    if (cleanPhone.length < 9) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid recipient phone number." },
        { status: 400 }
      );
    }

    const customer = await db.getCustomerById(customer_id);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account not found." },
        { status: 404 }
      );
    }

    if (!customer.is_active) {
      return NextResponse.json(
        { success: false, message: "Your customer account is currently inactive." },
        { status: 403 }
      );
    }

    const isNetflix = (network || "").toLowerCase() === "netflix" || body.service_type === "netflix";

    // Strict server-side price validation
    let requiredAmount = Number(amount);

    if (isNetflix) {
      const netflixCfg = await getNetflixConfig();
      const requiredNetflixPrice = netflixCfg.retailPrice;
      if (requiredAmount < requiredNetflixPrice - 0.05) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid Netflix price. Netflix 30-Day access costs GHS ${requiredNetflixPrice.toFixed(2)}.`,
          },
          { status: 400 }
        );
      }
      requiredAmount = requiredNetflixPrice;
    } else {
      const norm = (s: string) => (s || "").toLowerCase().replace(/[\s\-_]/g, "");
      const baseProducts = await db.getAgentBaseProducts();
      const matched = baseProducts.find(
        (b) =>
          (b.network || "").toLowerCase().trim() === (network || "").toLowerCase().trim() &&
          norm(b.size) === norm(package_size)
      );

      if (matched && Number(matched.base_price) > 0) {
        const canonicalBase = Number(matched.base_price);
        if (requiredAmount < canonicalBase - 0.05) {
          return NextResponse.json(
            {
              success: false,
              message: `Invalid bundle price. ${network.toUpperCase()} ${package_size} costs GHS ${canonicalBase.toFixed(2)}.`,
            },
            { status: 400 }
          );
        }
        requiredAmount = Math.max(requiredAmount, canonicalBase);
      }
    }

    const orderAmount = Number(requiredAmount);
    if (orderAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid bundle price amount." },
        { status: 400 }
      );
    }

    if ((customer.wallet_balance || 0) < orderAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient wallet balance. You have GHS ${Number(customer.wallet_balance || 0).toFixed(2)}, but this costs GHS ${orderAmount.toFixed(2)}. Please deposit funds or pay with Momo directly.`,
        },
        { status: 400 }
      );
    }

    const random8 = Math.floor(10000000 + Math.random() * 90000000);
    const reference = isNetflix ? `BMGH-NF${random8}` : `BMGH-W${random8}`;

    // 1. Atomically debit customer wallet and log transaction
    const debitResult = await db.debitCustomerWallet(
      customer.id,
      orderAmount,
      reference,
      isNetflix
        ? "Netflix 30-Day Premium UHD Access (Paid from Wallet)"
        : `${network.toUpperCase()} ${package_size} Data Bundle (Paid from Wallet)`
    );

    // 2. Create the order in the system
    let order = await db.createOrder({
      reference,
      network: isNetflix ? "netflix" : network.toLowerCase(),
      package_size,
      phone: cleanPhone,
      amount: orderAmount,
      paystack_ref: "WALLET_BAL",
      payment_status: "paid",
      delivery_status: "processing",
      status: "pending",
      source: "customer_wallet",
      customer_id: customer.id,
      customer_name: customer.name || body.customer_name || undefined,
      customer_email: body.customer_email || customer.email || `${cleanPhone}@bundlemartgh.com`,
      service_type: isNetflix ? "netflix" : "data",
      payment_method: "wallet",
      datamart_response: { status: "pending", initiated_at: new Date().toISOString() },
    });

    // 3. Dispatch order through appropriate gateway
    if (isNetflix) {
      try {
        const netflixResult = await createNetflixOrder({
          customer_name: customer.name || body.customer_name || "Customer",
          customer_phone: cleanPhone,
          customer_email: body.customer_email || customer.email || `${cleanPhone}@bundlemartgh.com`,
          partner_reference: reference,
          duration_days: 30,
        });

        if (netflixResult && netflixResult.success) {
          order =
            (await db.updateOrderStatus(order.reference, "delivered", netflixResult.raw || netflixResult, {
              delivery_status: "delivered",
              netflix_email: netflixResult.netflix_email,
              netflix_reference: netflixResult.reference,
              service_type: "netflix",
              duration_days: 30,
            })) || order;
        }
      } catch (netflixErr: any) {
        console.warn("Automated Netflix delivery trigger notice:", netflixErr?.message || netflixErr);
      }
    } else {
      try {
        const deliveryResult = await sendDataMartDelivery(order);
        if (deliveryResult && deliveryResult.success) {
          order =
            (await db.updateOrderStatus(
              order.reference,
              "delivered",
              deliveryResult.raw_response || deliveryResult,
              { delivery_status: "delivered" }
            )) || order;
        }
      } catch (deliveryErr: any) {
        console.warn("Automated delivery trigger notice:", deliveryErr?.message || deliveryErr);
      }
    }

    const { password_hash, ...safeCustomer } = debitResult.customer;

    return NextResponse.json({
      success: true,
      message: "Order placed successfully using your wallet balance!",
      reference,
      order,
      new_balance: debitResult.new_balance,
      customer: safeCustomer,
    });
  } catch (error: any) {
    console.error("Wallet order error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to process order with wallet balance." },
      { status: 500 }
    );
  }
}
