import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { askCustomerSupportAI } from "@/lib/ai-rotator";

export const dynamic = "force-dynamic";

function maskPhone(phone?: string): string {
  if (!phone) return "";
  const clean = phone.trim();
  if (clean.length < 7) return clean;
  return clean.slice(0, 3) + "****" + clean.slice(-3);
}

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
        orderContext += `ORDER FOUND: Reference ${order.reference} | Network: ${order.network.toUpperCase()} | Package: ${order.package_size} | Recipient: ${maskPhone(order.phone)} | Amount: GHS ${order.amount.toFixed(2)} | Payment Status: ${order.payment_status?.toUpperCase() || "PAID"} | Delivery Status: ${(order.delivery_status || order.status)?.toUpperCase()} | Placed: ${new Date(order.created_at).toLocaleString()}`;
      }
    }

    // 2. Check for Phone Number (supports 055 123 4567, 055-123-4567, 0551234567, +233...)
    if (!orderContext) {
      const cleanDigits = message.replace(/[\s\-\(\)]/g, "");
      const phoneMatch = cleanDigits.match(/(?:233|0)[235]\d{8}/);
      if (phoneMatch) {
        let phone = phoneMatch[0];
        if (phone.startsWith("233")) {
          phone = "0" + phone.slice(3);
        }
        const orders = await db.getOrdersByPhone(phone);
        if (orders.length > 0) {
          const latest = orders[0];
          orderContext += `ORDER FOUND FOR PHONE: Reference ${latest.reference} | Network: ${latest.network.toUpperCase()} | Package: ${latest.package_size} | Recipient: ${maskPhone(latest.phone)} | Amount: GHS ${latest.amount.toFixed(2)} | Payment: ${latest.payment_status?.toUpperCase() || "PAID"} | Delivery Status: ${(latest.delivery_status || latest.status)?.toUpperCase()} | Placed: ${new Date(latest.created_at).toLocaleString()}`;
        }
      }
    }

    const aiResult = await askCustomerSupportAI({
      userMessage: message,
      history,
      extraContext: orderContext || undefined,
    });

    let safeReply = aiResult.reply;

    // Safety privacy filter: Ensure no raw phone numbers belonging to other people are leaked in the reply
    const phoneRegex = /\b(0[235]\d{8})\b/g;
    safeReply = safeReply.replace(phoneRegex, (matchedPhone) => {
      if (message.includes(matchedPhone)) {
        return matchedPhone;
      }
      return maskPhone(matchedPhone);
    });

    // Atomic message persistence to ensure the customer chat never disappears and appears immediately in Admin Messages
    const sessionId = (body?.sessionId || body?.session_id || "").trim();
    const customerName = (body?.customerName || body?.name || "").trim();
    const customerPhone = (body?.customerPhone || body?.phone || "").trim();
    const imageUrl = body?.imageUrl || body?.image_url || undefined;
    const existingMsgId = body?.messageId || body?.id;

    let savedMessageId = existingMsgId;

    if (existingMsgId) {
      await db.saveAIReply(existingMsgId, safeReply);
    } else if (body?.persist !== false) {
      try {
        const created = await db.createMessage({
          name: customerName || "Customer",
          phone: customerPhone || "",
          message: message,
          image_url: imageUrl,
          session_id: sessionId || undefined,
        });
        savedMessageId = created.id;
        await db.saveAIReply(created.id, safeReply);
      } catch (saveErr) {
        console.warn("[API /ai-chat] Failed to auto-persist message record:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      reply: safeReply,
      messageId: savedMessageId,
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

