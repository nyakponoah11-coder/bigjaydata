"use client";

import React, { useState } from "react";
import { X, Gift, CheckCircle2, AlertCircle, Loader2, Sparkles, Phone, KeyRound } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tagline?: string;
  defaultNetwork?: string;
  defaultPackageSize?: string;
}

export default function FreeDataClaimModal({
  isOpen,
  onClose,
  tagline,
  defaultNetwork,
  defaultPackageSize,
}: Props) {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    message: string;
    reference: string;
    network?: string;
    package_size?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");

    if (!cleanCode) {
      setError("Please enter the voucher code.");
      return;
    }

    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit phone number (e.g. 0551234567).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/vouchers/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, phone: cleanPhone }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to claim voucher. Please check code.");
        setLoading(false);
        return;
      }

      setSuccessData(data);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while claiming.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCode("");
    setPhone("");
    setError(null);
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-emerald-500/30 dark:border-emerald-500/20 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-6 text-white relative">
          <button
            onClick={handleReset}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Gift className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-emerald-200 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Special Giveaway
              </div>
              <h2 className="text-xl font-black tracking-tight">Claim Free Data</h2>
            </div>
          </div>
          {tagline && (
            <p className="mt-3 text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed bg-white/10 rounded-xl px-3 py-1.5">
              {tagline}
            </p>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {successData ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Voucher Redeemed!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed px-2">
                {successData.message}
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-xs font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Reference: <span className="font-bold text-emerald-600 dark:text-emerald-400">{successData.reference}</span>
              </div>
              <button
                onClick={handleReset}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleClaim} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              {/* Voucher Code Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Voucher Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onPaste={(e) => e.preventDefault()}
                    placeholder="Enter unique code"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono font-bold tracking-wider text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase text-sm"
                  />
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Beneficiary Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    onPaste={(e) => e.preventDefault()}
                    placeholder="0551234567"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono font-bold tracking-wider text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying & Sending Data...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    <span>Claim Free Data Now</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
