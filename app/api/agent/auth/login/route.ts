import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Please provide your email/phone and password" },
        { status: 400 }
      );
    }

    const cleanInput = String(identifier).trim().toLowerCase();
    const cleanPass = String(password).trim();

    // Find agent by email or phone
    const agents = await db.getAgents();
    const agent = agents.find(
      (a) =>
        a.email.toLowerCase() === cleanInput ||
        a.phone.replace(/[^0-9]/g, "") === cleanInput.replace(/[^0-9]/g, "") ||
        a.store_slug === cleanInput
    );

    if (!agent) {
      return NextResponse.json(
        { success: false, message: "No agent account found with these details." },
        { status: 404 }
      );
    }

    if (agent.password_hash !== cleanPass) {
      return NextResponse.json(
        { success: false, message: "Incorrect password or PIN." },
        { status: 401 }
      );
    }

    if (!agent.is_active) {
      return NextResponse.json(
        { success: false, message: "Your agent account has been suspended. Please contact the administrator." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      agent,
      token: `agtok_${agent.id}_${Date.now()}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Login failed" },
      { status: 500 }
    );
  }
}
