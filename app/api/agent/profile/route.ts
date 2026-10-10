import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agent_id");

    if (!agentId) {
      return NextResponse.json({ success: false, message: "Agent ID required" }, { status: 400 });
    }

    const agent = await db.getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ success: false, message: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, agent });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      agent_id,
      store_name,
      description,
      theme,
      momo_number,
      momo_network,
      phone,
      logo_url,
      whatsapp_number,
      whatsapp_channel_url,
      support_email,
    } = body;

    if (!agent_id) {
      return NextResponse.json({ success: false, message: "Agent ID required" }, { status: 400 });
    }

    const updates: any = {};
    if (store_name !== undefined) updates.store_name = String(store_name).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (theme !== undefined) updates.theme = String(theme).trim();
    if (momo_number !== undefined) updates.momo_number = String(momo_number).trim();
    if (momo_network !== undefined) updates.momo_network = String(momo_network).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (logo_url !== undefined) updates.logo_url = String(logo_url);
    if (whatsapp_number !== undefined) updates.whatsapp_number = String(whatsapp_number).trim();
    if (whatsapp_channel_url !== undefined) updates.whatsapp_channel_url = String(whatsapp_channel_url).trim();
    if (support_email !== undefined) updates.support_email = String(support_email).trim();

    const updated = await db.updateAgent(agent_id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, agent: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
