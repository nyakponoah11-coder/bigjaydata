"use client";

import React, { useEffect } from "react";
import { Wrench, ShieldAlert, Clock, Phone, RefreshCw } from "lucide-react";

interface MaintenanceScreenProps {
  message?: string;
  supportPhone?: string;
}

export default function MaintenanceScreen({ message, supportPhone }: MaintenanceScreenProps) {
  // Auto-poll every 5 seconds so when the admin turns maintenance OFF, visitors are automatically returned to normal!
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/link", { cache: "no-store" });
        const data = await res.json();
        if (data.success && data.maintenance_mode === false) {
          window.location.reload();
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const cleanPhone = (supportPhone || "0547100951").replace(/[^0-9]/g, "");
  const waLink = `https://wa.me/${cleanPhone.startsWith("0") ? "233" + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent("Hello Admin, I am writing regarding BundleMart maintenance.")}`;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 text-white flex flex-col items-center justify-center p-6 overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-lg w-full text-center relative z-10 flex flex-col items-center">
        {/* Animated Badge */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-500/20 text-amber-400">
            <Wrench className="w-12 h-12 animate-bounce" />
          </div>
          <div className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full shadow-lg animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-widest mb-4">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          System Maintenance Active
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
          We&apos;ll Be Right Back!
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mb-6">
          {message ||
            "Our platform is currently offline for scheduled maintenance and security upgrades. All transactions and store purchases are temporarily paused."}
        </p>

        {/* Reassurance Card */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 mb-6 space-y-2 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-slate-300 font-semibold">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Estimated Resumption: Very Shortly</span>
          </div>
          <p className="text-[11px] text-slate-500">
            All customer balances and pending orders are 100% secure. This page will automatically refresh as soon as maintenance is complete.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Check If Online
          </button>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Contact Admin on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
