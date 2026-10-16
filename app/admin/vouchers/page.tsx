"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Gift,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  Phone,
  BarChart3,
  Tag,
  ShieldCheck,
  AlertCircle,
  Power,
  Clock,
  Calendar,
  Copy,
  Check,
  Share2,
} from "lucide-react";

interface Voucher {
  id: string;
  code: string;
  network: string;
  package_size: string;
  tagline: string;
  max_claims: number;
  claimed_count: number;
  min_orders_required?: number;
  batch_id?: string | null;
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
}

interface VoucherClaim {
  id: string;
  voucher_id: string;
  voucher_code: string;
  phone: string;
  customer_name?: string;
  customer_orders_count?: number;
  batch_id?: string | null;
  network: string;
  package_size: string;
  order_reference: string;
  created_at: string;
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [claims, setClaims] = useState<VoucherClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [count, setCount] = useState("10"); // Batch count to generate
  const [network, setNetwork] = useState("mtn");
  const [packageSize, setPackageSize] = useState("1GB");
  const [tagline, setTagline] = useState("🎁 Special Free Data Drop! Enter code to receive data.");
  const [minOrdersRequired, setMinOrdersRequired] = useState("0");

  // Timer State
  const [timerPreset, setTimerPreset] = useState<string>("none"); // 'none' | '30m' | '1h' | '2h' | '6h' | '24h' | 'custom'
  const [customExpiresAt, setCustomExpiresAt] = useState<string>("");

  // Last Generated Batch Session for Copying
  const [lastBatch, setLastBatch] = useState<{
    batchId: string;
    count: number;
    codes: string[];
    network: string;
    packageSize: string;
    createdAt: string;
    expiresAt?: string | null;
  } | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 3000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  // Generate 8-digit voucher code: FREE-XXXXXXXX
  const generateRandomCode = () => {
    const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
    setCode(`FREE-${digits}`);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers");
      const data = await res.json();
      if (res.ok) {
        setVouchers(data.vouchers || []);
        setClaims(data.claims || []);
      }
    } catch (err: any) {
      console.error("Failed to load vouchers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    generateRandomCode();
  }, []);

  // Determine if any voucher is currently active and not expired
  const isGiveawayOn = vouchers.some((v) => {
    if (!v.is_active || v.claimed_count >= v.max_claims) return false;
    if (v.expires_at && new Date(v.expires_at) < new Date()) return false;
    return true;
  });

