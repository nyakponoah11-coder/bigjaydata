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
} from "lucide-react";

interface Voucher {
  id: string;
  code: string;
  network: string;
  package_size: string;
  tagline: string;
  max_claims: number;
  claimed_count: number;
  is_active: boolean;
  created_at: string;
}

interface VoucherClaim {
  id: string;
  voucher_id: string;
  voucher_code: string;
  phone: string;
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
  const [network, setNetwork] = useState("mtn");
  const [packageSize, setPackageSize] = useState("1GB");
  const [tagline, setTagline] = useState("🎉 Special Free Data Giveaway! Enter code to receive data.");
  const [maxClaims, setMaxClaims] = useState("10");

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "FREE-";
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(res);
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

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          network,
          package_size: packageSize.trim().toUpperCase(),
          tagline: tagline.trim(),
          max_claims: Number(maxClaims) || 10,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create voucher.");
      }

      setMsg({ type: "success", text: `Voucher ${code.toUpperCase()} created successfully and set live on the site!` });
      generateRandomCode();
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
              Promotion & Marketing
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Free Data Vouchers
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Generate promo vouchers with custom tagline bars displayed on the front-end. Beneficiaries must type their codes directly.
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

        {/* Create Voucher Form & Rules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Form */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-emerald-400" />
              Generate New Free Data Voucher
            </h2>

            <form onSubmit={handleCreateVoucher} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Voucher Code
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomCode}
                      className="text-[11px] text-emerald-400 hover:underline font-semibold"
                    >
                      Generate New
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FREE-7X89"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold tracking-wider uppercase text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
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

                {/* Max Claims */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Max Claims Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={maxClaims}
                    onChange={(e) => setMaxClaims(e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tagline Bar */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tagline Bar Text (Displayed on Site Banner)
                </label>
                <input
                  type="text"
                  required
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. 🎉 Free Data Giveaway! Enter voucher code to get 1GB instant."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This text appears on the top header announcement bar on the front-end with the &quot;Free Data&quot; claim button.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Voucher...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create & Activate Voucher</span>
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
                  <span><strong>1 Claim Per Phone:</strong> A single customer phone number cannot claim two vouchers. Duplicate claims are prevented automatically.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Anti-Paste Protection:</strong> Clipboard copy-paste is strictly disabled on the voucher input fields so users must type the code directly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Instant Dispatch:</strong> Valid redemptions automatically trigger DataMart delivery from your wallet without any Paystack checkout.</span>
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-400" />
              Active & Past Vouchers ({vouchers.length})
            </h2>
          </div>

          {vouchers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No vouchers created yet. Use the form above to generate your first free data voucher.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Network & Bundle</th>
                    <th className="pb-3">Tagline Preview</th>
                    <th className="pb-3">Progress</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4">
                        <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-mono font-bold text-xs">
                          {v.code}
                        </span>
                      </td>
                      <td className="py-4 font-semibold text-slate-200">
                        <span className="uppercase text-white font-bold">{v.package_size}</span>{" "}
                        <span className="text-slate-400 text-xs uppercase">({v.network})</span>
                      </td>
                      <td className="py-4 text-slate-300 max-w-xs truncate" title={v.tagline}>
                        {v.tagline}
                      </td>
                      <td className="py-4 text-slate-300">
                        <span className="font-bold text-white">{v.claimed_count}</span> / {v.max_claims} claimed
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleToggle(v.id, v.is_active)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
                            v.is_active
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900"
                              : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          {v.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Active (Showing)
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Inactive
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
                  ))}
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
