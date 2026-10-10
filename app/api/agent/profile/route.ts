import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const config = await db.getAgentStoreConfig();

    // Auto-generate cloaked neutral link if missing
    if (!agent.cloaked_url) {
      try {
        const baseOrigin = config.custom_domain
          ? `https://${config.custom_domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`
          : process.env.NEXT_PUBLIC_BASE_URL || "https://www.bundlemartgh.com";
        const target = `${baseOrigin.replace(/\/+$/, "")}/s/${agent.store_slug}`;

        let shortLink = "";
        try {
          const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(target)}`, {
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            const text = await res.text();
            if (text && text.startsWith("http")) shortLink = text.trim();
          }
        } catch {}

        if (!shortLink) {
          try {
            const res2 = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(target)}`, {
              signal: AbortSignal.timeout(4000),
            });
            if (res2.ok) {
              const text2 = await res2.text();
              if (text2 && text2.startsWith("http")) shortLink = text2.trim();
            }
          } catch {}
        }

        if (shortLink) {
          agent.cloaked_url = shortLink;
          await db.updateAgent(agent.id, { cloaked_url: shortLink });
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      agent,
      custom_domain: config.custom_domain || process.env.NEXT_PUBLIC_STORE_DOMAIN || "",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      agent_id,
      store_slug,
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
      cloaked_url,
    } = body;

    if (!agent_id) {
      return NextResponse.json({ success: false, message: "Agent ID required" }, { status: 400 });
    }

    const updates: any = {};
    if (store_slug !== undefined) {
      const cleanSlug = String(store_slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (cleanSlug.length < 2) {
        return NextResponse.json(
          { success: false, message: "Store link handle must be at least 2 characters long." },
          { status: 400 }
        );
      }

      const reserved = ["admin", "agent", "api", "buy", "store", "s", "d", "developer", "track", "receipt", "help", "install"];
      if (reserved.includes(cleanSlug)) {
        return NextResponse.json(
          { success: false, message: `The link handle "/${cleanSlug}" is reserved. Please pick another name.` },
          { status: 400 }
        );
      }

      const existing = await db.getAgentBySlug(cleanSlug);
      if (existing && existing.id !== agent_id) {
        return NextResponse.json(
          { success: false, message: `The link handle "/${cleanSlug}" is already taken by another agent.` },
          { status: 400 }
        );
      }

      updates.store_slug = cleanSlug;
    }

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
    if (cloaked_url !== undefined) updates.cloaked_url = String(cloaked_url).trim();

    const updated = await db.updateAgent(agent_id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, agent: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
