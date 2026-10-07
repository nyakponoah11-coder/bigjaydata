"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Zap,
  Wallet,
  Phone,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
} from "lucide-react";

const COMMON_BUNDLES = ["1GB", "2GB", "3GB", "5GB", "10GB", "20GB"];

export default function AdminDirectPurchasePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("mtn");
  const [packageSize, setPackageSize] = useState("1GB");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (data.success && data.stats?.datamartBalance) {
        setBalance(data.stats.datamartBalance.balance);
      }
    } catch (err) {
      console.error("Failed to fetch DataMart balance:", err);
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit Ghanaian phone number (e.g. 0551234567).");
      return;
    }

    if (!packageSize.trim()) {
      setError("Please select or enter a package size.");
      return;
    }

    setSubmitting(true);

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
        throw new Error(data.error || data.message || "Failed to dispatch order.");
      }

      setResult(data);
      setPhone("");
      setNote("");
      fetchBalance();
    } catch (err: any) {
      setError(err?.message || "Failed to complete direct purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Zap className="w-4 h-4" />
              Direct Reseller Purchase
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Buy Direct from DataMart Wallet
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Dispatch mobile data instantly to any number without going through Paystack. Deducted straight from your DataMart balance.
            </p>
          </div>

          {/* Balance Pill */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Reseller Balance
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-white">
                {balanceLoading ? (
                  <span className="text-xs text-slate-500">Checking...</span>
                ) : balance !== null ? (
                  <span className="text-emerald-400">GHS {balance.toFixed(2)}</span>
                ) : (
                  "Active"
                )}
              </div>
            </div>
            <button
              onClick={fetchBalance}
              disabled={balanceLoading}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh Balance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${balanceLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Success or Error Banners */}
        {result && (
          <div className="p-5 rounded-3xl bg-emerald-950/70 border border-emerald-500/40 text-white space-y-2 shadow-xl animate-in fade-in">
            <div className="flex items-center gap-2.5 text-emerald-300 font-extrabold text-sm sm:text-base">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <span>Direct Purchase Dispatched Successfully!</span>
            </div>
            <p className="text-xs text-slate-300 pl-8 leading-relaxed">
              {result.message}
            </p>
            <div className="pl-8 pt-1 flex flex-wrap gap-4 text-xs font-mono text-slate-300">
              <div>
                Order Ref: <span className="text-emerald-400 font-bold">{result.reference}</span>
              </div>
              {result.datamart?.order_reference && (
                <div>
                  DataMart Ref:{" "}
                  <span className="text-amber-400 font-bold">
                    {result.datamart.order_reference}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Main Grid Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-base sm:text-lg font-black text-white mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              Dispatch Details
            </h2>

            <form onSubmit={handlePurchase} className="space-y-6">
              {/* Telco Network */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Select Network
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "mtn", name: "MTN Ghana", color: "peer-checked:border-amber-400 peer-checked:bg-amber-400/10 text-amber-400" },
                    { id: "telecel", name: "Telecel Ghana", color: "peer-checked:border-red-500 peer-checked:bg-red-500/10 text-red-400" },
                    { id: "at", name: "AT (AirtelTigo)", color: "peer-checked:border-blue-500 peer-checked:bg-blue-500/10 text-blue-400" },
                  ].map((net) => (
                    <label key={net.id} className="cursor-pointer">
                      <input
                        type="radio"
                        name="network"
                        value={net.id}
                        checked={network === net.id}
                        onChange={() => setNetwork(net.id)}
                        className="sr-only peer"
                      />
                      <div className={`py-3 text-center rounded-2xl border border-slate-700 bg-slate-800/80 text-xs font-black transition-all hover:border-slate-600 ${net.color}`}>
                        {net.name}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Package Size */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Data Package Size
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2.5">
                  {COMMON_BUNDLES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPackageSize(size)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                        packageSize === size
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105"
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
                  placeholder="Or enter custom size (e.g. 500MB, 15GB, 50GB)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Internal Note (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Offline order, loyalty reward, test topup"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Sending Data via DataMart...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950" />
                    <span>Purchase & Deliver Immediately</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info Side Card */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-white">
                Direct Purchase Rules
              </h3>
              <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Zero Paystack Fee:</strong> Bypasses the customer payment gateway completely.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Instant Dispatch:</strong> Uses DataMart&apos;s developer API directly with your configured wallet credentials.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Order Logged:</strong> Automatically tracked in your Orders system with payment status marked as &ldquo;admin_direct&rdquo;.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
