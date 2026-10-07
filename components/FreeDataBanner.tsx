"use client";

import React, { useState, useEffect } from "react";
import { Gift, Sparkles, ChevronRight } from "lucide-react";
import FreeDataClaimModal from "./FreeDataClaimModal";

interface VoucherInfo {
  id: string;
  tagline: string;
  network: string;
  package_size: string;
  remaining_claims: number;
}

export default function FreeDataBanner() {
  const [voucher, setVoucher] = useState<VoucherInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
    // Poll every 30 seconds to stay updated
    const interval = setInterval(fetchActive, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || !voucher) return null;

  return (
    <>
      {/* Top Tagline Bar */}
      <div className="relative z-30 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-inner transition-all py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          {/* Middle / Tagline Text */}
          <div className="flex items-center justify-center gap-2 flex-1">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
            </span>
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="tracking-wide font-bold drop-shadow-sm text-emerald-50">
              {voucher.tagline}
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-black uppercase tracking-wider text-emerald-100">
              {voucher.package_size} {voucher.network.toUpperCase()}
            </span>
          </div>

          {/* Right Side: Claim Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="group shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs tracking-wider uppercase shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Gift className="w-3.5 h-3.5 text-slate-950 group-hover:rotate-12 transition-transform" />
            <span>Free Data</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Free Data Badge on Mobile/Desktop */}
      <div className="fixed bottom-24 right-5 z-40 sm:bottom-6 sm:right-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-105 active:scale-95 transition-all border border-emerald-400/30"
          title="Claim Free Data Voucher"
        >
          <div className="relative">
            <Gift className="w-5 h-5 text-amber-300 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
            </span>
          </div>
          <span className="tracking-wide">Claim Free Data</span>
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
