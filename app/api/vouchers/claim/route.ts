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

    // 1. Check if this phone number has already claimed a voucher
    const alreadyClaimed = await db.hasPhoneClaimedVoucher(formattedPhone);
    if (alreadyClaimed) {
      return NextResponse.json(
        { error: "This phone number has already claimed a free data voucher. Only one claim is permitted per number." },
        { status: 400 }
      );
    }

    // 2. Validate voucher code and availability
    const vouchers = await db.getVouchers();
    const voucher = vouchers.find(
      (v) =>
        v.is_active &&
        v.code.toUpperCase() === cleanCode &&
        v.claimed_count < v.max_claims
    );

    if (!voucher) {
      return NextResponse.json(
        { error: "Invalid, expired, or fully redeemed voucher code." },
        { status: 400 }
      );
    }

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
      phone: formattedPhone,
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
