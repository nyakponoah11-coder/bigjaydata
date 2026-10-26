"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Order, Settings } from "@/lib/db";
import confetti from "canvas-confetti";
import { saveDeviceSession } from "@/lib/device-session";
import { getDeliveryStatusConfig } from "@/lib/delivery-status";
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
  backUrl?: string;
}

export default function ReceiptClientView({ initialOrder, reference, settings, backUrl }: Props) {
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Netflix State Hooks
  const [fetchingCode, setFetchingCode] = useState(false);
  const [fetchedCode, setFetchedCode] = useState<string | null>(initialOrder?.netflix_code || null);
  const [codeExpiresIn, setCodeExpiresIn] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [codeError, setCodeError] = useState("");

  const handleFetchCode = async () => {
    if (!order) return;
    setFetchingCode(true);
    setCodeError("");
    try {
      const res = await fetch("/api/netflix/fetch-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: order.netflix_reference || order.reference,
          order_id: order.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Sign-in code is not ready yet. Please click 'Send sign-in code' on your Netflix screen first, then try again.");
      }
      setFetchedCode(data.code);
      setCodeExpiresIn(data.expires_in || "15 minutes");
    } catch (err: any) {
      setCodeError(err.message || "Failed to fetch sign-in code. Please try again.");
    } finally {
      setFetchingCode(false);
    }
  };

  // Trigger celebration confetti on delivered status
  useEffect(() => {
    if (order) {
      saveDeviceSession("last_tracked", { query: order.reference, orders: [order] }, 30 * 60 * 1000);
      if (order.netflix_code && !fetchedCode) {
        setFetchedCode(order.netflix_code);
      }
    }
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
  }, [order?.status, order]);

  // Automated background polling while order is in transit or processing
  useEffect(() => {
    if (!order) return;
    const currentDs = (order.delivery_status || order.status || "").toLowerCase().trim();
    const isDone = currentDs === "delivered" || currentDs === "completed" || currentDs === "refunded" || currentDs === "cancelled";
    if (isDone) return;

    // Immediately trigger a background check, then poll every 3.5 seconds
    const initialTimer = setTimeout(() => {
      refreshStatus();
    }, 1000);

    const interval = setInterval(() => {
      refreshStatus();
    }, 3500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [order?.delivery_status, order?.status, reference]);

  // Polling helper if status is pending
  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(reference)}&sync=true`);
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
            href={backUrl || "/"}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
          >
            Go to Store
          </Link>
          <Link
            href={backUrl || "/track"}
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
  const isRefunded = ds === "refunded";
  const isPaid = order.payment_status === "paid" || !!order.paystack_ref;
  // If payment succeeded, order is in transit unless explicitly cancelled or refunded
  const isFailed = (ds === "failed" || ds === "cancelled" || ds === "rejected" || ds === "declined") && !isPaid;
  const isPending = !isDelivered && !isFailed && !isRefunded;
  const statusConfig = getDeliveryStatusConfig(order.delivery_status || order.status);

  return (
    <div className="space-y-6">
      {/* Receipt Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Status Header */}
        <div
          className={`p-6 sm:p-8 text-center text-white ${
            (order.service_type === "netflix" || order.network.toLowerCase() === "netflix")
              ? "bg-gradient-to-r from-red-600 via-rose-700 to-red-800"
              : isDelivered
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700"
              : isPending || isFailed
              ? "bg-gradient-to-r from-amber-500 to-amber-600"
              : "bg-gradient-to-r from-red-600 to-rose-700"
          }`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-md mb-4 shadow-inner">
            {(order.service_type === "netflix" || order.network.toLowerCase() === "netflix") ? (
              <span className="text-2xl font-black">N</span>
            ) : isDelivered ? (
              <CheckCircle2 className="w-9 h-9 text-white" />
            ) : isPending || isFailed ? (
              <Clock className="w-9 h-9 text-white animate-spin" />
            ) : (
              <AlertTriangle className="w-9 h-9 text-white" />
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {(order.service_type === "netflix" || order.network.toLowerCase() === "netflix")
              ? "Netflix 30-Day UHD Access Ready!"
              : isDelivered
              ? "Data Delivered Successfully!"
              : isPending
              ? "Processing Your Data Delivery..."
              : isFailed
              ? "Your Data Is Being Processed"
              : "Order Refunded"}
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-white/90 max-w-md mx-auto">
            {(order.service_type === "netflix" || order.network.toLowerCase() === "netflix") ? (
              <span>Your Netflix profile is active. Follow the steps below to sign in with your code.</span>
            ) : isDelivered ? (
              <span>Your line has been credited with high-speed internet data.</span>
            ) : isPending ? (
              <span>Your bundle is dispatching through automated telecom gateway.</span>
            ) : isFailed ? (
              <span>Payment confirmed. Your bundle is queued and will be credited shortly.</span>
            ) : (
              <span>This order has been refunded.</span>
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
          {(order.service_type === "netflix" || order.network.toLowerCase() === "netflix") ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-950 text-white border border-red-700/60 shadow-lg flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-red-600 text-white font-black flex items-center justify-center shrink-0 text-base">
                  N
                </span>
                <div>
                  <strong className="block font-bold text-sm text-red-200 mb-0.5">
                    🎉 Your Netflix 30-Day UHD Access is Ready!
                  </strong>
                  Follow the instructions below to sign in to Netflix using your assigned email and fetch your one-time sign-in code.
                </div>
              </div>

              {/* Account Credentials Box */}
              <div className="p-5 rounded-2xl bg-white border-2 border-red-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Netflix Account Email
                    </span>
                    <div className="text-base sm:text-lg font-mono font-black text-slate-900 mt-0.5 select-all">
                      {order.netflix_email || "stillmoving11@gmail.com"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(order.netflix_email || "stillmoving11@gmail.com");
                      setEmailCopied(true);
                      setTimeout(() => setEmailCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    {emailCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{emailCopied ? "Email Copied!" : "Copy Email"}</span>
                  </button>
                </div>

                {/* Fetch Sign-In Code Interactive Area */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Sign-In Code (One-Time Passcode)
                    </span>
                    {codeExpiresIn && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full">
                        Expires in {codeExpiresIn}
                      </span>
                    )}
                  </div>

                  {fetchedCode ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 p-4 rounded-xl border border-red-500/40">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">Your 4-Digit Code:</span>
                        <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-400">
                          {fetchedCode}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(fetchedCode);
                            setCodeCopied(true);
                            setTimeout(() => setCodeCopied(false), 2000);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{codeCopied ? "Copied" : "Copy Code"}</span>
                        </button>
                        <button
                          onClick={handleFetchCode}
                          disabled={fetchingCode}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${fetchingCode ? "animate-spin" : ""}`} />
                          <span>Fetch Again</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-slate-300 max-w-sm">
                        Enter the email into Netflix, choose <strong>"Send sign-in code"</strong>, then tap the button to reveal your code.
                      </p>
                      <button
                        onClick={handleFetchCode}
                        disabled={fetchingCode}
                        className="py-3 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {fetchingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-300" />}
                        <span>{fetchingCode ? "Fetching Code..." : "Get Sign-In Code"}</span>
                      </button>
                    </div>
                  )}

                  {codeError && (
                    <p className="text-xs text-rose-400 font-medium bg-rose-950/80 p-2.5 rounded-lg border border-rose-800/60">
                      ⚠️ {codeError}
                    </p>
                  )}
                </div>

                {/* 4-Step Instructions */}
                <div className="pt-1 text-xs text-slate-600 space-y-1.5">
                  <span className="font-bold text-slate-900 block mb-1">How to sign in on your TV or Phone:</span>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">1</span>
                    <span>Open Netflix app or visit netflix.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">2</span>
                    <span>Enter email: <strong className="font-mono text-slate-900">{order.netflix_email || "stillmoving11@gmail.com"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">3</span>
                    <span>Select <strong>"Send sign-in code"</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">4</span>
                    <span>Click <strong>"Get Sign-In Code"</strong> above and enter the 4-digit code to start streaming!</span>
                  </div>
                </div>
              </div>
            </div>
          ) : isDelivered ? (
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
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-spin" />
              <div>
                <strong className="block font-bold mb-0.5 text-amber-800">
                  ⏳ Delivery In Progress
                </strong>
                Our automated telecom fast lane is crediting your line. This status updates automatically in real time without needing to refresh.
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5 text-rose-800">
                  {isFailed ? "⏳ Almost There" : "Refund Processed"}
                </strong>
                {isFailed
                  ? "The telco gateway reported a momentary delay. Please don't worry—your payment is confirmed and our 24/7 team has been alerted to dispatch your data shortly. You can also tap WhatsApp support below."
                  : "Your payment for this order has been refunded."}
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
                className={`inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full ${statusConfig.badgeClass}`}
              >
                {statusConfig.iconType === "delivered" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : statusConfig.iconType === "processing" ? (
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                )}
                {statusConfig.label}
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
                href={backUrl || "/"}
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
