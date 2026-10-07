import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") || undefined;
    const messages = await db.getMessages(sessionId);
    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, phone, message, image_url, session_id } = await request.json();
    if (!message?.trim() && !image_url) {
      return NextResponse.json(
        { success: false, message: "Message content or an image is required" },
        { status: 400 }
      );
    }

    const created = await db.createMessage({
      name: name?.trim() || "Customer",
      phone: phone?.trim() || "",
      message: message?.trim() || "Sent an attachment image",
      image_url: image_url || undefined,
      session_id: session_id || undefined,
    });

    return NextResponse.json({ success: true, message: created });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to save message" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, reply } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID is required" }, { status: 400 });
    }

    if (action === "reply") {
      if (!reply || !reply.trim()) {
        return NextResponse.json({ success: false, message: "Reply text is required" }, { status: 400 });
      }
      const updated = await db.replyMessage(id, reply.trim());
      return NextResponse.json({ success: true, message: updated });
    }

    await db.markMessageRead(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

