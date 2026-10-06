"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Product, Settings } from "@/lib/db";
import { ShieldCheck, Phone, User, AlertCircle, Loader2, Lock, ArrowRight, Zap } from "lucide-react";

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

interface Props {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
}

export default function CheckoutModal({ product, isOpen, onClose, settings }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detectedTelco, setDetectedTelco] = useState<string | null>(null);

  // Load Paystack script dynamically
  useEffect(() => {
    if (!window.PaystackPop) {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Ghana telco number detection
  useEffect(() => {
    const clean = phone.replace(/[^0-9]/g, "");
    if (clean.length >= 3) {
      const prefix = clean.startsWith("233") ? "0" + clean.slice(3, 5) : clean.slice(0, 3);
      if (["024", "054", "055", "059", "025"].includes(prefix)) {
        setDetectedTelco("mtn");
      } else if (["020", "050"].includes(prefix)) {
        setDetectedTelco("telecel");
      } else if (["027", "057", "026", "056"].includes(prefix)) {
        setDetectedTelco("at");
      } else {
        setDetectedTelco(null);
      }
    } else {
      setDetectedTelco(null);
    }
  }, [phone]);

  if (!isOpen || !product) return null;

  const generateReference = () => {
    const random8 = Math.floor(10000000 + Math.random() * 90000000);
    return `BIGJ-${random8}`;
  };

  const networkMismatch =
    detectedTelco &&
    product.network.toLowerCase() !== detectedTelco &&
    ["mtn", "telecel", "at"].includes(product.network.toLowerCase());

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit Ghanaian mobile number (e.g. 0551234567)");
      return;
    }

    setLoading(true);

    const reference = generateReference();
    const customerEmail = email.trim() || `${cleanPhone}@customer.bigjdata.com`;
    const amountInPesewas = Math.round(product.price * 100);
    const publicKey = settings.paystack_public_key || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

    // Trigger Paystack inline popup
    const triggerDataMartAndFinalize = async (paystackRef: string) => {
      try {
        const createRes = await fetch("/api/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference,
            network: product.network,
            package_size: product.size,
            phone: cleanPhone,
            amount: product.price,
            paystack_ref: paystackRef,
          }),
        });

        const data = await createRes.json();
        if (!createRes.ok || !data.success) {
          throw new Error(data.message || "Failed to process order creation");
        }

        // Redirect immediately to order receipt
        router.push(`/receipt/${reference}`);
      } catch (err: any) {
        console.error("Order completion error:", err);
        setError(err.message || "Something went wrong finalizing your order. Contact support.");
        setLoading(false);
      }
    };

    // Check if Paystack script is loaded and we have a valid key
    const isMock = !publicKey || publicKey.includes("placeholder") || publicKey.includes("sample");

    if (typeof window !== "undefined" && window.PaystackPop && !isMock) {
      try {
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: customerEmail,
          amount: amountInPesewas,
          currency: "GHS",
          ref: reference,
          metadata: {
            custom_fields: [
              { display_name: "Phone Number", variable_name: "phone", value: cleanPhone },
              { display_name: "Network", variable_name: "network", value: product.network },
              { display_name: "Bundle Size", variable_name: "package_size", value: product.size },
              { display_name: "Customer Name", variable_name: "customer_name", value: name || "Customer" },
            ],
          },
          callback: function (response: any) {
            triggerDataMartAndFinalize(response.reference || reference);
          },
          onClose: function () {
            setLoading(false);
          },
        });
        handler.openIframe();
      } catch (err) {
        console.error("Paystack popup error:", err);
        // Fallback simulation for sandbox / development
        await triggerDataMartAndFinalize(`test_${reference}`);
      }
    } else {
      // Direct instant fallback (for sandbox testing or when Paystack script isn't live)
      console.log("[Checkout] Executing instant checkout flow for test environment...");
      await triggerDataMartAndFinalize(`demo_${reference}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/15 hover:bg-black/30 flex items-center justify-center text-white transition-colors"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200 mb-1">
            <Zap className="w-4 h-4 text-amber-300" />
            Instant Bundle Checkout
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {product.network.toUpperCase()} {product.size} Data Package
          </h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-300">
              GHS {product.price.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-100">
              • Direct automated network delivery
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Telco Mismatch Warning */}
          {networkMismatch && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Notice:</strong> Your phone number looks like a{" "}
                <span className="font-bold uppercase">{detectedTelco}</span> line, but you are buying{" "}
                <span className="font-bold uppercase">{product.network}</span> data. Please double-check your recipient number!
              </div>
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Recipient Phone Number (Required) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="055XXXXXXX"
                  maxLength={13}
                  className="w-full pl-10 pr-4 py-3 text-sm font-semibold border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Data will be credited to this Ghanaian mobile line immediately upon payment.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Recipient Name (Optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address (Optional for Paystack receipt)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full px-4 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Summary Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Network / Package</span>
                <span className="font-semibold text-slate-900 dark:text-white uppercase">
                  {product.network} • {product.size}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Delivery Speed</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Instant (&lt; 60 seconds)
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>Total Due</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  GHS {product.price.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Securing Payment...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-emerald-200" />
                  Pay GHS {product.price.toFixed(2)} with Paystack
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Trust badges */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-bit SSL Encrypted • Powered by Paystack & DataMart</span>
          </div>
        </div>
      </div>
    </div>
  );
}
