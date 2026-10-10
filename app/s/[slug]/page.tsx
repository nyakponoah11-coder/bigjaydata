import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import StorefrontClientView from "@/app/store/[slug]/StorefrontClientView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ShortStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();

  const config = await db.getAgentStoreConfig();
  if (!config.is_enabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h1 className="text-xl font-bold">Store Temporarily Offline</h1>
          <p className="text-xs text-slate-400 mt-2">
            This storefront is currently undergoing scheduled maintenance. Please check back shortly.
          </p>
        </div>
      </div>
    );
  }

  const agent = await db.getAgentBySlug(cleanSlug);
  if (!agent) {
    notFound();
  }

  if (!agent.is_active) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h1 className="text-xl font-bold">Store Inactive</h1>
          <p className="text-xs text-slate-400 mt-2">
            This storefront has been temporarily paused. Please contact the store owner.
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
