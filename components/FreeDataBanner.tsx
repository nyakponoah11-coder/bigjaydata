"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Gift, Clock, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import FreeDataClaimModal from "./FreeDataClaimModal";

interface VoucherInfo {
  id: string;
  tagline: string;
  network: string;
  package_size: string;
  remaining_claims: number;
  expires_at?: string | null;
}

export default function FreeDataBanner() {
  const pathname = usePathname();
  const [voucher, setVoucher] = useState<VoucherInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch(`/api/vouchers/active?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.active && data?.voucher) {
          setVoucher(data.voucher);
        } else {
          setVoucher(null);
        }
      }
    } catch (err) {
      console.error("Failed to load active voucher:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActive();

    // Check periodically so the storefront automatically updates when admin turns promo on/off
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchActive();
      }
    }, 15000);

    const handleEvent = () => fetchActive();
    window.addEventListener("voucher_updated", handleEvent);
    window.addEventListener("storage", handleEvent);
    window.addEventListener("focus", handleEvent);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("voucher_updated", handleEvent);
      window.removeEventListener("storage", handleEvent);
      window.removeEventListener("focus", handleEvent);
    };
  }, [fetchActive]);

  // Countdown Timer Logic
  useEffect(() => {
    if (!voucher?.expires_at) {
      setTimeLeft(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(voucher.expires_at!).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setVoucher(null); // Auto-hide when time expires
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hStr = hours > 0 ? `${hours}h ` : "";
      const mStr = `${minutes.toString().padStart(2, "0")}m `;
      const sStr = `${seconds.toString().padStart(2, "0")}s`;
      setTimeLeft(`${hStr}${mStr}${sStr}`);
    };

    updateCountdown();
    const timerInterval = setInterval(updateCountdown, 1000);
    return () => clearInterval(timerInterval);
  }, [voucher?.expires_at]);

  // Hide on admin routes and agent backoffice
  if (pathname && (pathname.startsWith("/admin") || pathname.startsWith("/agent/dashboard"))) {
    return null;
  }

  if (loading || !voucher) return null;

  return (
    <>
      {/* Middle of Left Side Floating Docked Badge with Vibrant Animations */}
      <div className="fixed top-1/2 -translate-y-1/2 left-0 z-[60] pointer-events-auto">
        <button
          onClick={() => setIsModalOpen(true)}
          className="group relative overflow-hidden flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 pl-3 pr-4 py-3.5 rounded-r-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white font-extrabold shadow-2xl shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all duration-300 border-y-2 border-r-2 border-emerald-300/60 hover:border-amber-300 animate-pulse hover:animate-none cursor-pointer"
          title={voucher.tagline || "Claim Free Data Voucher"}
          style={{
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.45), 0 0 40px rgba(99, 102, 241, 0.25)",
          }}
        >
          {/* Shimmer sweep animation overlay */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Icon with bounce & glow */}
          <div className="relative flex items-center justify-center">
            <Gift className="w-6 h-6 text-amber-300 animate-bounce drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300 shadow-sm"></span>
            </span>
          </div>

          <div className="flex flex-col items-start leading-tight">
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-black tracking-wider text-white uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Free Data
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: "4s" }} />
            </div>

            {/* Countdown Timer Display (if set) */}
            {timeLeft && (
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-200 mt-0.5 bg-black/30 px-1.5 py-0.5 rounded-full border border-amber-300/30">
                <Clock className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
                <span>{timeLeft}</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Claim Modal */}
      <FreeDataClaimModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchActive(); // Refresh count after modal interaction
        }}
        tagline={voucher.tagline}
        defaultNetwork={voucher.network}
        defaultPackageSize={voucher.package_size}
      />
    </>
  );
}
