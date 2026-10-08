"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Store,
  Sparkles,
  ArrowLeft,
  Clock,
  ShieldCheck,
  TrendingUp,
  Zap,
  CheckCircle,
  MessageCircle,
  Bell,
  Users,
  Wallet,
  ArrowRight,
} from "lucide-react";

interface Props {
  storeName?: string;
  whatsappNumber?: string;
}

export default function AgentStoreClientView({
  storeName = "Big Jay Data",
  whatsappNumber = "233551234567",
}: Props) {
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [joined, setJoined] = useState(false);

  const cleanNumber = (whatsappNumber || "233551234567").replace(/[^0-9]/g, "");

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPhone.trim()) return;

    // Send waitlist message via WhatsApp directly to admin
    const text = encodeURIComponent(
      `Hello ${storeName}! I want to pre-register as an Agent for the Agent Store.\n\nName: ${agentName.trim() || "Reseller"}\nPhone: ${agentPhone.trim()}`
    );
    setJoined(true);
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Nav Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Wholesale Portal
        </span>
      </div>

      {/* Main Hero Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/60 border-2 border-amber-500/30 p-6 sm:p-12 shadow-2xl shadow-amber-500/10 overflow-hidden text-center backdrop-blur-md">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-amber-500/20 to-transparent blur-3xl pointer-events-none" />

        {/* Store Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30 mb-4 border border-amber-300/40">
          <Store className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* Glowing COMING SOON Badge */}
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

        {/* Feature Highlights Pills */}
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

      {/* Pre-Register / Waitlist Form Card */}
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

        {joined ? (
          <div className="p-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
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
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
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
                value={agentPhone}
                onChange={(e) => setAgentPhone(e.target.value)}
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

        {/* Direct Chat With Admin */}
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
