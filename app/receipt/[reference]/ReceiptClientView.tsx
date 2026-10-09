"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Order, Settings } from "@/lib/db";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  RefreshCw,
  ShoppingBag,
  MessageCircle,
  Copy,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface Props {
  initialOrder: Order | null;
  reference: string;
  settings: Settings;
}

export default function ReceiptClientView({ initialOrder, reference, settings }: Props) {
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trigger celebration confetti on delivered status
  useEffect(() => {
    if (order?.status === "delivered") {
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#10b981", "#f59e0b", "#3b82f6"],
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [order?.status]);

  // Polling helper if status is pending
  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(reference)}`);
      const data = await res.json();
      if (data.success && data.orders && data.orders.length > 0) {
        setOrder(data.orders[0]);
      }
    } catch (e) {
      console.error("Polling error:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyReference = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (!order) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          We could not locate an order matching reference <span className="font-mono font-semibold">{reference}</span>.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
          >
            Go to Store
          </Link>
          <Link
            href="/track"
            className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
          >
            Search Order
          </Link>
        </div>
      </div>
    );
  }

  const ds = (order.delivery_status || order.status || "").toLowerCase().trim();
  const isDelivered = ds === "delivered" || ds === "completed";
  const isFailed = ds === "failed" || ds === "cancelled" || ds === "rejected" || ds === "declined";
  const isRefunded = ds === "refunded";
  const isPending = !isDelivered && !isFailed && !isRefunded;

  return (
    <div className="space-y-6">
      {/* Receipt Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Status Header */}
        <div
          className={`p-6 sm:p-8 text-center text-white ${
            isDelivered
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700"
              : isPending
              ? "bg-gradient-to-r from-amber-500 to-amber-600"
              : "bg-gradient-to-r from-red-600 to-rose-700"
          }`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-md mb-4 shadow-inner">
            {isDelivered ? (
              <CheckCircle2 className="w-9 h-9 text-white" />
            ) : isPending ? (
              <Clock className="w-9 h-9 text-white animate-spin" />
            ) : (
              <AlertTriangle className="w-9 h-9 text-white" />
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isDelivered
              ? "Data Delivered Successfully!"
              : isPending
              ? "Processing Your Data Delivery..."
              : "Data Delivery Requires Manual Check"}
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-white/90 max-w-md mx-auto">
            {isDelivered ? (
              <span>Your line has been credited with high-speed internet data.</span>
            ) : isPending ? (
              <span>Your bundle is dispatching through automated telecom gateway.</span>
            ) : (
              <span>Automatic dispatch failed. Our admin team will push your package manually.</span>
            )}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-mono">
            <span>Ref: {order.reference}</span>
            <button
              onClick={copyReference}
              className="text-white/80 hover:text-white p-0.5"
              title="Copy reference"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dynamic Congratulations / Apology Banner */}
        <div className="p-6 bg-slate-50 border-b border-slate-200/80">
          {isDelivered ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start gap-3">
              <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5 text-emerald-800">
                  🎉 Congratulations!
                </strong>
                Your <strong>{order.network.toUpperCase()} {order.package_size}</strong> data bundle has been successfully credited to{" "}
                <strong>{order.phone}</strong>. Thank you for buying from {settings.store_name}!
              </div>
            </div>
          ) : isPending ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5 text-amber-800">
                  ⏳ Delivery In Progress
                </strong>
                Our automated dispatch is crediting your line. This typically takes 15 to 60 seconds.
                Click <em>"Refresh Status"</em> below to check for instant completion.
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5 text-rose-800">
                  🙏 Apologies for the Delay
                </strong>
                The telco gateway reported a momentary delay. Please don't worry—your payment is confirmed and our 24/7 human team has been alerted to push your data manually immediately. You can also tap WhatsApp support below.
              </div>
            </div>
          )}
        </div>

        {/* Order Details Grid */}
        <div className="p-6 sm:p-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Transaction Details
          </h3>

          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500">Store Name</span>
              <span className="font-semibold text-slate-900">{settings.store_name}</span>
            </div>
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500">Order Reference</span>
              <span className="font-mono font-bold text-slate-900">{order.reference}</span>
            </div>
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500">Network Provider</span>
              <span className="font-bold text-slate-900 uppercase">{order.network}</span>
            </div>
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500">Package Size</span>
              <span className="font-extrabold text-emerald-600">{order.package_size}</span>
            </div>
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500">Recipient Phone</span>
              <span className="font-mono font-bold text-slate-900">{order.phone}</span>
            </div>
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500">Amount Paid</span>
              <span className="font-black text-slate-900 text-base">
                GHS {Number(order.amount).toFixed(2)}
              </span>
            </div>
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500">Payment Reference</span>
              <span className="font-mono text-slate-600 truncate max-w-[200px]">
                {order.paystack_ref || "Paystack Checkout"}
              </span>
            </div>
            {/* 1. SEPARATE PAYMENT STATUS */}
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Payment Status</span>
              {order.payment_status === "paid" || !!order.paystack_ref ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Paid (Payment Successful)
                </span>
              ) : order.payment_status === "failed" ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Payment Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending Payment
                </span>
              )}
            </div>
            {/* 2. SEPARATE DELIVERY STATUS */}
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Delivery Status</span>
              <span
                className={`inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full ${
                  isDelivered
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : isPending
                    ? "bg-sky-100 text-sky-800 border border-sky-200"
                    : "bg-rose-100 text-rose-800 border border-rose-200"
                }`}
              >
                {isDelivered ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Data Delivered to Line
                  </>
                ) : isPending ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                    Delivery In Progress
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Delivery Delayed (Queued for Manual Dispatch)
                  </>
                )}
              </span>
            </div>
            <div className="py-3 flex justify-between items-center">
              <span className="text-slate-500">Date & Time</span>
              <span className="text-slate-600 font-medium">
                {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={refreshStatus}
                disabled={isRefreshing}
                className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Checking..." : "Refresh Status"}
              </button>

              <button
                onClick={handlePrint}
                className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://wa.me/${settings.whatsapp_number}?text=Hello%20${encodeURIComponent(
                  settings.store_name
                )},%20I%20need%20assistance%20with%20order%20${order.reference}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                Support on WhatsApp
              </a>

              <Link
                href="/"
                className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Buy Another Bundle
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
