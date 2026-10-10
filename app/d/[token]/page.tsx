import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { decodeAgentToken } from "@/lib/agent-link";
import StorefrontClientView from "@/app/store/[slug]/StorefrontClientView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DisguisedAgentStorePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decodedSlug = decodeAgentToken(decodeURIComponent(token));

  const config = await db.getAgentStoreConfig();
  if (!config.is_enabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h1 className="text-xl font-bold">Portal Temporarily Offline</h1>
          <p className="text-xs text-slate-400 mt-2">
            This data portal is currently undergoing scheduled updates. Please check back shortly.
          </p>
        </div>
      </div>
    );
  }

  // Look up agent by decoded slug, or raw token as slug
  let agent = await db.getAgentBySlug(decodedSlug);
  if (!agent && decodedSlug !== token) {
    agent = await db.getAgentBySlug(token.toLowerCase().trim());
  }

  if (!agent) {
    notFound();
  }

  if (!agent.is_active) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h1 className="text-xl font-bold">Portal Inactive</h1>
          <p className="text-xs text-slate-400 mt-2">
            This portal has been temporarily paused. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  const allCustomProducts = await db.getAgentProducts(agent.id);
  const activeProducts = allCustomProducts
    .filter((p) => p.is_active)
    .map((p) => ({
      id: p.id,
      network: p.network,
      size: p.size,
      price: p.selling_price,
    }));

  const settings = await db.getSettings();
  const paystackPublicKey = settings.paystack_public_key || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

  return (
    <StorefrontClientView
      agent={agent}
      products={activeProducts}
      paystackPublicKey={paystackPublicKey}
    />
  );
}
