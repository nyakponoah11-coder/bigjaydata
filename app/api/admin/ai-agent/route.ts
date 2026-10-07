import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendCustomerSMS } from "@/lib/sms";

interface ToolExecutionResult {
  tool: string;
  result: any;
  reply: string;
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ success: false, message: "Prompt is required" }, { status: 400 });
    }

    const cleanPrompt = prompt.trim();
    const lower = cleanPrompt.toLowerCase();

    // TOOL 1: updateOrderStatus(orderIdOrRef, status)
    // Matches: "mark order BIGJ-xxxx as delivered", "set BIGJ-xxxx to failed", etc.
    const markMatch = cleanPrompt.match(
      /(?:mark|set|change|update)\s+(?:order\s+)?([A-Za-z0-9\-_]+)\s+(?:status\s+)?(?:as|to)\s+(delivered|failed|pending|refunded)/i
    ) || cleanPrompt.match(
      /(?:mark|set|update)\s+([A-Za-z0-9\-_]+)\s+(delivered|failed|pending|refunded)/i
    );

    if (markMatch) {
      const orderRef = markMatch[1];
      const targetStatus = markMatch[2].toLowerCase() as "delivered" | "failed" | "pending" | "refunded";

      const updated = await db.updateOrderStatus(orderRef, targetStatus);
      if (updated) {
        return NextResponse.json({
          success: true,
          actionTaken: "updateOrderStatus",
          toolParams: { orderId: orderRef, status: targetStatus },
          reply: `Done bossu, marked order ${updated.reference} as ${targetStatus}.`,
          order: updated,
        });
      } else {
        return NextResponse.json({
          success: false,
          reply: `Done bossu, but couldn't find any order with reference or ID "${orderRef}".`,
        });
      }
    }

    // TOOL 2: refundOrder(orderId)
    // Matches: "refund order BIGJ-xxxx", "refund BIGJ-xxxx"
    const refundMatch = cleanPrompt.match(/(?:refund|cancel)\s+(?:order\s+)?([A-Za-z0-9\-_]+)/i);
    if (refundMatch) {
      const orderRef = refundMatch[1];
      const refunded = await db.updateOrderStatus(orderRef, "refunded");
      if (refunded) {
        return NextResponse.json({
          success: true,
          actionTaken: "refundOrder",
          toolParams: { orderId: orderRef },
          reply: `Done bossu, refunded order ${refunded.reference} (Amount: GHS ${refunded.amount.toFixed(2)}).`,
          order: refunded,
        });
      } else {
        return NextResponse.json({
          success: false,
          reply: `Done bossu, but couldn't locate order "${orderRef}" to refund.`,
        });
      }
    }

    // TOOL 3: sendSMS(phone, message)
    // Matches: "send sms to 055xxxxxxx saying hello...", "text 055xxxxxxx: your data is delivered"
    const smsMatch = cleanPrompt.match(
      /(?:send\s+sms|send\s+text|sms|text)\s+(?:to\s+)?(0\d{9}|233\d{9}|\+233\d{9})\s+(?:saying|with|message)?\s*[:"-]?\s*(.+)/i
    );
    if (smsMatch) {
      const phone = smsMatch[1];
      const messageText = smsMatch[2].replace(/^["']|["']$/g, "").trim();

      const smsResult = await sendCustomerSMS({ phone, message: messageText });
      return NextResponse.json({
        success: true,
        actionTaken: "sendSMS",
        toolParams: { phone, message: messageText },
        reply: `Done bossu, SMS sent to ${phone}: "${messageText}".`,
        result: smsResult,
      });
    }

    // TOOL 4: getOrderDetails(orderIdOrRef)
    // Matches: "details of BIGJ-xxxx", "check order BIGJ-xxxx", "status of BIGJ-xxxx", "find 055xxxxxxx"
    const detailsMatch = cleanPrompt.match(
      /(?:details\s+of|check\s+order|order\s+details|get\s+order|status\s+of|track|view)\s+([A-Za-z0-9\-_]+)/i
    );
    if (detailsMatch) {
      const target = detailsMatch[1];
      let order = await db.getOrderByReference(target);
      if (!order) {
        const byPhone = await db.getOrdersByPhone(target);
        if (byPhone.length > 0) order = byPhone[0];
      }

      if (order) {
        return NextResponse.json({
          success: true,
          actionTaken: "getOrderDetails",
          toolParams: { target },
          reply: `Done bossu, order ${order.reference} details:\n• Network: ${order.network.toUpperCase()} (${order.package_size})\n• Recipient: ${order.phone}\n• Amount: GHS ${order.amount.toFixed(2)}\n• Payment: ${(order.payment_status || "paid").toUpperCase()}\n• Delivery: ${(order.delivery_status || order.status).toUpperCase()}\n• Date: ${new Date(order.created_at).toLocaleString()}`,
          order,
        });
      } else {
        return NextResponse.json({
          success: false,
          reply: `Done bossu, but couldn't find order matching "${target}".`,
        });
      }
    }

    // FALLBACK / GENERAL STORE ACTIONS
    if (lower.includes("sales") || lower.includes("how many orders") || lower.includes("summary")) {
      const orders = await db.getOrders();
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayOrders = orders.filter((o) => o.created_at.startsWith(todayStr));
      const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
      const pending = orders.filter((o) => o.status === "pending").length;

      return NextResponse.json({
        success: true,
        actionTaken: "getSummary",
        reply: `Done bossu, today's summary: ${todayOrders.length} orders totaling GHS ${todaySales.toFixed(2)}. There are currently ${pending} pending orders.`,
      });
    }

    // Unrecognized command help
    return NextResponse.json({
      success: true,
      actionTaken: "help",
      reply: `Done bossu, I am your BundleMartGh Action Agent. Here are actions you can command me to execute right now:\n\n1. "mark order BMGH-98234120 as delivered"\n2. "mark order BMGH-98234120 as failed"\n3. "refund order BMGH-98234120"\n4. "send SMS to 0551234567 saying your 10GB MTN data is ready"\n5. "check order BMGH-98234120"\n6. "give me sales summary"`,
    });
  } catch (error: any) {
    console.error("[AI Agent Action] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Execution error", reply: "Sorry bossu, error occurred executing that command." },
      { status: 500 }
    );
  }
}
