import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, status, note } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "Withdrawal ID and status are required" },
        { status: 400 }
      );
    }

    if (!["pending", "completed", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    const updated = await db.updateWithdrawalStatus(id, status, note);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Withdrawal request not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, withdrawal: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update withdrawal status" },
      { status: 500 }
    );
  }
}
