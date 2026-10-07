"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Clock,
  CheckCircle2,
  RefreshCw,
  Activity,
  Layers,
  Sparkles,
  Radio,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { DeliveryTrackerData } from "@/lib/datamart";

interface Props {
  variant?: "store" | "admin";
  className?: string;
  compact?: boolean;
}

export default function DeliveryTrackerCard({
  variant = "store",
  className = "",
  compact = false,
}: Props) {
  const [tracker, setTracker] = useState<DeliveryTrackerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(15);

  const fetchTrackerData = async (manual = false) => {
    if (manual) setLoading(true);
    try {
      const res = await fetch("/api/delivery-tracker", { cache: "no-store" });
      const data = await res.json();
      if (data && (data.status === "success" || data.data)) {
        setTracker(data);
        setLastRefreshed(new Date());
        setCountdown(15);
      }
    } catch (err) {
      console.warn("Delivery tracker poll error:", err);
    } finally {
      if (manual) setLoading(false);
    }
  };

  // Initial fetch and 15s polling
  useEffect(() => {
    fetchTrackerData();
    const interval = setInterval(() => {
      fetchTrackerData();
    }, 15000);

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  const scanner = tracker?.data?.scanner || {
    active: true,
    waiting: false,
    waitSeconds: 0,
  };
  const stats = tracker?.data?.stats || {
    checked: 0,
    delivered: 0,
    partial: 0,
    pending: 0,
    failed: 0,
  };

  /**
   * Real Estimated Delivery Time calculation per user instruction:
   * "last order placed at 3:35, delivered at 3:47. So you calculate the time range between them, then you take it to the estimated time."
   */
  const getEstimatedDelivery = () => {
    const summary = tracker?.data?.lastDelivered?.summary || "";

    // Regex to match: placed at [time], delivered at [time]
    // Examples: "placed at Apr 03, 10:03 AM, delivered at Apr 03, 11:51 AM" or "placed at 3:35, delivered at 3:47"
    const match = summary.match(/placed\s+at\s+([^,]+?),\s*delivered\s+at\s+([^,\s—]+(?:\s*(?:AM|PM))?)/i);

    if (match) {
      const placedStr = match[1].trim();
      const deliveredStr = match[2].trim();

      const parseTimeToMinutes = (str: string) => {
        // Check "10:03 AM" or "3:35"
        const timeMatch = str.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3]?.toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
          return hours * 60 + minutes;
        }
        return null;
      };

      const placedMins = parseTimeToMinutes(placedStr);
      const deliveredMins = parseTimeToMinutes(deliveredStr);

      if (placedMins !== null && deliveredMins !== null) {
        let diff = deliveredMins - placedMins;
        if (diff < 0) diff += 24 * 60; // Midnight rollover

        if (diff <= 1) {
          return { time: "Under 1 Min", badge: "⚡ Real Instant", isTurbo: true };
        } else if (diff < 60) {
          return { time: `${diff} Mins`, badge: diff <= 3 ? "⚡ Turbo" : "Direct Telco", isTurbo: diff <= 3 };
        } else {
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          return { time: `${h}h ${m}m`, badge: "Batch Completed", isTurbo: false };
        }
      }
    }

    if (scanner.waiting) {
      return {
        time: `~${Math.max(scanner.waitSeconds || 30, 15)}s`,
        badge: "Paused Briefly",
        isTurbo: false,
      };
    }

    if (stats.pending <= 3) {
      return { time: "30 - 60 Secs", badge: "⚡ High Speed", isTurbo: true };
    }
    return { time: "1 - 3 Mins", badge: "Live Dispatch", isTurbo: true };
  };

  const estimated = getEstimatedDelivery();
  const isAdmin = variant === "admin";

  const successRate = stats.checked > 0
    ? Math.min(100, Math.round(((stats.delivered) / (stats.checked || 1)) * 100))
    : 100;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border transition-all duration-300 shadow-sm ${
        isAdmin
          ? "bg-slate-900/90 border-slate-800 text-slate-100"
          : "bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 border-emerald-500/20 text-white"
      } ${className}`}
    >
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-4 sm:p-5 z-10">
        {/* TOP ROW: Live Delivery Checker & Estimated Delivery Time */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          {/* Live Delivery Checker State Indicator */}
          <div className="flex items-center gap-3">
            {scanner.active ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span>Live Delivery Checker</span>
              </div>
            ) : scanner.waiting ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wide">
                <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Live Delivery Checker • Paused ({scanner.waitSeconds}s)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-500/20 border border-slate-500/30 text-slate-400 text-xs font-bold tracking-wide">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Live Delivery Checker • Idle</span>
              </div>
            )}

            <span className="hidden md:inline-block text-xs text-slate-300 font-medium">
              {tracker?.data?.message || "DataMart automated live order delivery checker active"}
            </span>
          </div>

          {/* ESTIMATED DELIVERY TIME BADGE */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-1.5 rounded-2xl shadow-inner">
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                    Est. Delivery Time:
                  </span>
                  <span className="font-mono font-black text-xs text-white">
                    {estimated.time}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => fetchTrackerData(true)}
              disabled={loading}
              title={`Auto-refreshes in ${countdown}s. Click to refresh now.`}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors shrink-0 flex items-center gap-1 text-[11px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              <span className="hidden xs:inline font-mono text-[10px] text-slate-400">{countdown}s</span>
            </button>
          </div>
        </div>

        {/* MIDDLE ROW: LIVE STATS METRICS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-3">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Orders Scanned
              </span>
              <span className="text-base sm:text-lg font-black text-white font-mono">
                {stats.checked}
              </span>
            </div>
            <Activity className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                Delivered
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                {stats.delivered}
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-400 block">
                In Queue
              </span>
              <span className="text-base sm:text-lg font-black text-sky-400 font-mono">
                {stats.pending}
              </span>
            </div>
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 block">
                Success Rate
              </span>
              <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                {successRate}%
              </span>
            </div>
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
        </div>

        {/* BOTTOM ROW: LIVE DISPATCH TICKER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2.5 border-t border-white/10 text-[11px] text-slate-300">
          <div className="flex items-center gap-2 truncate max-w-full">
            <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <span className="font-semibold text-emerald-300 shrink-0">Live Telco Feed:</span>
            <span className="truncate text-slate-300">
              {tracker?.data?.checkingNow?.summary || "Automated direct network batch dispatch active"}
            </span>
          </div>

          {tracker?.data?.lastDelivered?.summary && (
            <div className="text-slate-400 truncate text-[10px] sm:text-[11px] self-end sm:self-auto font-mono">
              ✓ {tracker.data.lastDelivered.summary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
