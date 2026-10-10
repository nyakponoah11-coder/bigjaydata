import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import StorefrontClientView from "@/app/store/[slug]/StorefrontClientView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();
  const agent = await db.getAgentBySlug(cleanSlug);

  if (!agent) {
    return {
      title: "Automated Data Portal",
      description: "Buy cheap MTN, Telecel, and AT data bundles with instant automated delivery.",
    };
  }

  const storeTitle = `${agent.store_name} | Instant Automated Data Portal`;
  const storeDesc =
    agent.description ||
    `Get fast, non-expiry MTN, Telecel, and AT data bundles from ${agent.store_name}. 100% automated delivery to your line in 60s.`;

  return {
    title: storeTitle,
    description: storeDesc,
    applicationName: agent.store_name,
    openGraph: {
      title: storeTitle,
      description: storeDesc,
      siteName: agent.store_name,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: storeTitle,
      description: storeDesc,
    },
  };
}

export default async function ShortStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();

  const agent = await db.getAgentBySlug(cleanSlug);
  if (!agent) {
    notFound();
  }

  const agentStoreConfig = await db.getAgentStoreConfig();
  if (!agentStoreConfig.is_enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0b1021] to-[#050811] text-slate-100 flex flex-col justify-between p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
        {/* Top Minimal Nav */}
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-4">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black border border-slate-800 flex items-center justify-center p-0.5 shadow-md">
              <img src="/logo.png" alt="BundleMartGh" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">BundleMartGh</span>
          </a>

          <a
            href="/"
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            ← Return to Main Site
          </a>
        </div>

        {/* Coming Soon Hero Banner */}
        <div className="max-w-2xl mx-auto w-full text-center py-16 sm:py-24 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/80 border border-rose-700/60 shadow-lg shadow-rose-950/50">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-rose-300">
              Agent Storefronts • Access Paused
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Agent Storefront <br />
            <span className="bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
              Coming Soon
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            This agent storefront is temporarily paused by platform administration. Please check back shortly or visit the main store.
          </p>

          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 max-w-md mx-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <span>🔧</span>
              <span>Scheduled Maintenance</span>
            </div>
            <p className="text-xs text-slate-400">
              Agent stores are currently undergoing maintenance. Visit the main BundleMartGh store for instant data bundles.
            </p>
            <a
              href="/"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/30 block text-center"
            >
              Visit Main Store
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-6xl mx-auto w-full text-center py-6 border-t border-slate-800/60 text-xs text-slate-500">
          BundleMartGh Agent Storefronts • Automated Data Delivery for Ghana
        </div>
      </div>
    );
  }

  const config = await db.getAgentStoreConfig();
  if (!config.is_enabled && !agent.is_active) {
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
