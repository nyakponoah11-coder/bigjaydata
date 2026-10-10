import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const config = await db.getAgentStoreConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error("[Admin Agent Store Config GET Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load agent store config." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: "Missing action." }, { status: 400 });
    }

    if (action === "update_config") {
      const { is_enabled, developer_master_enabled, admin_enabled, registration_fee, custom_domain } = body;
      const updated = await db.updateAgentStoreConfig({
        is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : undefined,
        developer_master_enabled: developer_master_enabled !== undefined ? Boolean(developer_master_enabled) : undefined,
        admin_enabled: admin_enabled !== undefined ? Boolean(admin_enabled) : undefined,
        registration_fee: registration_fee !== undefined ? Number(registration_fee) : undefined,
        custom_domain: custom_domain !== undefined ? String(custom_domain) : undefined,
      });
      return NextResponse.json({ success: true, message: "Agent store configuration updated.", config: updated });
    }

    return NextResponse.json({ success: false, message: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin Agent Store Config POST Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Operation failed." },
      { status: 500 }
    );
  }
}