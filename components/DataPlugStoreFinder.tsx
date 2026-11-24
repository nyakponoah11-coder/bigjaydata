"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Zap, ShieldCheck, ArrowRight, Store, AlertCircle, Loader2, Sparkles, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function DataPlugStoreFinder() {
  const router = useRouter();
  const [storeQuery, setStoreQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanInput = (val: string) => {
    return val
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/^(www\.)?dataplug1\.com\/?/i, "")
      .replace(/^(www\.)?bundlemartgh\.com\/?/i, "")
      .replace(/^(s|store)\//i, "")
      .replace(/[^a-z0-9_-]/g, "");
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const slug = cleanInput(storeQuery);
    if (!slug) {
      setError("Please enter an agent store name (e.g. jaydata).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/store/${encodeURIComponent(slug)}`);
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.agent) {
        // Store verified, route directly!
        router.push(`/${encodeURIComponent(slug)}`);
      } else if (res.status === 404 || data.message?.toLowerCase().includes("not found")) {
        setError(`Store "${slug}" was not found. Please check the spelling or ask your agent for their exact link.`);
        setLoading(false);
      } else if (data.is_closed || res.status === 503) {
        setError(data.message || "This agent store is currently offline.");
        setLoading(false);
      } else {
        // Fallback: Attempt direct navigation
        router.push(`/${encodeURIComponent(slug)}`);
      }
    } catch {
      router.push(`/${encodeURIComponent(slug)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-96 h-96 bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-tight text-white">DataPlug</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Network
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Agent Storefront Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/agent/login"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <span>Agent Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Hero & Search Box */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 text-center relative z-10 my-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 shadow-lg shadow-indigo-950/50 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
            Verified Agent Stores • Instant Delivery
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Find Your <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
            Agent Storefront
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto mt-4 leading-relaxed">
          Enter the agent’s store name below to access their custom bundle packages, discount prices, and 24/7 automated delivery.
        </p>

        {/* Interactive Store Lookup Card */}
        <div className="mt-8 p-3 sm:p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLookup} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-slate-950 rounded-2xl p-2 border border-slate-800 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <div className="flex items-center pl-3 text-slate-400 font-mono text-xs sm:text-sm select-none border-b sm:border-b-0 sm:border-r border-slate-800/80 pb-2 sm:pb-0 sm:pr-3">
                <Store className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                <span className="text-slate-500 font-semibold">dataplug1.com/</span>
              </div>

              <input
                type="text"
                value={storeQuery}
                onChange={(e) => {
                  setStoreQuery(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="store-name (e.g. jaydata)"
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none font-medium"
                autoFocus
              />

              <button
                type="submit"
                disabled={loading}
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 shrink-0 cursor-pointer active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <span>Visit Store</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Error Notice */}
            {error && (
              <div className="p-3 bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs rounded-xl flex items-center gap-2 text-left animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">60-Sec Delivery</p>
              <p className="text-[10px] text-slate-400">Direct carrier topup</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">MoMo Verified</p>
              <p className="text-[10px] text-slate-400">Safe Paystack checkout</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Direct Agent Price</p>
              <p className="text-[10px] text-slate-400">Exclusive bundle rates</p>
            </div>
          </div>
        </div>

        {/* Call to action for becoming an agent */}
        <div className="mt-10 p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/50 border border-indigo-900/40 text-center space-y-2">
          <p className="text-xs font-bold text-indigo-300">Want to sell data bundles and earn daily profits?</p>
          <p className="text-[11px] text-slate-400">
            Create your personalized store on DataPlug in less than 2 minutes. Set your own prices and get paid directly to your mobile money.
          </p>
          <div className="pt-2">
            <Link
              href="/agent/signup"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl shadow-md transition-all"
            >
              <span>Create Your Agent Store</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
        <p>© {new Date().getFullYear()} DataPlug Network. All rights reserved.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <Link href="/track" className="hover:text-slate-300 transition-colors">
            Track Order
          </Link>
          <Link href="/agent/login" className="hover:text-slate-300 transition-colors">
            Agent Dashboard
          </Link>
          <Link href="/agent/signup" className="hover:text-slate-300 transition-colors">
            Register as Agent
          </Link>
        </div>
      </footer>
    </div>
  );
}
