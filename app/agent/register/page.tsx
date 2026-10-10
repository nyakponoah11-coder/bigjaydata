"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
  FileText,
} from "lucide-react";

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

export default function AgentRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fee, setFee] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [paystackKey, setPaystackKey] = useState("");

  // Load Paystack inline script
  useEffect(() => {
    if (!window.PaystackPop) {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch agent store config & registration fee
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/admin/agent-store");
        const data = await res.json();
        if (data.success && data.config) {
          setIsEnabled(data.config.is_enabled);
          setFee(data.config.registration_fee || 0);
        }
        const setRes = await fetch("/api/settings");
        const setData = await setRes.json();
        if (setData.success && setData.settings) {
          setPaystackKey(setData.settings.paystack_public_key || "");
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      }
    };
    fetchConfig();
  }, []);

  // Live slug preview
  const slugPreview = storeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isEnabled) {
      setError("Agent registrations are currently closed by admin.");
      return;
    }

    setLoading(true);

    const submitRegistration = async (paystackRef?: string) => {
      try {
        const res = await fetch("/api/agent/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            store_name: storeName,
            email,
            phone,
            description,
            password,
            paystack_ref: paystackRef || null,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to create agent account");
        }

        // Store session
        if (typeof window !== "undefined") {
          localStorage.setItem("bmgh_agent_session", JSON.stringify(data.agent));
          localStorage.setItem("bmgh_agent_token", data.token);
        }

        router.push("/agent/dashboard");
      } catch (err: any) {
        setError(err.message || "Registration failed. Please try again.");
        setLoading(false);
      }
    };

    // If registration fee > 0, pop up Paystack
    if (fee > 0) {
      if (!paystackKey || !window.PaystackPop) {
        setError("Payment gateway is initializing or unavailable. Please retry shortly.");
        setLoading(false);
        return;
      }

      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: email.trim(),
        amount: Math.round(fee * 100),
        currency: "GHS",
        ref: `REG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        metadata: {
          custom_fields: [
            { display_name: "Agent Name", variable_name: "agent_name", value: name },
            { display_name: "Store Name", variable_name: "store_name", value: storeName },
          ],
        },
        callback: (response: any) => {
          submitRegistration(response.reference || response.trxref);
        },
        onClose: () => {
          setLoading(false);
        },
      });
      handler.openIframe();
    } else {
      // Free registration
      submitRegistration();
    }
  };

  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Coming Soon
            </span>
            <h2 className="text-2xl font-black text-white">Agent Registration Locked</h2>
            <p className="text-xs text-slate-400">
              The Agent Store network is currently preparing for launch. Please check back soon or view our waitlist.
            </p>
          </div>
          <Link
            href="/agent-store"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-xs uppercase tracking-wider text-slate-950 shadow-lg hover:brightness-110 transition-all cursor-pointer"
          >
            <span>Go to Agent Store Hub</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20 mx-auto flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Store className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-3xl font-black text-white tracking-tight">
          Launch Your Agent Store
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Sell MTN, Telecel & AT data bundles under your own brand and earn instant daily profits.
        </p>

        {fee > 0 && (
          <div className="mt-3 mx-auto max-w-xs text-center py-1.5 px-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            One-time Activation Fee: <span className="font-mono">GHS {fee.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Your Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame Mensah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Store Name & Live URL Preview */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Store Name
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame Data Hub"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {slugPreview && (
                <div className="mt-1.5 text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <span>Your Store Link:</span>
                  <span className="text-emerald-400 font-bold">/store/{slugPreview}</span>
                </div>
              )}
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="kwame@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Phone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="0551234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Store Description / Tagline */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Store Description / Tagline
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <textarea
                  rows={2}
                  placeholder="e.g. Instant 24/7 MTN & Telecel data delivery at the lowest prices in Ghana!"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Create Account Password / PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !isEnabled}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{fee > 0 ? `Pay GHS ${fee.toFixed(2)} & Launch Store` : "Create Agent Store (Free)"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an agent account?{" "}
            <Link href="/agent/login" className="text-emerald-400 font-bold hover:underline">
              Sign In to Agent Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
