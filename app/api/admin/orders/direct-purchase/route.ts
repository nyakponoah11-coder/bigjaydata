import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDataMartDelivery, formatGhanaPhone } from "@/lib/datamart";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, network, package_size, note } = body;

    if (!phone || !network || !package_size) {
      return NextResponse.json(
        { error: "Phone number, network, and package size are required." },
        { status: 400 }
      );
    }

    const formattedPhone = formatGhanaPhone(phone);
    if (!/^0[235][0-9]{8}$/.test(formattedPhone)) {
      return NextResponse.json(
        { error: "Invalid Ghanaian phone number format. Must be 10 digits (e.g. 0551234567)." },
        { status: 400 }
      );
    }

    const reference = `BMGH-DIR-${Date.now().toString().slice(-6)}`;

    // Dispatch directly to DataMart wallet
    const dmResult = await sendDataMartDelivery({
      phone: formattedPhone,
      network: network.toLowerCase(),
      package_size,
      reference,
    });

    // Record order in database
    const order = await db.createOrder({
      reference,
      network: network.toLowerCase(),
      package_size,
      phone: formattedPhone,
      amount: 0,
      paystack_ref: null,
      payment_status: "admin_direct",
      delivery_status: dmResult.success ? "delivered" : "failed",
      status: dmResult.success ? "delivered" : "failed",
      datamart_response: dmResult.raw_response || { message: dmResult.message, note },
    });

    return NextResponse.json({
      success: dmResult.success,
      message: dmResult.message,
      reference,
      order,
      datamart: dmResult,
    });
  } catch (error: any) {
    console.error("Direct Purchase Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process direct purchase" },
      { status: 500 }
    );
  }
}
