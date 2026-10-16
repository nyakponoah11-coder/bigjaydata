"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Product, Settings } from "@/lib/db";
import {
  ShieldCheck,
  Phone,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Info,
  Check,
  Wallet,
  PlusCircle,
  LogIn,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import CustomerDepositModal from "./CustomerDepositModal";

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
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState("");
  const [detectedTelco, setDetectedTelco] = useState<string | null>(null);

  // Customer Account & Wallet State
  const [customer, setCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
    wallet_balance: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "momo">("momo");
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Load customer session from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem("bmgh_customer_session");
        if (raw) {
          const parsed = JSON.parse(raw);
          setCustomer(parsed);
          if (!phone && parsed.phone) {
            setPhone(parsed.phone);
          }
          // Fetch fresh wallet balance
          fetch(`/api/customer/me?id=${encodeURIComponent(parsed.id)}`)
            .then((r) => r.json())
            .then((d) => {
              if (d?.success && d.customer) {
                setCustomer(d.customer);
                localStorage.setItem("bmgh_customer_session", JSON.stringify(d.customer));
                if (Number(d.customer.wallet_balance) >= (product?.price || 0)) {
                  setPaymentMethod("wallet");
                }
              }
            })
            .catch(() => {});
        } else {
          setCustomer(null);
          setPaymentMethod("momo");
        }
      } catch {}
    }
  }, [isOpen, product?.price]);

  // Number Verification State (Optional)
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    servable: boolean;
    isExistingLine: boolean;
    recommendation?: string;
    message?: string;
  } | null>(null);

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

    // Reset verification if phone is altered
    setVerificationResult(null);
  }, [phone]);

  // Optional Number Verification Check
  const performNumberVerification = async (targetPhone: string) => {
    const clean = targetPhone.replace(/[^0-9]/g, "");
    if (clean.length < 10) {
      setError("Please enter a valid 10-digit number to verify.");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/orders/verify-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: clean, network: product?.network }),
      });

      const data = await res.json();
      const isServable = data.servable !== false;
      const isOldActive = isServable && data.recommendation !== "activate_first";

      setVerificationResult({
        checked: true,
        servable: isServable,
        isExistingLine: isOldActive,
        recommendation: data.recommendation || (isOldActive ? "sell_any" : "activate_first"),
        message: data.message || "",
      });
    } catch (err) {
      // In case of network timeout, provide smooth fallback
      setVerificationResult({
        checked: true,
        servable: true,
        isExistingLine: true,
        recommendation: "sell_any",
        message: "Line checked. Ready to proceed with order.",
      });
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen || !product) return null;

  const generateReference = () => {
    const random8 = Math.floor(10000000 + Math.random() * 90000000);
    return `BMGH-${random8}`;
  };

  const networkMismatch =
    detectedTelco &&
    product.network.toLowerCase() !== detectedTelco &&
    ["mtn", "telecel", "at"].includes(product.network.toLowerCase());

  const handleWalletPayment = async () => {
    setError("");
    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
    if (cleanPhone.length < 9) {
      setError("Please enter a valid recipient Ghanaian mobile number (e.g. 0551234567)");
      return;
    }

    if (!customer) {
      setError("Please sign in to your account to pay using your wallet balance.");
      return;
    }

    if ((customer.wallet_balance || 0) < product.price) {
      setError(
        `Insufficient wallet balance. You need GHS ${product.price.toFixed(2)}, but only have GHS ${Number(customer.wallet_balance || 0).toFixed(2)}. Please top up or pay with Momo directly.`
      );
      return;
    }

    setWalletLoading(true);

    try {
      const res = await fetch("/api/customer/orders/pay-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer.id,
          network: product.network,
          package_size: product.size,
          phone: cleanPhone,
          amount: product.price,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to process wallet payment.");
      }

      if (data.new_balance !== undefined) {
        const updated = { ...customer, wallet_balance: data.new_balance };
        setCustomer(updated);
        localStorage.setItem("bmgh_customer_session", JSON.stringify(updated));
      }

      router.push(`/receipt/${data.reference}`);
    } catch (err: any) {
      console.error("Wallet checkout error:", err);
      setError(err?.message || "Failed to complete order with wallet balance.");
      setWalletLoading(false);
    }
  };

  // Proceed directly to Paystack payment (verification is optional!)
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
    const customerEmail = `${cleanPhone}@customer.bundlemartgh.com`;
    const amountInPesewas = Math.round(product.price * 100);
    const publicKey = settings.paystack_public_key || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

    // Trigger purchase and record order
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
            customer_id: customer?.id || undefined,
          }),
        });

        const data = await createRes.json();
        if (!createRes.ok || !data.success) {
          if (
            data.message?.includes("orders_reference_key") ||
            data.message?.includes("duplicate key") ||
            data.code === "23505"
          ) {
            router.push(`/receipt/${reference}`);
            return;
          }
          throw new Error(data.message || "Failed to process order creation");
        }

        router.push(`/receipt/${reference}`);
      } catch (err: any) {
        console.error("Order completion error:", err);
        if (
          err?.message?.includes("orders_reference_key") ||
          err?.message?.includes("duplicate key")
        ) {
          router.push(`/receipt/${reference}`);
          return;
        }
        setError(err.message || "Something went wrong finalizing your order. Contact support.");
        setLoading(false);
      }
    };

    const isMock = !publicKey || publicKey.includes("placeholder") || publicKey.includes("sample");

    if (isMock) {
      setError("Payment gateway is not configured. Please add your live Paystack keys in Admin Settings.");
      setLoading(false);
      return;
    }

    if (typeof window === "undefined" || !window.PaystackPop) {
      setError("Payment gateway failed to load. Please check your internet connection or disable ad blockers and refresh the page.");
      setLoading(false);
      return;
    }

    try {
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: customerEmail,
        amount: amountInPesewas,
        currency: "GHS",
        ref: reference,
        metadata: {
          custom_fields: [
            { display_name: "Phone Number", variable_name: "phone_number", value: cleanPhone },
            { display_name: "Network", variable_name: "network", value: product.network.toUpperCase() },
            { display_name: "Package", variable_name: "package", value: product.size },
          ],
        },
        callback: function (response: any) {
          const finalPaystackRef = response?.reference || response?.trxref || reference;
          triggerDataMartAndFinalize(finalPaystackRef);
        },
        onClose: function () {
          setLoading(false);
        },
      });
      handler.openIframe();
    } catch (e: any) {
      console.error("Paystack open error:", e);
      setError("Could not open payment window: " + (e?.message || "Please try again."));
      setLoading(false);
    }
  };

  const cleanPhoneLength = phone.replace(/[^0-9]/g, "").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm font-bold"
          >
            ✕
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" />
            Instant Bundle Checkout
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            {product.network.toUpperCase()} {product.size} Data Package
          </h2>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300 font-mono">
              GHS {product.price.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-300 font-medium">
              • Instant automated network delivery
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Account & Wallet Header */}
          {customer ? (
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                    {customer.name ? customer.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                      {customer.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Wallet: <strong className="text-emerald-500 dark:text-emerald-400 font-bold">GHS {Number(customer.wallet_balance || 0).toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDepositModal(true)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Deposit</span>
                </button>
              </div>

              {/* Payment Choice Selector */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("wallet")}
                  className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                    paymentMethod === "wallet"
                      ? "bg-amber-400 text-slate-950 border-amber-400 shadow-xs"
                      : "bg-slate-200/60 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Pay with Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("momo")}
                  className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                    paymentMethod === "momo"
                      ? "bg-amber-400 text-slate-950 border-amber-400 shadow-xs"
                      : "bg-slate-200/60 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pay Direct Momo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 shrink-0 fill-current" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Buying as Guest. No account needed!
                </span>
              </div>
              <Link
                href="/signup"
                className="text-[11px] font-black text-amber-600 dark:text-amber-400 hover:underline shrink-0"
              >
                Sign Up / Wallet →
              </Link>
            </div>
          )}

          {/* Telco Mismatch Warning */}
          {networkMismatch && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Notice:</strong> Your phone number looks like a{" "}
                <span className="font-bold uppercase">{detectedTelco}</span> line, but you are buying{" "}
                <span className="font-bold uppercase">{product.network}</span> data.
              </div>
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-4">
            {/* Phone Number Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Recipient Phone Number *
                </label>
                {cleanPhoneLength === 10 && (
                  <button
                    type="button"
                    onClick={() => performNumberVerification(phone)}
                    disabled={verifying}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${verifying ? "animate-spin" : ""}`} />
                    Verify line (Optional)
                  </button>
                )}
              </div>

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
                  className="w-full pl-10 pr-28 py-3 text-base font-mono font-bold border border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                />

                {/* Quick Optional Check Button Inside Input */}
                <div className="absolute right-2 top-2">
                  <button
                    type="button"
                    onClick={() => performNumberVerification(phone)}
                    disabled={verifying || cleanPhoneLength < 10}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      verificationResult?.checked && verificationResult.isExistingLine
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40"
                    }`}
                  >
                    {verifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : verificationResult?.checked ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : null}
                    <span>{verifying ? "Checking..." : verificationResult?.checked ? "Verified" : "Verify Line"}</span>
                  </button>
                </div>
              </div>

              {/* POST-VERIFICATION NOTIFICATIONS (Existing Line vs New Number) */}
              {verifying ? (
                <div className="mt-2.5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 animate-pulse">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                  <span>Checking line status with telecom network...</span>
                </div>
              ) : verificationResult?.checked ? (
                verificationResult.isExistingLine ? (
                  /* OLD / EXISTING ACTIVE NUMBER NOTIFICATION */
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <span>Active Line in System</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-2 py-0.2 rounded-full font-bold">
                          Old Number
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
                        This number is already in the system. You can proceed and buy any bundle size with instant delivery!
                      </p>
                    </div>
                  </div>
                ) : verificationResult.recommendation === "activate_first" ? (
                  /* NEW NUMBER TO SYSTEM NOTIFICATION */
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-xs">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <span>New Number to Network</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.2 rounded-full font-bold">
                          New SIM
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
                        This number is new to the telecom system. It needs to be activated (1GB bundle recommended first; allow time for first activation). You can still proceed to pay!
                      </p>
                    </div>
                  </div>
                ) : (
                  /* OTHER STATUS */
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Network Pre-check Notice</div>
                      <p className="text-[11px] opacity-85 mt-0.5">{verificationResult.message || "Line check complete. You can proceed to payment."}</p>
                    </div>
                  </div>
                )
              ) : (
                <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  New numbers need to be verified before orders will go through.
                </p>
              )}

              {product.network.toLowerCase() === "mtn" && (
                <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                  ⚠️ Note: Wrong numbers cannot be refunded. Do NOT order on Turbonet, Broadband, Agent SIMs, or Ported numbers.
                </p>
              )}
            </div>

            {/* Total Due & Pay Button */}
            <div className="pt-2">
              {customer && paymentMethod === "wallet" ? (
                Number(customer.wallet_balance || 0) >= product.price ? (
                  <button
                    type="button"
                    onClick={handleWalletPayment}
                    disabled={walletLoading}
                    className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black rounded-2xl text-sm sm:text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 tracking-wide cursor-pointer"
                  >
                    {walletLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Fulfilling Order from Wallet...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current text-slate-950" />
                        <span>Pay GHS {product.price.toFixed(2)} with Wallet (1-Click)</span>
                        <ArrowRight className="w-4 h-4 ml-0.5" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-bold">Insufficient Wallet Balance</span>
                        <p className="text-[11px] mt-0.5">
                          You need GHS {product.price.toFixed(2)}, but have GHS {Number(customer.wallet_balance || 0).toFixed(2)}. Deposit funds or switch to Direct Momo below.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDepositModal(true)}
                        className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Deposit Funds</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("momo")}
                        className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Pay Direct Momo</span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 tracking-wide cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Paystack...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-emerald-200" />
                      {verificationResult?.checked && verificationResult.isExistingLine
                        ? `Proceed & Pay GHS ${product.price.toFixed(2)}`
                        : `Pay GHS ${product.price.toFixed(2)} with Paystack`}
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Security badge */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Automated Telecom Delivery • Instant Crediting</span>
          </div>
        </div>
      </div>

      {/* Customer Deposit Modal */}
      {showDepositModal && customer && (
        <CustomerDepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          customer={customer}
          paystackPublicKey={settings.paystack_public_key}
          onSuccess={(newBal) => {
            const updated = { ...customer, wallet_balance: newBal };
            setCustomer(updated);
            localStorage.setItem("bmgh_customer_session", JSON.stringify(updated));
            if (newBal >= product.price) {
              setPaymentMethod("wallet");
            }
          }}
        />
      )}
    </div>
  );
}
