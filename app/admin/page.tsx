"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import DeliveryTrackerCard from "@/components/DeliveryTrackerCard";
import DirectPurchaseModal from "@/components/DirectPurchaseModal";
import Link from "next/link";
import {
  TrendingUp,
  Database,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Calendar,
  ArrowRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  Package,
  Bot,
  Wallet,
  Zap,
  Users,
  Tv,
  PlusCircle,
  X,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stats, setStats] = useState<{
    totalOrdersToday: number;
    totalSalesToday: number;
    pendingOrdersCount: number;
    failedOrdersCount: number;
    datamartBalance?: {
      success: boolean;
      balance: number | null;
      currency: string;
      user?: { name: string; email: string; phoneNumber: string };
      message?: string;
    };
    netflixBalance?: {
      balance: number;
      wholesaleCost: number;
      availableAccounts: number;
      currency: string;
      isEnabled: boolean;
    };
  }>({
    totalOrdersToday: 0,
    totalSalesToday: 0,
    pendingOrdersCount: 0,
    failedOrdersCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDirectBuyOpen, setIsDirectBuyOpen] = useState(false);

  // Netflix Balance modal state
  const [isNetflixBalanceModalOpen, setIsNetflixBalanceModalOpen] = useState(false);
  const [balanceModalMode, setBalanceModalMode] = useState<"topup" | "set">("topup");
  const [balanceAmount, setBalanceAmount] = useState("150");
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [balanceMsg, setBalanceMsg] = useState<{ success: boolean; text: string } | null>(null);

  const handleUpdateNetflixBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setBalanceSaving(true);
    setBalanceMsg(null);
    try {
      const endpoint = "/api/admin/netflix";
      const body =
        balanceModalMode === "topup"
          ? { action: "top_up_balance", amount: Number(balanceAmount) }
          : { action: "update_balance", balance: Number(balanceAmount) };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setBalanceMsg({ success: true, text: data.message || "Balance updated successfully!" });
        await fetchStats(selectedDate);
        setTimeout(() => {
          setIsNetflixBalanceModalOpen(false);
          setBalanceMsg(null);
        }, 1200);
      } else {
        setBalanceMsg({ success: false, text: data.message || "Failed to update balance." });
      }
    } catch (err: any) {
      setBalanceMsg({ success: false, text: err?.message || "Error updating balance." });
    } finally {
      setBalanceSaving(false);
    }
  };

  const fetchStats = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentOrders(data.recentOrders || []);
      }
    } catch (e) {
      console.error("Failed to load dashboard metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedDate);
  }, [selectedDate]);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Live Delivery Tracker at the very top */}
        <DeliveryTrackerCard variant="admin" />

        {/* Top Header & Calendar Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Merchant Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live automated data dispatch analytics & metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Calendar Date Picker */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => setIsDirectBuyOpen(true)}
              className="py-2 px-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950" />
              <span>Direct Buy</span>
            </button>

            <Link
              href="/admin/customers"
              className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-bold border border-slate-700 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              title="Customer Phone Directory & Copy All Numbers"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customers</span>
            </Link>

            <button
              onClick={() => fetchStats(selectedDate)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Metric & Partner Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
          {/* DataMart Reseller Wallet Balance */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-lg relative overflow-hidden group hover:border-emerald-500/60 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                DataMart Balance
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {stats.datamartBalance?.balance !== null && stats.datamartBalance?.balance !== undefined
                ? `GHS ${stats.datamartBalance.balance.toFixed(2)}`
                : loading
                ? "..."
                : "Active"}
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
              <span className="truncate">
                {stats.datamartBalance?.user?.name ? stats.datamartBalance.user.name.trim() : "Reseller Wallet"}
              </span>
              <Link
                href="/admin/settings"
                className="text-emerald-400 hover:text-emerald-300 font-semibold text-[10px] uppercase hover:underline ml-1 shrink-0"
              >
                Top up →
              </Link>
            </div>
          </div>

          {/* Netflix Reseller Balance */}
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 shadow-lg relative overflow-hidden group hover:border-red-500/60 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Netflix Balance
              </span>
              <div className="w-10 h-10 rounded-2xl bg-red-950/80 text-red-400 flex items-center justify-center border border-red-500/30">
                <Tv className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {stats.netflixBalance?.balance !== null && stats.netflixBalance?.balance !== undefined
                ? `GHS ${stats.netflixBalance.balance.toFixed(2)}`
                : loading
                ? "..."
                : "GHS 150.00"}
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
              <span className="truncate">
                ~{stats.netflixBalance?.availableAccounts ?? Math.floor((stats.netflixBalance?.balance ?? 150) / 15)} accounts (@ GH₵ 15)
              </span>
              <button
                type="button"
                onClick={() => {
                  setBalanceAmount("150");
                  setBalanceModalMode("topup");
                  setIsNetflixBalanceModalOpen(true);
                }}
                className="text-red-400 hover:text-red-300 font-semibold text-[10px] uppercase hover:underline ml-1 shrink-0"
              >
                Top up →
              </button>
            </div>
          </div>

          {/* Total Orders Today */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Orders on Date
              </span>
              <div className="w-10 h-10 rounded-2xl bg-blue-950/60 text-blue-400 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">
              {stats.totalOrdersToday}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              For {selectedDate}
            </p>
          </div>

          {/* Total Sales Today */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sales on Date
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-400">
              GHS {stats.totalSalesToday.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Total transaction volume
            </p>
          </div>

          {/* Pending Orders */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pending Orders
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-950/60 text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-400">
              {stats.pendingOrdersCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Awaiting telco confirmation
            </p>
          </div>

          {/* Failed Orders */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Failed Orders
              </span>
              <div className="w-10 h-10 rounded-2xl bg-red-950/60 text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-red-400">
              {stats.failedOrdersCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Requires manual review or resend
            </p>
          </div>
        </div>

        {/* AI Agent Quick Bar */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/40 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">AI Agent Command Center</h3>
              <p className="text-xs text-slate-400">
                Execute actions with natural language: "mark order BMGH-XXXX as delivered"
              </p>
            </div>
          </div>
          <Link
            href="/admin/ai-agent"
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shrink-0"
          >
            Launch AI Terminal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Customer Registered Accounts & Wallets Bar */}
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-900/40 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Customer Registered Accounts & Wallets</h3>
              <p className="text-xs text-slate-400">
                Manage registered user accounts, deposit transactions, and customer wallet balances.
              </p>
            </div>
          </div>
          <Link
            href="/admin/registered-accounts"
            className="py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all hover:scale-105 shrink-0"
          >
            Manage Accounts
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

                {/* BigJDB Standalone Database Engine Bar */}
        <div className="bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border border-teal-900/40 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">BigJDB Standalone Database Studio</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  Egress Shield Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                0.01ms microsecond embedded engine. Browse collections, edit records, 1-click sync Supabase, and export snapshots.
              </p>
            </div>
          </div>
          <Link
            href="/admin/database"
            className="py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all hover:scale-105 shrink-0 shadow-lg shadow-teal-600/20"
          >
            Launch Studio
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Recent 5 Orders Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Recent 5 Orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View All Orders
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Reference</th>
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Package</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3">Delivery</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500">
                      No orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => {
                    const paymentStatus = o.payment_status || (o.paystack_ref ? "paid" : "paid");
                    const deliveryStatus = o.delivery_status || (o.status === "delivered" ? "delivered" : o.status === "failed" ? "failed" : "pending");

                    return (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 pl-2 font-mono font-bold text-white">
                          {o.reference}
                        </td>
                        <td className="py-3.5 font-bold uppercase text-slate-300">
                          {o.network}
                        </td>
                        <td className="py-3.5 font-semibold text-emerald-400">
                          {o.package_size}
                        </td>
                        <td className="py-3.5 font-mono text-slate-300">
                          {o.phone}
                        </td>
                        <td className="py-3.5 font-bold text-white">
                          GHS {Number(o.amount).toFixed(2)}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                              paymentStatus === "paid" || paymentStatus === "completed"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : paymentStatus === "failed"
                                ? "bg-red-950 text-red-400 border border-red-800"
                                : "bg-amber-950 text-amber-400 border border-amber-800"
                            }`}
                          >
                            {paymentStatus === "paid" ? "Paid" : paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                              deliveryStatus === "delivered" || deliveryStatus === "completed"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : deliveryStatus === "processing" || deliveryStatus === "in_progress"
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : deliveryStatus === "pending" || deliveryStatus === "waiting" || deliveryStatus === "queued"
                                ? "bg-sky-950 text-sky-400 border border-sky-800"
                                : deliveryStatus === "refunded"
                                ? "bg-purple-950 text-purple-400 border border-purple-800"
                                : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {deliveryStatus === "delivered" || deliveryStatus === "completed"
                              ? "Delivered"
                              : deliveryStatus === "processing" || deliveryStatus === "in_progress"
                              ? "Processing"
                              : deliveryStatus === "pending" || deliveryStatus === "waiting" || deliveryStatus === "queued"
                              ? "Queued"
                              : deliveryStatus === "refunded"
                              ? "Refunded"
                              : "Failed"}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-400">
                          {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <Link
                            href={`/receipt/${o.reference}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Receipt
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Direct DataMart Purchase Modal */}
        <DirectPurchaseModal
          isOpen={isDirectBuyOpen}
          onClose={() => setIsDirectBuyOpen(false)}
          currentBalance={stats.datamartBalance?.balance}
          onSuccess={() => fetchStats(selectedDate)}
        />

        {/* Netflix Reseller Balance Top-Up / Update Modal */}
        {isNetflixBalanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
              <button
                type="button"
                onClick={() => {
                  setIsNetflixBalanceModalOpen(false);
                  setBalanceMsg(null);
                }}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-wider">
                  <Tv className="w-3.5 h-3.5" />
                  Data1 Netflix Partner Wallet
                </div>
                <h3 className="text-xl font-black text-white">Netflix Reseller Balance</h3>
                <p className="text-xs text-slate-400">
                  Update your active balance to track remaining wholesale accounts. Wholesale cost: GH₵ 15 / 30 days.
                </p>
              </div>

              {/* Current Balance Display */}
              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</div>
                  <div className="text-2xl font-black text-red-400 font-mono mt-0.5">
                    GHS {stats.netflixBalance?.balance !== undefined ? stats.netflixBalance.balance.toFixed(2) : "150.00"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Available</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    ~{stats.netflixBalance?.availableAccounts ?? Math.floor((stats.netflixBalance?.balance ?? 150) / 15)} accounts
                  </div>
                </div>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBalanceModalMode("topup")}
                  className={`py-2 rounded-xl transition-all ${
                    balanceModalMode === "topup"
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  + Add Top-Up Deposit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBalanceModalMode("set");
                    setBalanceAmount(String(stats.netflixBalance?.balance ?? 150));
                  }}
                  className={`py-2 rounded-xl transition-all ${
                    balanceModalMode === "set"
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Set Exact Balance
                </button>
              </div>

              <form onSubmit={handleUpdateNetflixBalance} className="space-y-4">
                {/* Presets (when topping up) */}
                {balanceModalMode === "topup" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Quick Top-Up Presets</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "+GH₵ 75 (5 acc)", val: "75" },
                        { label: "+GH₵ 150 (10 acc)", val: "150" },
                        { label: "+GH₵ 300 (20 acc)", val: "300" },
                        { label: "+GH₵ 750 (50 acc)", val: "750" },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setBalanceAmount(preset.val)}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            balanceAmount === preset.val
                              ? "bg-red-500/20 border-red-500 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {balanceModalMode === "topup" ? "Top-Up Deposit Amount (GHS)" : "New Balance (GHS)"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                      GH₵
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono font-bold focus:outline-none focus:border-red-500"
                      placeholder="e.g. 150.00"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {balanceModalMode === "topup"
                      ? `Adding GH₵ ${Number(balanceAmount || 0)} gives ~${Math.floor(Number(balanceAmount || 0) / 15)} additional 30-day Netflix accounts.`
                      : `GH₵ ${Number(balanceAmount || 0)} covers ~${Math.floor(Number(balanceAmount || 0) / 15)} 30-day Netflix accounts.`}
                  </p>
                </div>

                {/* Feedback message */}
                {balanceMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      balanceMsg.success
                        ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-200"
                        : "bg-red-950/60 border border-red-500/40 text-red-200"
                    }`}
                  >
                    <span>{balanceMsg.text}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={balanceSaving || !balanceAmount || Number(balanceAmount) < 0}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-sm shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {balanceSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving Balance...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {balanceModalMode === "topup" ? "Confirm Top-Up" : "Save Balance"}
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <Link
                  href="/admin/netflix"
                  onClick={() => setIsNetflixBalanceModalOpen(false)}
                  className="text-red-400 hover:text-red-300 font-bold hover:underline inline-flex items-center gap-1"
                >
                  Open Full Netflix Hub →
                </Link>
                <button
                  type="button"
                  onClick={() => setIsNetflixBalanceModalOpen(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
