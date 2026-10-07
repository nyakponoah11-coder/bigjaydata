"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import DeliveryTrackerCard from "@/components/DeliveryTrackerCard";
import { Order } from "@/lib/db";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Eye,
  MessageSquare,
  Loader2,
  Calendar,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // SMS Modal
  const [smsModalOrder, setSmsModalOrder] = useState<Order | null>(null);
  const [smsText, setSmsText] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (networkFilter !== "all") params.set("network", networkFilter);
      if (deliveryFilter !== "all") params.set("delivery_status", deliveryFilter);
      if (paymentFilter !== "all") params.set("payment_status", paymentFilter);
      if (dateFilter) params.set("date", dateFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error("Fetch orders error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [networkFilter, deliveryFilter, paymentFilter, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleUpdateDeliveryStatus = async (orderId: string, delivery_status: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, delivery_status }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`Delivery status updated to ${delivery_status}`);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
        setTimeout(() => setActionNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, payment_status: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, payment_status }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`Payment status updated to ${payment_status}`);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
        setTimeout(() => setActionNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResendDataMart = async (order: Order) => {
    try {
      setActionNotice(`Resending ${order.reference} to DataMart gateway...`);
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, resend_datamart: true }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`DataMart dispatch completed: ${data.message}`);
        fetchOrders();
      } else {
        setActionNotice(`DataMart error: ${data.message}`);
      }
      setTimeout(() => setActionNotice(""), 4000);
    } catch (e: any) {
      setActionNotice("Failed to resend to DataMart");
      setTimeout(() => setActionNotice(""), 3000);
    }
  };

  const handleSendCustomSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsModalOrder || !smsText.trim()) return;

    setSendingSms(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: smsModalOrder.id,
          send_sms: true,
          sms_text: smsText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`SMS sent to ${smsModalOrder.phone}`);
        setSmsModalOrder(null);
        setSmsText("");
        setTimeout(() => setActionNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Live Delivery Tracker at the very top */}
        <DeliveryTrackerCard variant="admin" />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Orders Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Filter, search, inspect telco responses, and dispatch manual status updates
            </p>
          </div>

          <button
            onClick={fetchOrders}
            className="self-start sm:self-auto py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Action Notice toast */}
        {actionNotice && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search by phone / ref */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Phone or Ref..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </form>

            {/* Network Filter */}
            <div>
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">All Networks</option>
                <option value="mtn">MTN</option>
                <option value="telecel">Telecel</option>
                <option value="at">AT (AirtelTigo)</option>
              </select>
            </div>

            {/* Delivery Status Filter */}
            <div>
              <select
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">All Delivery Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="pending">In Progress / Pending</option>
                <option value="failed">Failed / Delayed</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending Payment</option>
                <option value="failed">Payment Failed</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-slate-400 hover:text-white text-xs"
                  title="Clear Date"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Full Orders Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Orders Found: {orders.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 pl-4">Reference</th>
                  <th className="py-3.5">Network</th>
                  <th className="py-3.5">Package</th>
                  <th className="py-3.5">Recipient</th>
                  <th className="py-3.5">Amount</th>
                  <th className="py-3.5">Payment Status</th>
                  <th className="py-3.5">Delivery Status</th>
                  <th className="py-3.5">Date</th>
                  <th className="py-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No orders match the current criteria.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const paymentStatus = o.payment_status || (o.paystack_ref ? "paid" : "paid");
                    const deliveryStatus = o.delivery_status || (o.status === "delivered" ? "delivered" : o.status === "failed" ? "failed" : "pending");

                    return (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 pl-4 font-mono font-bold text-white">
                          {o.reference}
                        </td>
                        <td className="py-3 font-bold uppercase text-slate-300">
                          {o.network}
                        </td>
                        <td className="py-3 font-semibold text-emerald-400">
                          {o.package_size}
                        </td>
                        <td className="py-3 font-mono text-slate-300">
                          {o.phone}
                        </td>
                        <td className="py-3 font-bold text-white">
                          GHS {Number(o.amount).toFixed(2)}
                        </td>
                        {/* 1. SEPARATE PAYMENT STATUS BADGE */}
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] inline-flex items-center gap-1 ${
                              paymentStatus === "paid" || paymentStatus === "completed"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : paymentStatus === "failed"
                                ? "bg-red-950 text-red-400 border border-red-800"
                                : "bg-amber-950 text-amber-400 border border-amber-800"
                            }`}
                          >
                            {paymentStatus === "paid" ? "✓ Paid" : paymentStatus}
                          </span>
                        </td>
                        {/* 2. SEPARATE DELIVERY STATUS BADGE */}
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] inline-flex items-center gap-1 ${
                              deliveryStatus === "delivered"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : deliveryStatus === "pending" || deliveryStatus === "processing"
                                ? "bg-sky-950 text-sky-400 border border-sky-800"
                                : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {deliveryStatus === "delivered" ? "✓ Delivered" : deliveryStatus === "pending" || deliveryStatus === "processing" ? "⏳ In Progress" : "✕ Failed"}
                          </span>
                          {deliveryStatus === "failed" && (o.datamart_response?.message || o.datamart_response?.error) && (
                            <span
                              className="block text-[10px] text-red-400 font-medium max-w-[160px] truncate mt-0.5"
                              title={o.datamart_response?.message || o.datamart_response?.error}
                            >
                              ⚠️ {o.datamart_response?.message || o.datamart_response?.error}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(o.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 text-right pr-4 space-x-1 whitespace-nowrap">
                          {/* Quick Delivered Delivery Button */}
                          {deliveryStatus !== "delivered" && (
                            <button
                              onClick={() => handleUpdateDeliveryStatus(o.id, "delivered")}
                              className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-lg transition-colors"
                              title="Mark Delivery as Delivered"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Quick Failed Delivery Button */}
                          {deliveryStatus !== "failed" && (
                            <button
                              onClick={() => handleUpdateDeliveryStatus(o.id, "failed")}
                              className="p-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg transition-colors"
                              title="Mark Delivery as Failed"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Resend to DataMart */}
                          <button
                            onClick={() => handleResendDataMart(o)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg transition-colors"
                            title="Resend to DataMart"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Send SMS Modal Trigger */}
                          <button
                            onClick={() => {
                              setSmsModalOrder(o);
                              setSmsText(
                                `Hello, your ${o.network.toUpperCase()} ${o.package_size} bundle from BundleMartGh (${o.reference}) is now ${deliveryStatus}. Thank you!`
                              );
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded-lg transition-colors"
                            title="Send SMS"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ORDER DETAILS MODAL */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Order Details: {selectedOrder.reference}
                  </h3>
                  <span className="text-xs text-slate-400">
                    ID: {selectedOrder.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Network & Size</span>
                  <span className="font-bold text-white uppercase">
                    {selectedOrder.network} - {selectedOrder.package_size}
                  </span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Amount</span>
                  <span className="font-bold text-emerald-400">
                    GHS {Number(selectedOrder.amount).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Recipient Phone</span>
                  <span className="font-mono font-bold text-white">
                    {selectedOrder.phone}
                  </span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Paystack Reference</span>
                  <span className="font-mono text-slate-200 truncate block">
                    {selectedOrder.paystack_ref || "None / Manual"}
                  </span>
                </div>

                {/* 1. SEPARATE PAYMENT STATUS IN MODAL */}
                <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-400 font-semibold">Payment Status</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        selectedOrder.payment_status === "paid"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : selectedOrder.payment_status === "failed"
                          ? "bg-red-950 text-red-400 border border-red-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {selectedOrder.payment_status || "paid"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => handleUpdatePaymentStatus(selectedOrder.id, "paid")}
                      className="px-2 py-1 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700 text-emerald-300 rounded-md text-[10px] font-bold"
                    >
                      Set Paid
                    </button>
                    <button
                      onClick={() => handleUpdatePaymentStatus(selectedOrder.id, "pending")}
                      className="px-2 py-1 bg-amber-900/60 hover:bg-amber-800 border border-amber-700 text-amber-300 rounded-md text-[10px] font-bold"
                    >
                      Set Pending
                    </button>
                    <button
                      onClick={() => handleUpdatePaymentStatus(selectedOrder.id, "failed")}
                      className="px-2 py-1 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-300 rounded-md text-[10px] font-bold"
                    >
                      Set Failed
                    </button>
                  </div>
                </div>

                {/* 2. SEPARATE DELIVERY STATUS IN MODAL */}
                <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-400 font-semibold">Delivery Status</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        selectedOrder.delivery_status === "delivered"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : selectedOrder.delivery_status === "pending" || selectedOrder.delivery_status === "processing"
                          ? "bg-sky-950 text-sky-400 border border-sky-800"
                          : "bg-red-950 text-red-400 border border-red-800"
                      }`}
                    >
                      {selectedOrder.delivery_status || "pending"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, "delivered")}
                      className="px-2 py-1 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700 text-emerald-300 rounded-md text-[10px] font-bold"
                    >
                      Set Delivered
                    </button>
                    <button
                      onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, "processing")}
                      className="px-2 py-1 bg-sky-900/60 hover:bg-sky-800 border border-sky-700 text-sky-300 rounded-md text-[10px] font-bold"
                    >
                      Set Processing
                    </button>
                    <button
                      onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, "failed")}
                      className="px-2 py-1 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-300 rounded-md text-[10px] font-bold"
                    >
                      Set Failed
                    </button>
                  </div>
                </div>
              </div>

              {/* DataMart Response JSON Payload */}
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  DataMart API Server Response (JSON)
                </span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedOrder.datamart_response, null, 2)}
                </pre>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <a
                  href={`/receipt/${selectedOrder.reference}`}
                  target="_blank"
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Customer Receipt
                </a>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEND SMS MODAL */}
        {smsModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">
                  Send SMS to {smsModalOrder.phone}
                </h3>
                <button
                  onClick={() => setSmsModalOrder(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendCustomSMS} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Message Body
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSmsModalOrder(null)}
                    className="py-2 px-3 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingSms}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingSms ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send SMS
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