  const handleMasterToggle = async () => {
    const nextState = !isGiveawayOn;
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, is_active: nextState }),
      });
      if (res.ok) {
        setVouchers((prev) => prev.map((v) => ({ ...v, is_active: nextState })));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("voucher_updated"));
          try {
            localStorage.setItem("bmgh_voucher_trigger", Date.now().toString());
          } catch {}
        }
        setMsg({
          type: "success",
          text: nextState
            ? "Free Data Giveaway turned ON! Button is live on the middle-left of the customer website."
            : "Free Data Giveaway turned OFF! Button hidden from all customer pages.",
        });
      }
    } catch (err) {
      console.error("Master toggle error:", err);
    }
  };

  const calculateExpiresAt = (): string | null => {
    if (timerPreset === "none") return null;
    if (timerPreset === "custom") {
      return customExpiresAt ? new Date(customExpiresAt).toISOString() : null;
    }

    const now = new Date();
    if (timerPreset === "30m") now.setMinutes(now.getMinutes() + 30);
    else if (timerPreset === "1h") now.setHours(now.getHours() + 1);
    else if (timerPreset === "2h") now.setHours(now.getHours() + 2);
    else if (timerPreset === "6h") now.setHours(now.getHours() + 6);
    else if (timerPreset === "24h") now.setHours(now.getHours() + 24);

    return now.toISOString();
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);

    try {
      const expiresAtIso = calculateExpiresAt();

      const countNum = Math.max(1, Math.min(100, Number(count) || 1));

      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          count: countNum,
          network,
          package_size: packageSize.trim().toUpperCase(),
          tagline: tagline.trim(),
          min_orders_required: Number(minOrdersRequired) || 0,
          expires_at: expiresAtIso,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create voucher.");
      }

      if (data.codes && data.codes.length > 0) {
        setLastBatch({
          batchId: data.batch_id || "",
          count: data.codes.length,
          codes: data.codes,
          network,
          packageSize,
          createdAt: new Date().toISOString(),
          expiresAt: expiresAtIso,
        });
      }

      setMsg({
        type: "success",
        text:
          countNum > 1
            ? `Successfully generated batch of ${countNum} single-use voucher codes (FREE-XXXXXXXX)! See the batch copy section below.`
            : `Voucher ${data.voucher?.code || code.toUpperCase()} created successfully!`,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("voucher_updated"));
        try {
          localStorage.setItem("bmgh_voucher_trigger", Date.now().toString());
        } catch {}
      }
      generateRandomCode();
      setMinOrdersRequired("0");
      setTimerPreset("none");
      setCustomExpiresAt("");
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to create voucher." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });
      if (res.ok) {
        setVouchers((prev) =>
          prev.map((v) => (v.id === id ? { ...v, is_active: !currentStatus } : v))
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("voucher_updated"));
          try {
            localStorage.setItem("bmgh_voucher_trigger", Date.now().toString());
          } catch {}
        }
      }
    } catch (err) {
      console.error("Failed to toggle voucher:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this voucher?")) return;
    try {
      const res = await fetch(`/api/admin/vouchers?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVouchers((prev) => prev.filter((v) => v.id !== id));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("voucher_updated"));
          try {
            localStorage.setItem("bmgh_voucher_trigger", Date.now().toString());
          } catch {}
        }
      }
    } catch (err) {
      console.error("Failed to delete voucher:", err);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
              <Gift className="w-4 h-4" />
              Promotion & Giveaway Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Free Data Vouchers & Countdown Timer
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Turn promo on/off, set countdown timers, and manage automated giveaway dispatches.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Master ON / OFF Control Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-lg ${
                isGiveawayOn
                  ? "bg-emerald-950 border border-emerald-500/40 text-emerald-400 shadow-emerald-500/20"
                  : "bg-rose-950 border border-rose-500/40 text-rose-400 shadow-rose-500/20"
              }`}
            >
              <Power className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black text-white">Free Data Giveaway Status</h3>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    isGiveawayOn
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {isGiveawayOn ? "● ACTIVE & LIVE (ON)" : "○ TURNED OFF (OFF)"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isGiveawayOn
                  ? "Active: The Free Data button is visible on the middle-left of customer pages with your countdown timer."
                  : "Inactive: The Free Data button is hidden from customer view. Click Turn ON to activate."}
              </p>
            </div>
          </div>

          <button
            onClick={handleMasterToggle}
            className={`w-full md:w-auto px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl hover:scale-105 active:scale-95 ${
              isGiveawayOn
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30"
            }`}
          >
            <Power className="w-4 h-4" />
            <span>Turn {isGiveawayOn ? "OFF" : "ON"} Free Data Promo</span>
          </button>
        </div>

        {/* Alerts */}
        {msg && (
          <div
            className={`p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm ${
              msg.type === "success"
                ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/60 border border-rose-500/40 text-rose-300"
            }`}
          >
            {msg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <div>
              <p className="font-bold">{msg.text}</p>
            </div>
          </div>
        )}

        {/* Dedicated Session to Copy All Generated Codes */}
        {lastBatch && (
          <div className="bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/90 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-emerald-500/20">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  Generated Voucher Batch ({lastBatch.codes.length} Codes)
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {lastBatch.codes.length} Single-Use Codes Ready to Share
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Network: <strong className="text-white uppercase">{lastBatch.network}</strong> • Bundle: <strong className="text-white">{lastBatch.packageSize}</strong> • Format: <span className="font-mono text-emerald-400 font-bold">FREE-XXXXXXXX (8 digits)</span>
                </p>
              </div>

              {/* Action Buttons to Copy */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(lastBatch.codes.join("\n"), "batch_lines")}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  {copiedLabel === "batch_lines" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLabel === "batch_lines" ? "All Codes Copied!" : "Copy All Codes (Newline)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(lastBatch.codes.join(", "), "batch_comma")}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all hover:scale-105"
                >
                  {copiedLabel === "batch_comma" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLabel === "batch_comma" ? "Copied!" : "Copy Comma-Separated"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const promoText = `🎉 FREE DATA DROP IS LIVE! 🎁\n\nNetwork: ${lastBatch.network.toUpperCase()}\nBundle: ${lastBatch.packageSize}\nClaim Site: ${typeof window !== "undefined" ? window.location.origin : "Our Website"}\n\n⚠️ Note: Each code is 1-time single use. Copy & paste is disabled on the site — you must type the 8 digits manually into the claim form!\n\nClaim Codes:\n${lastBatch.codes.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
                    copyToClipboard(promoText, "batch_promo");
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                >
                  {copiedLabel === "batch_promo" ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLabel === "batch_promo" ? "Promo Copied!" : "Copy Promo Broadcast"}</span>
                </button>
              </div>
            </div>

            {/* Codes List Preview */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>Click any individual code to copy:</span>
                <span className="text-amber-400 font-semibold">⌨️ Customers must manually type (anti-paste enforced)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                {lastBatch.codes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => copyToClipboard(c, `code_${c}`)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/50 text-emerald-400 font-mono font-bold text-xs tracking-wider transition-all group"
                  >
                    <span>{c}</span>
                    {copiedLabel === `code_${c}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-300 transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Voucher Form & Rules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Form */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-emerald-400" />
              Generate Free Data Voucher Drop
            </h2>

            <form onSubmit={handleCreateVoucher} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Code Format / Preview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {Number(count) > 1 ? "Code Format (8 Digits)" : "Voucher Code"}
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomCode}
                      className="text-[11px] text-emerald-400 hover:underline font-semibold"
                    >
                      Regenerate
                    </button>
                  </div>
                  {Number(count) > 1 ? (
                    <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-emerald-400 font-mono font-bold tracking-wider text-sm flex items-center justify-between">
                      <span>FREE-XXXXXXXX</span>
                      <span className="text-[10px] text-slate-400 font-sans uppercase font-bold px-2 py-0.5 rounded bg-slate-700/60">
                        {count} Distinct Codes
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. FREE-84920183"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold tracking-wider uppercase text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    Always format: <span className="font-mono text-emerald-400">FREE-XXXXXXXX</span> (8 digits after FREE-)
                  </p>
                </div>

                {/* Count to Generate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Count to Generate
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold">1 Claim Per Code</span>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-6 gap-1">
                      {["1", "5", "10", "20", "50", "100"].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setCount(cnt)}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            count === cnt
                              ? "bg-emerald-600 border-emerald-500 text-white shadow"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      placeholder="Enter count (e.g. 10)"
                      className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Generates {count || 0} unique single-use codes in one batch.
                  </p>
                </div>

                {/* Network */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Telco Network
                  </label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="mtn">MTN Ghana</option>
                    <option value="telecel">Telecel Ghana</option>
                    <option value="at">AT (AirtelTigo)</option>
                  </select>
                </div>

                {/* Package Size */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Package Size
                  </label>
                  <input
                    type="text"
                    required
                    value={packageSize}
                    onChange={(e) => setPackageSize(e.target.value)}
                    placeholder="e.g. 1GB, 500MB, 2GB"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tagline / Subtitle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Giveaway Headline / Tagline
                </label>
                <input
                  type="text"
                  required
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. 🎁 Special Free Data Drop! Enter code to receive data."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* ACCOUNT ORDER ELIGIBILITY SELECTOR */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    Account Order Eligibility Range
                  </div>
                  <span className="text-[11px] font-bold text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-500/40">
                    {Number(minOrdersRequired) === 0 ? "Open to All Accounts" : `Must have ≥ ${minOrdersRequired} completed orders`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Specify the minimum completed orders an account must have to claim this voucher (e.g. 3, 4, 5+ orders). Set to 0 to make it available to all accounts.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { val: "0", label: "0 (All Users)" },
                    { val: "3", label: "≥ 3 Orders" },
                    { val: "4", label: "≥ 4 Orders" },
                    { val: "5", label: "≥ 5 Orders" },
                    { val: "custom", label: "Custom" },
                  ].map((opt) => {
                    const isSelected =
                      opt.val === "custom"
                        ? !["0", "3", "4", "5"].includes(minOrdersRequired)
                        : minOrdersRequired === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          if (opt.val !== "custom") {
                            setMinOrdersRequired(opt.val);
                          } else if (["0", "3", "4", "5"].includes(minOrdersRequired)) {
                            setMinOrdersRequired("6");
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-md font-black"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {(!["0", "3", "4", "5"].includes(minOrdersRequired) || Number(minOrdersRequired) > 5) && (
                  <div className="pt-1 flex items-center gap-3">
                    <label className="text-xs text-slate-300 font-semibold">Custom Minimum Orders:</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={minOrdersRequired}
                      onChange={(e) => setMinOrdersRequired(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-xs focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. 6"
                    />
                  </div>
                )}
              </div>

              {/* TIMER / EXPIRATION CONTROLS */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Clock className="w-4 h-4" />
                  Set Promo Expiration Timer
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                  {[
                    { id: "none", label: "No Timer" },
                    { id: "30m", label: "30 Mins" },
                    { id: "1h", label: "1 Hour" },
                    { id: "2h", label: "2 Hours" },
                    { id: "6h", label: "6 Hours" },
                    { id: "24h", label: "24 Hours" },
                    { id: "custom", label: "Custom" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTimerPreset(preset.id)}
                      className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all border ${
                        timerPreset === preset.id
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {timerPreset === "custom" && (
                  <div className="pt-2">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Pick Custom Expiry Date & Time:
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={customExpiresAt}
                      onChange={(e) => setCustomExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When a timer is set, the website badge shows a live countdown clock and automatically expires once the time finishes.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Voucher...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create & Activate Giveaway</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Rules & Security Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-white mb-2">
                Automated Giveaway Rules
              </h3>
              <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>8-Digit Code Format:</strong> All voucher codes strictly use <code className="text-emerald-400 font-mono font-bold">FREE-XXXXXXXX</code> (8 digits).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>1 Claim Per Phone:</strong> Only 1 claim allowed per phone number within each giveaway drop/batch.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Single-Use Codes:</strong> Each generated code can only be redeemed once (<code className="text-slate-300 font-mono">max_claims: 1</code>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Anti-Paste Protection:</strong> Customers must manually type the code. Copy & paste and drag-drop are strictly blocked.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Live Countdown Timer:</strong> Configurable countdown clock displayed in the floating badge on the storefront.</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400">
              Total Redemptions Recorded: <span className="font-bold text-white">{claims.length}</span>
            </div>
          </div>
        </div>

        {/* Existing Vouchers List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-400" />
              Active & Past Vouchers ({vouchers.length})
            </h2>

            {vouchers.some((v) => v.is_active && v.claimed_count < v.max_claims && (!v.expires_at || new Date(v.expires_at) > new Date())) && (
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const unclaimed = vouchers
                    .filter((v) => v.is_active && v.claimed_count < v.max_claims && (!v.expires_at || new Date(v.expires_at) > now))
                    .map((v) => v.code);
                  copyToClipboard(unclaimed.join("\n"), "all_unclaimed");
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all self-start sm:self-auto hover:border-emerald-500/50"
              >
                {copiedLabel === "all_unclaimed" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {copiedLabel === "all_unclaimed"
                    ? "Unclaimed Codes Copied!"
                    : "Copy All Unclaimed Active Codes"}
                </span>
              </button>
            )}
          </div>

          {vouchers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No vouchers created yet. Use the form above to generate your first free data voucher drop.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-3">Code (Click to Copy)</th>
                    <th className="pb-3">Network & Bundle</th>
                    <th className="pb-3">Eligibility</th>
                    <th className="pb-3">Timer / Expiration</th>
                    <th className="pb-3">Progress</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vouchers.map((v) => {
                    const isExpired = v.expires_at && new Date(v.expires_at) < new Date();
                    return (
                      <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(v.code, `code_${v.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 text-emerald-400 font-mono font-bold text-xs transition-all group"
                            title="Click to copy voucher code"
                          >
                            <span>{v.code}</span>
                            {copiedLabel === `code_${v.id}` ? (
                              <Check className="w-3 h-3 text-emerald-300" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500 group-hover:text-emerald-300 transition-colors" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 font-semibold text-slate-200">
                          <span className="uppercase text-white font-bold">{v.package_size}</span>{" "}
                          <span className="text-slate-400 text-xs uppercase">({v.network})</span>
                        </td>
                        <td className="py-4">
                          {v.min_orders_required && v.min_orders_required > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-900/60 text-indigo-300 border border-indigo-500/40">
                              ≥ {v.min_orders_required} Orders
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-850 text-slate-400 border border-slate-700">
                              Open to All
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-xs font-mono">
                          {v.expires_at ? (
                            isExpired ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Expired ({new Date(v.expires_at).toLocaleTimeString()})
                              </span>
                            ) : (
                              <span className="text-amber-300 font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                {new Date(v.expires_at).toLocaleString()}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500">No Timer</span>
                          )}
                        </td>
                        <td className="py-4 text-slate-300">
                          <span className="font-bold text-white">{v.claimed_count}</span> / {v.max_claims}
                          {v.max_claims === 1 ? (
                            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              Single Use
                            </span>
                          ) : (
                            <span className="ml-1 text-slate-400 text-xs">claimed</span>
                          )}
                        </td>
                        <td className="py-4">
                          <button
                            onClick={() => handleToggle(v.id, v.is_active)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
                              v.is_active && !isExpired
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900"
                                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {v.is_active && !isExpired ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Active (ON)
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-slate-400" />
                                {isExpired ? "Expired" : "OFF"}
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete Voucher"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Claims History */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Recent Voucher Claims Log ({claims.length})
          </h2>

          {claims.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No claims redeemed yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-3">Beneficiary Phone</th>
                    <th className="pb-3">Customer Name</th>
                    <th className="pb-3">Account Orders</th>
                    <th className="pb-3">Voucher Code</th>
                    <th className="pb-3">Bundle</th>
                    <th className="pb-3">Order Ref</th>
                    <th className="pb-3">Claimed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {claims.slice(0, 50).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-mono font-bold text-white flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {c.phone}
                      </td>
                      <td className="py-3 text-slate-200 font-medium">
                        {c.customer_name || <span className="text-slate-500 italic">Guest / Unnamed</span>}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                          {c.customer_orders_count !== undefined ? `${c.customer_orders_count} orders` : "—"}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-emerald-400 font-semibold">
                        {c.voucher_code}
                      </td>
                      <td className="py-3 text-slate-300">
                        {c.package_size} ({c.network.toUpperCase()})
                      </td>
                      <td className="py-3 font-mono text-xs text-slate-400">
                        {c.order_reference}
                      </td>
                      <td className="py-3 text-slate-400 text-xs">
                        {new Date(c.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
