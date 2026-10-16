import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDataMartDelivery, formatGhanaPhone } from "@/lib/datamart";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, phone } = body;

    if (!code || !phone) {
      return NextResponse.json(
        { error: "Please enter both the voucher code and your phone number." },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const formattedPhone = formatGhanaPhone(String(phone));

    if (!/^0[235][0-9]{8}$/.test(formattedPhone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Ghanaian phone number (e.g. 0551234567)." },
        { status: 400 }
      );
    }

    // 1. Validate voucher code and availability
    const now = new Date();
    const vouchers = await db.getVouchers();
    const voucher = vouchers.find(
      (v) =>
        v.is_active &&
        v.code.toUpperCase() === cleanCode &&
        v.claimed_count < v.max_claims &&
        (!v.expires_at || new Date(v.expires_at) > now)
    );

    if (!voucher) {
      return NextResponse.json(
        { error: "Invalid, expired, or fully redeemed voucher code." },
        { status: 400 }
      );
    }

    // 2. Check if this phone number has already claimed a voucher in this giveaway drop/batch
    const alreadyClaimedThisBatch = await db.hasPhoneClaimedBatch(
      formattedPhone,
      voucher.batch_id || null,
      voucher.id
    );

    if (alreadyClaimedThisBatch) {
      return NextResponse.json(
        { error: "This phone number has already claimed a free data code from this giveaway drop. Only one claim is permitted per phone number." },
        { status: 400 }
      );
    }

    // 2b. Check Account Order Eligibility if required by Admin (e.g. at least 3, 4, 5... orders)
    const isPaidOrder = (o: any) => {
      const ps = (o.payment_status || "").toLowerCase().trim();
      const s = (o.status || "").toLowerCase().trim();
      const ds = (o.delivery_status || "").toLowerCase().trim();
      return (
        ps === "paid" ||
        ps === "completed" ||
        ps === "success" ||
        s === "delivered" ||
        s === "completed" ||
        ds === "delivered" ||
        ds === "completed"
      );
    };

    const [allOrders, phoneOrders] = await Promise.all([
      db.getOrders(),
      db.getOrdersByPhone(formattedPhone),
    ]);
    const cleanPhoneDigits = formattedPhone.replace(/[^0-9]/g, "");
    const combinedOrdersMap = new Map<string, any>();
    [...allOrders, ...phoneOrders].forEach((o) => {
      if (o && o.id) combinedOrdersMap.set(o.id, o);
    });
    const customerOrders = Array.from(combinedOrdersMap.values()).filter(
      (o) => o.phone && o.phone.replace(/[^0-9]/g, "") === cleanPhoneDigits && isPaidOrder(o)
    );

    const minRequired = Number(voucher.min_orders_required) || 0;
    if (minRequired > 0 && customerOrders.length < minRequired) {
      return NextResponse.json(
        {
          error: `Eligibility Requirement: This voucher is exclusively for accounts with at least ${minRequired} completed orders. Your phone number has ${customerOrders.length} completed order(s). Place ${minRequired - customerOrders.length} more order(s) to claim!`,
        },
        { status: 400 }
      );
    }

    // Lookup customer name if registered
    const customer = await db.getCustomerByPhone(formattedPhone);
    const customerName = customer?.name || "Customer";

    // 3. Dispatch data delivery via DataMart
    const orderRef = `BMGH-FREE-${Date.now().toString().slice(-6)}`;
    const dmResult = await sendDataMartDelivery({
      phone: formattedPhone,
      network: voucher.network.toLowerCase(),
      package_size: voucher.package_size,
      reference: orderRef,
    });

    // 4. Save order to database
    await db.createOrder({
      reference: orderRef,
      network: voucher.network.toLowerCase(),
      package_size: voucher.package_size,
      phone: formattedPhone,
      amount: 0,
      paystack_ref: null,
      payment_status: "voucher_free",
      delivery_status: dmResult.success ? "delivered" : "processing",
      status: dmResult.success ? "delivered" : "pending",
      datamart_response: dmResult.raw_response || {
        message: dmResult.message,
        voucher_code: voucher.code,
      },
    });

    // 5. Record voucher claim and update voucher claim count
    await db.recordVoucherClaim({
      voucher_id: voucher.id,
      voucher_code: voucher.code,
      batch_id: voucher.batch_id || null,
      phone: formattedPhone,
      customer_name: customerName,
      customer_orders_count: customerOrders.length,
      network: voucher.network,
      package_size: voucher.package_size,
      order_reference: orderRef,
    });

    return NextResponse.json({
      success: true,
      message: dmResult.success
        ? `Success! Your ${voucher.package_size} ${voucher.network.toUpperCase()} free bundle has been sent to ${formattedPhone}.`
        : `Voucher verified! Your free ${voucher.package_size} bundle is being dispatched to ${formattedPhone}.`,
      reference: orderRef,
      network: voucher.network,
      package_size: voucher.package_size,
    });
  } catch (error: any) {
    console.error("Voucher Claim Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process voucher claim." },
      { status: 500 }
    );
  }
}
