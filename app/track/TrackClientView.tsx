"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Order } from "@/lib/db";
import { Search, Loader2, ArrowRight, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Copy, Check, Zap, RefreshCw } from "lucide-react";

export default function TrackClientView({ storeName }: { storeName: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncingRef, setSyncingRef] = useState<string | null>(null);

  const handleCopyAllDetails = (o: Order) => {
    const paymentStatus = o.payment_status || (o.paystack_ref ? "paid" : "paid");
    const deliveryStatus = o.delivery_status || (o.status === "delivered" ? "delivered" : o.status === "failed" ? "failed" : "pending");
    const text = `📋 ORDER DETAILS - ${storeName}
• Order Reference: ${o.reference}
• Network: ${o.network.toUpperCase()}
• Bundle: ${o.package_size}
• Recipient Phone: ${o.phone}
• Amount: GHS ${Number(o.amount).toFixed(2)}
• Payment Status: ${paymentStatus.toUpperCase()}
• Delivery Status: ${deliveryStatus.toUpperCase()}
• Date Placed: ${new Date(o.created_at).toLocaleString()}`;

    navigator.clipboard.writeText(text);
    setCopiedId(o.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const handleRefreshLive = async (ref: string) => {
    setSyncingRef(ref);
    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(ref)}&sync=true`);
      const data = await res.json();
      if (res.ok && data.orders) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.warn("Live status sync error:", e);
    } finally {
      setSyncingRef(null);
    }
  };

  const getCustomerDeliveryBadge = (deliveryStatus: string) => {
    const s = (deliveryStatus || "").toLowerCase().trim();
    switch (s) {
      case "completed":
      case "delivered":
        return {
          label: "Delivered",
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
          className: "bg-emerald-100 text-emerald-800 border-emerald-200",
          message: "Data bundle has been successfully delivered and activated on your phone line.",
        };
      case "processing":
        return {
          label: "Processing",
          icon: <Zap className="w-3 h-3 text-amber-600 animate-pulse" />,
          className: "bg-amber-100 text-amber-800 border-amber-200",
          message: "Data bundle is actively processing on the telecom network. Expected delivery within 1-2 minutes.",
        };
      case "waiting":
        return {
          label: "Waiting in Queue",
          icon: <Clock className="w-3 h-3 text-blue-600" />,
          className: "bg-blue-100 text-blue-800 border-blue-200",
          message: "Your order is queued in line for automated network dispatch.",
        };
      case "pending":
        return {
          label: "Pending Dispatch",
          icon: <Clock className="w-3 h-3 text-sky-600" />,
          className: "bg-sky-100 text-sky-800 border-sky-200",
          message: "Order placed. Awaiting dispatch to automated telecom gateway.",
        };
      case "refunded":
        return {
          label: "Refunded",
          icon: <AlertTriangle className="w-3 h-3 text-purple-600" />,
          className: "bg-purple-100 text-purple-800 border-purple-200",
          message: "This transaction has been refunded.",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          icon: <AlertTriangle className="w-3 h-3 text-slate-600" />,
          className: "bg-slate-100 text-slate-800 border-slate-200",
          message: "This order was cancelled.",
        };
      case "failed":
        return {
          label: "Delivery Delayed",
          icon: <AlertTriangle className="w-3 h-3 text-rose-600" />,
          className: "bg-rose-100 text-rose-800 border-rose-200",
          message: "Temporary telco gateway delay encountered. Our support team is pushing your line delivery manually.",
        };
      default:
        return {
          label: s ? s.toUpperCase() : "PENDING",
          icon: <Clock className="w-3 h-3 text-slate-600" />,
          className: "bg-slate-100 text-slate-800 border-slate-200",
          message: `Current delivery status: ${s}`,
        };
    }
  };

  const executeSearch = async (searchTerm: string) => {
    const clean = searchTerm.trim();
    if (!clean) return;

    setError("");
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(clean)}&sync=true`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to search");
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err?.message || "Could not retrieve order details");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialRef = params.get("reference") || params.get("trxref") || params.get("q");
      if (initialRef) {
        setQuery(initialRef);
        executeSearch(initialRef);
      }
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Real-time Telco Dispatch Tracker</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Track Your Data Order
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your order reference (e.g. <span className="font-mono font-semibold">BMGH-87654321</span>) or recipient phone number to verify live status.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-lg max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter BMGH-XXXX or 055XXXXXXX"
              className="w-full pl-11 pr-4 py-3 text-sm font-semibold border border-slate-300 rounded-2xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Track Order
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Results Section */}
      {searched && orders && (
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Search Results ({orders.length})
          </h2>

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-900 text-base">No Orders Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                We couldn't find any transaction matching "{query}". Please verify the reference or phone number.
              </p>
            </div>
          ) : (
            orders.map((o) => {
              const paymentStatus = o.payment_status || (o.paystack_ref ? "paid" : "paid");
              const deliveryStatus = o.delivery_status || (o.status === "delivered" ? "delivered" : o.status === "failed" ? "failed" : "pending");
              
              const isPaid = paymentStatus === "paid" || paymentStatus === "completed";
              const deliveryBadge = getCustomerDeliveryBadge(deliveryStatus);
              const isDelivered = deliveryStatus === "delivered" || deliveryStatus === "completed";
              const isSyncingThis = syncingRef === o.reference;

              return (
                <div
                  key={o.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
                >
                  {/* Top Bar: Reference + Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">Order:</span>
                      <span className="font-mono font-extrabold text-sm text-slate-900">
                        {o.reference}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Payment Status Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400">Payment:</span>
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Paid
                          </span>
                        ) : paymentStatus === "failed" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Unpaid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Payment
                          </span>
                        )}
                      </div>

                      {/* Delivery Status Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400">Delivery:</span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${deliveryBadge.className}`}>
                          {deliveryBadge.icon}
                          {deliveryBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-700 font-medium">
                        <span className="uppercase font-bold text-slate-900">{o.network}</span> •{" "}
                        <span className="text-emerald-600 font-extrabold">{o.package_size}</span> • Recipient:{" "}
                        <span className="font-mono font-bold text-slate-900">{o.phone}</span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Paid: <strong className="text-slate-700">GHS {Number(o.amount).toFixed(2)}</strong> • {new Date(o.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short", hour12: true })}
                      </div>

                      {/* Reassurance/Context Message */}
                      <div className={`mt-2 p-2.5 rounded-xl text-[11px] font-medium border ${
                        isDelivered
                          ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                          : deliveryStatus === "processing" || deliveryStatus === "waiting"
                          ? "bg-amber-50/80 border-amber-200 text-amber-800"
                          : deliveryStatus === "failed"
                          ? "bg-rose-50 border-rose-200 text-rose-800"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}>
                        {deliveryBadge.message}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {/* Live DataMart Refresh Button */}
                      {!isDelivered && (
                        <button
                          type="button"
                          onClick={() => handleRefreshLive(o.reference)}
                          disabled={isSyncingThis}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                          title="Check live delivery status directly from gateway"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingThis ? "animate-spin" : ""}`} />
                          <span>{isSyncingThis ? "Checking..." : "Refresh Live"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyAllDetails(o)}
                        className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                          copiedId === o.id
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 active:scale-95"
                        }`}
                        title="Copy all order details to clipboard"
                      >
                        {copiedId === o.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-600" />
                            <span>Copy Details</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/receipt/${o.reference}`}
                        className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        View Receipt
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
