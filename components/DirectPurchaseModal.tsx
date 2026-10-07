"use client";

import React, { useState } from "react";
import { X, Zap, Loader2, CheckCircle2, AlertCircle, Phone, Wifi, Package, Wallet } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentBalance?: number | null;
}

const COMMON_BUNDLES = ["1GB", "2GB", "3GB", "5GB", "10GB", "20GB"];

export default function DirectPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
}: Props) {
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("mtn");
  const [packageSize, setPackageSize] = useState("1GB");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit Ghanaian phone number (e.g. 0551234567).");
      return;
    }

    if (!packageSize.trim()) {
      setError("Please enter or select a package size.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/orders/direct-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          network,
          package_size: packageSize.trim().toUpperCase(),
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to dispatch direct order.");
      }

      setSuccessResult(data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhone("");
    setNetwork("mtn");
    setPackageSize("1GB");
    setNote("");
    setError(null);
    setSuccessResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Direct DataMart Purchase</h2>
              <p className="text-xs text-amber-100 font-medium">
                Instant delivery funded directly from your DataMart wallet
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Reminder Banner */}
        {currentBalance !== undefined && currentBalance !== null && (
          <div className="bg-slate-950/80 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              Available DataMart Balance:
            </span>
            <span className="font-mono font-black text-emerald-400">
              GHS {currentBalance.toFixed(2)}
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {successResult ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-950 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-white">Purchase Successful!</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                {successResult.message || "Data dispatched successfully to recipient line."}
              </p>
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300 space-y-1">
                <div>
                  Order Ref: <span className="text-emerald-400 font-bold">{successResult.reference}</span>
                </div>
                {successResult.datamart?.order_reference && (
                  <div>
                    DataMart Ref:{" "}
                    <span className="text-amber-400 font-bold">
                      {successResult.datamart.order_reference}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleReset}
                className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
              >
                Close & View Orders
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              {/* Telco Network */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Network
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "mtn", name: "MTN", color: "hover:border-amber-400 peer-checked:border-amber-400 peer-checked:bg-amber-400/10" },
                    { id: "telecel", name: "Telecel", color: "hover:border-red-500 peer-checked:border-red-500 peer-checked:bg-red-500/10" },
                    { id: "at", name: "AT", color: "hover:border-blue-500 peer-checked:border-blue-500 peer-checked:bg-blue-500/10" },
                  ].map((net) => (
                    <label
                      key={net.id}
                      className="cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="network"
                        value={net.id}
                        checked={network === net.id}
                        onChange={() => setNetwork(net.id)}
                        className="sr-only peer"
                      />
                      <div className={`py-2.5 text-center rounded-xl border border-slate-700 bg-slate-800 text-xs font-black uppercase transition-all ${net.color} ${network === net.id ? "text-white" : "text-slate-400"}`}>
                        {net.name}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Package Size */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Package Size
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                  {COMMON_BUNDLES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPackageSize(size)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                        packageSize === size
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={packageSize}
                  onChange={(e) => setPackageSize(e.target.value)}
                  placeholder="Or custom size (e.g. 500MB, 15GB)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Recipient Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Recipient Phone Number
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
                    placeholder="0551234567"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Optional Admin Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Internal Admin Note (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Manual customer topup / offline cash payment"
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Information Footnote */}
              <p className="text-[11px] text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-800 leading-relaxed">
                ⚡ <strong>Direct Wallet Purchase:</strong> No Paystack checkout or customer card required. Data is bought and delivered straight from your DataMart account balance.
              </p>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Dispatching from DataMart...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950" />
                    <span>Buy & Deliver Now</span>
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
