import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();

    const config = await db.getAgentStoreConfig();
    if (!config.is_enabled) {
      return NextResponse.json({
        success: false,
        is_closed: true,
        message: "Agent Store network is temporarily unavailable.",
      }, { status: 503 });
    }

    const agent = await db.getAgentBySlug(cleanSlug);
    if (!agent) {
      return NextResponse.json(
        { success: false, message: "Store not found" },
        { status: 404 }
      );
    }

    if (!agent.is_active) {
      return NextResponse.json({
        success: false,
        is_closed: true,
        message: "This store is currently inactive.",
      }, { status: 403 });
    }

    const allCustomProducts = await db.getAgentProducts(agent.id);
    const activeProducts = allCustomProducts
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        network: p.network,
        size: p.size,
        price: p.selling_price, // Public only sees the agent's retail price!
      }));

    const settings = await db.getSettings();

    return NextResponse.json({
      success: true,
      store: {
        id: agent.id,
        name: agent.store_name,
        slug: agent.store_slug,
        description: agent.description,
        phone: agent.phone,
        email: agent.email,
        theme: agent.theme || "emerald",
        logo_url: agent.logo_url || "",
        whatsapp_number: agent.whatsapp_number || agent.phone,
        whatsapp_channel_url: agent.whatsapp_channel_url || "",
        support_email: agent.support_email || agent.email,
      },
      products: activeProducts,
      paystack_public_key: settings.paystack_public_key || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load store" },
      { status: 500 }
    );
  }
}
