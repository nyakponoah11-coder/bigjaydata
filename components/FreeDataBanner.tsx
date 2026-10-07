"use client";

import React, { useState, useEffect } from "react";
import { Gift, Clock, Sparkles } from "lucide-react";
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
  const [voucher, setVoucher] = useState<VoucherInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchActive = async () => {
      try {
        const res = await fetch("/api/vouchers/active");
        const data = await res.json();
        if (isMounted && data.active && data.voucher) {
          setVoucher(data.voucher);
        } else if (isMounted) {
          setVoucher(null);
        }
      } catch (err) {
        console.error("Failed to load active voucher:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchActive();
    const interval = setInterval(fetchActive, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

  if (loading || !voucher) return null;

  return (
    <>
      {/* Middle of Left Side Floating Docked Badge */}
      <div className="fixed top-1/2 -translate-y-1/2 left-0 z-40 pointer-events-auto">
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 pl-2.5 pr-3.5 py-3 rounded-r-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white font-extrabold shadow-2xl shadow-emerald-950/60 hover:scale-105 active:scale-95 transition-all border-y border-r border-emerald-400/40 hover:border-emerald-300"
          title={voucher.tagline || "Claim Free Data Voucher"}
        >
          <div className="relative flex items-center justify-center">
            <Gift className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform drop-shadow" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
            </span>
          </div>

          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase drop-shadow-sm">
              Free Data
            </span>

            {/* Countdown Timer Display (if set) */}
            {timeLeft && (
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-200 mt-0.5">
                <Clock className="w-2.5 h-2.5 animate-pulse" />
                <span>{timeLeft}</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Claim Modal */}
      <FreeDataClaimModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tagline={voucher.tagline}
        defaultNetwork={voucher.network}
        defaultPackageSize={voucher.package_size}
      />
    </>
  );
}
