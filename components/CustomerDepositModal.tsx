"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlusCircle,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  wallet_balance: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerInfo | null;
  onSuccess: (newBalance: number) => void;
  paystackPublicKey?: string;
}

interface PresetOption {
  amount: number;
  label: string;
  tag?: string;
}

const PRESET_OPTIONS: PresetOption[] = [
  { amount: 5, label: "₵5", tag: "Min: ₵5" },
  { amount: 10, label: "₵10" },
  { amount: 20, label: "₵20", tag: "Popular" },
  { amount: 50, label: "₵50" },
  { amount: 100, label: "₵100" },
];

export default function CustomerDepositModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
  paystackPublicKey = "",
}: Props) {
  const [amount, setAmount] = useState<number | string>(5);
  const [customInput, setCustomInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeKey, setActiveKey] = useState(paystackPublicKey);

  // Load Paystack inline script dynamically
  useEffect(() => {
    if (!window.PaystackPop) {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch live Paystack public key if missing
  useEffect(() => {
    if (!activeKey) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d?.settings?.paystack_public_key) {
            setActiveKey(d.settings.paystack_public_key);
          }
        })
        .catch(() => {});
    }
  }, [activeKey]);

  if (!isOpen || !customer) return null;

  const currentDepositAmount = customInput ? Number(customInput) : Number(amount);

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomInput("");
    setError("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    setCustomInput(val);
    setError("");
  };

  const handleInitiateDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const finalAmount = currentDepositAmount;
    if (isNaN(finalAmount) || finalAmount < 5) {
      setError("The minimum deposit amount is GHS 5.00. Please select or enter at least GHS 5.00.");
      return;
    }

    const keyToUse =
      activeKey ||
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
      "";

    if (!keyToUse || keyToUse.includes("placeholder") || keyToUse.includes("sample")) {
      setError("Payment gateway is being configured. Please contact support or try again shortly.");
      return;
    }

    if (!window.PaystackPop) {
      setError("Payment gateway failed to load. Please check your internet connection and refresh.");
      return;
    }

    setLoading(true);

    const ref = `BMGH-DEP-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const customerEmail =
      customer.email ||
      `${customer.phone.replace(/[^0-9]/g, "")}@customer.bundlemartgh.com`;
    const amountInPesewas = Math.round(finalAmount * 100);

    try {
      const handler = window.PaystackPop.setup({
        key: keyToUse,
        email: customerEmail,
        amount: amountInPesewas,
        currency: "GHS",
        ref: ref,
        metadata: {
          customer_id: customer.id,
          type: "wallet_deposit",
          transaction_type: "Wallet Deposit",
          customer_name: customer.name,
          customer_phone: customer.phone,
          custom_fields: [
            { display_name: "Customer ID", variable_name: "customer_id", value: customer.id },
            { display_name: "Customer Name", variable_name: "customer_name", value: customer.name },
            { display_name: "Customer Phone", variable_name: "customer_phone", value: customer.phone },
            { display_name: "Transaction Type", variable_name: "transaction_type", value: "Wallet Deposit" },
          ],
        },
        // Plain synchronous function required by Paystack Inline validator ({}.toString.call(t) === "[object Function]")
        callback: function (response: any) {
          const finalPaystackRef = response?.reference || response?.trxref || ref;
          (async () => {
            try {
              const verifyRes = await fetch("/api/customer/deposit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  customer_id: customer.id,
                  paystack_ref: finalPaystackRef,
                  amount: finalAmount,
                }),
              });

              const data = await verifyRes.json();
              if (!verifyRes.ok || !data.success) {
                throw new Error(data.message || "Failed to credit wallet balance.");
              }

              // Update localStorage customer session balance immediately
              try {
                const raw = localStorage.getItem("bmgh_customer_session");
                if (raw) {
                  const parsed = JSON.parse(raw);
                  parsed.wallet_balance = data.new_balance;
                  localStorage.setItem("bmgh_customer_session", JSON.stringify(parsed));
                }
              } catch {}

              // Broadcast global event so all UI components refresh
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("wallet_updated"));
              }

              // Confetti celebration
              try {
                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                });
              } catch {}

              setSuccessMsg(`Awesome! GHS ${finalAmount.toFixed(2)} credited to your wallet.`);
              onSuccess(data.new_balance);

              setTimeout(() => {
                onClose();
                setSuccessMsg("");
              }, 1800);
            } catch (verErr: any) {
              console.error("Deposit confirmation error:", verErr);
              setError(verErr?.message || "Deposit confirmation error. Please contact support.");
            } finally {
              setLoading(false);
            }
          })();
        },
        onClose: function () {
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (err: any) {
      console.error("Paystack open error:", err);
      setError(err?.message || "Could not open Paystack window.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-amber-400 to-yellow-500" />

        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">Deposit Funds</h3>
              <p className="text-xs text-slate-400">Add money to your account wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Balance Pill */}
        <div className="px-6 pt-4">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Current Balance:</span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              GHS {Number(customer.wallet_balance || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleInitiateDeposit} className="p-6 pt-4 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Select Presets - Starting with GHS 5.00 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300">
                Quick Select Deposit Amount
              </label>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Min: ₵5.00
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {PRESET_OPTIONS.map((item) => {
                const isSelected = !customInput && Number(amount) === item.amount;
                return (
                  <button
                    key={item.amount}
                    type="button"
                    onClick={() => handleSelectPreset(item.amount)}
                    className={`py-2.5 px-1 rounded-xl text-center transition-all border cursor-pointer relative overflow-hidden flex flex-col items-center justify-center ${
                      isSelected
                        ? "bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    {item.tag && (
                      <span
                        className={`text-[8px] font-black uppercase tracking-tighter px-1 rounded-xs mb-0.5 ${
                          isSelected
                            ? "bg-slate-950 text-amber-400"
                            : "bg-amber-400/20 text-amber-300"
                        }`}
                      >
                        {item.tag}
                      </span>
                    )}
                    <span className="text-sm font-black block leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Or Enter Custom Amount (Minimum GHS 5.00)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold font-mono">
                ₵
              </span>
              <input
                type="text"
                value={customInput}
                onChange={handleCustomChange}
                placeholder="Enter amount (e.g. 5.00)"
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono font-bold"
              />
            </div>
          </div>

          {/* Payment Method Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Instant Paystack Gateway</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pay securely with MTN MoMo, Telecel Cash, AT Money, or Bank Card. Your wallet balance is updated immediately.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!successMsg}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Deposit...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current text-amber-300" />
                <span>Deposit GHS {currentDepositAmount > 0 ? currentDepositAmount.toFixed(2) : "0.00"} Now</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
