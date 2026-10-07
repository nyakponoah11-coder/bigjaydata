import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { askCustomerSupportAI } from "@/lib/ai-rotator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = (body?.message || "").trim();
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Message is required" },
        { status: 400 }
      );
    }

    // Proactively check if the user is asking about an order or giving a reference / phone
    let orderContext = "";

    // 1. Check for Order Reference like BMGH-xxxxxxxx or BIGJ-xxxxxxxx
    const refMatch = message.match(/(BMGH-[A-Za-z0-9]+|BIGJ-[A-Za-z0-9]+|[A-Za-z0-9]{4,}-[A-Za-z0-9]{4,})/i);
    if (refMatch) {
      const ref = refMatch[1].toUpperCase();
      const order = await db.getOrderByReference(ref);
      if (order) {
        orderContext += `ORDER FOUND: Reference ${order.reference} | Network: ${order.network.toUpperCase()} | Package: ${order.package_size} | Recipient: ${order.phone} | Amount: GHS ${order.amount.toFixed(2)} | Payment Status: ${order.payment_status?.toUpperCase() || "PAID"} | Delivery Status: ${(order.delivery_status || order.status)?.toUpperCase()} | Placed: ${new Date(order.created_at).toLocaleString()}`;
      }
    }

    // 2. Check for 10-digit phone number if reference was not found
    if (!orderContext) {
      const phoneMatch = message.match(/(0\d{9}|233\d{9})/);
      if (phoneMatch) {
        const phone = phoneMatch[1];
        const orders = await db.getOrdersByPhone(phone);
        if (orders.length > 0) {
          const latest = orders[0];
          orderContext += `ORDER FOUND FOR PHONE ${phone}: Reference ${latest.reference} | Network: ${latest.network.toUpperCase()} | Package: ${latest.package_size} | Amount: GHS ${latest.amount.toFixed(2)} | Payment: ${latest.payment_status?.toUpperCase() || "PAID"} | Delivery Status: ${(latest.delivery_status || latest.status)?.toUpperCase()} | Placed: ${new Date(latest.created_at).toLocaleString()}`;
        }
      }
    }

    const aiResult = await askCustomerSupportAI({
      userMessage: message,
      history,
      extraContext: orderContext || undefined,
    });

    return NextResponse.json({
      success: true,
      reply: aiResult.reply,
      provider: aiResult.provider,
      modelUsed: aiResult.modelUsed,
    });
  } catch (error: any) {
    console.error("[API /ai-chat] Error:", error);
    return NextResponse.json(
      {
        success: false,
        reply: "Hello bossu, our AI assistant encountered a brief hiccup. Please reach out to our team directly on WhatsApp or try asking again in a moment!",
        error: error?.message || "AI chat processing error",
      },
      { status: 500 }
    );
  }
}
