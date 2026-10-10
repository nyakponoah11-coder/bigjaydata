"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Zap,
  CheckCircle2,
  Users,
  Wallet,
  ArrowRight,
  LogIn,
  UserPlus,
  Share2,
  DollarSign,
  Smartphone,
  Clock,
  Bell,
  MessageCircle,
} from "lucide-react";

interface Props {
  storeName?: string;
  whatsappNumber?: string;
  isEnabled?: boolean;
}

export default function AgentStoreClientView({
  storeName = "Big Jay Data",
  whatsappNumber = "233551234567",
  isEnabled = true,
}: Props) {
  const [existingAgent, setExistingAgent] = useState<any>(null);
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("bmgh_agent_session");
        if (saved) {
          setExistingAgent(JSON.parse(saved));
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const cleanNumber = (whatsappNumber || "233551234567").replace(/[^0-9]/g, "");

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistPhone.trim()) return;

    const text = encodeURIComponent(
      `Hello ${storeName}! I want to pre-register as an Agent for the Agent Store.\n\nName: ${waitlistName.trim() || "Reseller"}\nPhone: ${waitlistPhone.trim()}`
    );
    setJoinedWaitlist(true);
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, "_blank");
  };

  // ==========================================
  // 1. COMING SOON VIEW (When Stony toggles OFF)
  // ==========================================
  if (!isEnabled) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Storefront</span>
          </Link>
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Wholesale Network • Pre-Launch
          </span>
        </div>

        {/* Coming Soon Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/60 border-2 border-amber-500/30 p-6 sm:p-12 shadow-2xl shadow-amber-500/10 overflow-hidden text-center backdrop-blur-md">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-amber-500/20 to-transparent blur-3xl pointer-events-none" />

          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30 mb-4 border border-amber-300/40">
            <Store className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 mb-4">
            <Clock className="w-4 h-4 animate-spin text-amber-300" style={{ animationDuration: "8s" }} />
            <span>Coming Soon</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            {storeName} Agent Store
          </h1>

          <p className="mt-4 text-xs sm:text-sm lg:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The ultimate wholesale data portal for business agents, campus vendors, and mobile resellers. Buy bundles at discounted bulk wholesale rates and resell to your clients for maximum daily profits.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Wholesale Prices
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Pre-funded Agent Wallet
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Daily Profit Reports
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Priority Telco Gateway
            </span>
          </div>
        </div>

        {/* Pre-Register / Waitlist Card */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-xl max-w-2xl mx-auto">
          <div className="text-center space-y-1.5 mb-6">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-500/30 px-3 py-1 rounded-full">
              Early Access
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Pre-Register as an Official Agent
            </h2>
            <p className="text-xs text-slate-400">
              Be the first to access wholesale agent discounts as soon as the portal launches!
            </p>
          </div>

          {joinedWaitlist ? (
            <div className="p-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-white">You&apos;re on the Agent Waitlist!</h3>
              <p className="text-xs text-slate-300">
                Our admin team will reach out to you on WhatsApp as soon as your wholesale agent account is ready.
              </p>
            </div>
          ) : (
            <form onSubmit={handleJoinWaitlist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Full Name / Business Name
                </label>
                <input
                  type="text"
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                  placeholder="e.g. Samuel K. Data Services"
                  className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  WhatsApp Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={waitlistPhone}
                  onChange={(e) => setWaitlistPhone(e.target.value)}
                  placeholder="e.g. 0551234567"
                  className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>Join Agent Waitlist on WhatsApp</span>
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 text-[11px]">Want to speak to management directly?</span>
            <a
              href={`https://wa.me/${cleanNumber}?text=Hello%20${encodeURIComponent(storeName)}%2C%20I%20am%20interested%20in%20becoming%20an%20Agent.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat on WhatsApp Support</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. LIVE ACTIVE PORTAL (When Stony toggles ON)
  // ==========================================
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Nav Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Storefront</span>
        </Link>
        <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Agent Partner Network • Live
        </span>
      </div>

      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/70 border-2 border-emerald-500/30 p-6 sm:p-12 shadow-2xl shadow-emerald-500/10 overflow-hidden text-center backdrop-blur-md">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-emerald-500/20 to-transparent blur-3xl pointer-events-none" />

        {/* Store Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 mb-4 border border-emerald-300/40">
          <Store className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Start Your Reselling Business</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          {storeName} Agent Stores
        </h1>

        <p className="mt-4 text-xs sm:text-sm lg:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Launch your own branded data bundle store in 60 seconds. Buy at deep wholesale discounts, set your own selling price, and withdraw your profits directly to Mobile Money daily.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Link
            href="/agent/register"
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Your Agent Store</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/agent/login"
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            <span>Agent Login</span>
          </Link>
        </div>

        {existingAgent && (
          <div className="mt-5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 max-w-sm mx-auto text-xs text-emerald-300 flex items-center justify-between">
            <span>Welcome back, <strong>{existingAgent.store_name}</strong></span>
            <Link
              href="/agent/dashboard"
              className="font-bold underline hover:text-white"
            >
              Open Dashboard →
            </Link>
          </div>
        )}
      </div>

      {/* How It Works - 3 Step Flow */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <h2 className="text-xl sm:text-2xl font-black text-white text-center mb-6">
          How It Works in 3 Simple Steps
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-base">
              1
            </div>
            <h3 className="font-extrabold text-sm text-white">Create Your Store</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Register with your store name to get your personal store URL (e.g. <code>bundlemart.com/store/yourname</code>).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base">
              2
            </div>
            <h3 className="font-extrabold text-sm text-white">Set Your Selling Prices</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              We provide wholesale base rates. You decide your selling price and keep 100% of the profit margin on every sale.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-base">
              3
            </div>
            <h3 className="font-extrabold text-sm text-white">Automated Delivery & MoMo Payouts</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Customers pay on your storefront. Bundles are dispatched automatically, and your profits accumulate in your wallet for daily MoMo withdrawals.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h4 className="font-bold text-sm text-white">Wholesale Rates</h4>
          <p className="text-xs text-slate-400">Deep discounts on MTN, Telecel, and AT non-expiry bundles.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h4 className="font-bold text-sm text-white">Full Profit Control</h4>
          <p className="text-xs text-slate-400">You determine what your customers pay and keep every cedi of profit.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <Wallet className="w-5 h-5 text-blue-400" />
          <h4 className="font-bold text-sm text-white">Direct MoMo Payouts</h4>
          <p className="text-xs text-slate-400">Withdraw to your MTN or Telecel MoMo wallet anytime with 2-step OTP security.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <Share2 className="w-5 h-5 text-purple-400" />
          <h4 className="font-bold text-sm text-white">Branded Storefront</h4>
          <p className="text-xs text-slate-400">Share your custom link on WhatsApp, TikTok, campus groups, and Instagram.</p>
        </div>
      </div>

      {/* Bottom CTA Card */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/30 p-8 text-center space-y-4">
        <h3 className="text-xl sm:text-2xl font-black text-white">Ready to Start Earning Today?</h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
          Join hundreds of student resellers, shop owners, and agents earning daily passive income selling data bundles.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/agent/register"
            className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            Register Agent Store Now
          </Link>
          <a
            href={`https://wa.me/${cleanNumber}?text=Hello%20${encodeURIComponent(storeName)}%2C%20I%20have%20questions%20about%20the%20Agent%20Store%20Program.`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm border border-slate-700"
          >
            Chat With Admin
          </a>
        </div>
      </div>
    </div>
  );
}
