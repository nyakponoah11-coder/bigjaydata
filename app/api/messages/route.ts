import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const messages = await db.getMessages();
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
    const { name, phone, message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, message: "Message content is required" },
        { status: 400 }
      );
    }

    const created = await db.createMessage({
      name: name?.trim() || "Customer",
      phone: phone?.trim() || "",
      message: message.trim(),
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
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "ID is required" }, { status: 400 });
    }
    await db.markMessageRead(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
