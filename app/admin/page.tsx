"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import DeliveryTrackerCard from "@/components/DeliveryTrackerCard";
import DirectPurchaseModal from "@/components/DirectPurchaseModal";
import Link from "next/link";
import {
  TrendingUp,
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
  }>({
    totalOrdersToday: 0,
    totalSalesToday: 0,
    pendingOrdersCount: 0,
    failedOrdersCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDirectBuyOpen, setIsDirectBuyOpen] = useState(false);

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

            <button
              onClick={() => fetchStats(selectedDate)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 5 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
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
            <button
              onClick={() => setIsDirectBuyOpen(true)}
              className="mt-3 w-full py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Direct Buy from Balance</span>
            </button>
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
                              deliveryStatus === "delivered"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : deliveryStatus === "pending" || deliveryStatus === "processing"
                                ? "bg-sky-950 text-sky-400 border border-sky-800"
                                : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {deliveryStatus === "delivered" ? "Delivered" : deliveryStatus === "pending" || deliveryStatus === "processing" ? "In Progress" : "Failed"}
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
      </div>
    </AdminLayout>
  );
}
