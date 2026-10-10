"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Lock,
  User,
  Sparkles,
} from "lucide-react";

export default function AgentLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings && typeof data.settings.agent_store_enabled === "boolean") {
          setIsEnabled(data.settings.agent_store_enabled);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid credentials");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("bmgh_agent_session", JSON.stringify(data.agent));
        localStorage.setItem("bmgh_agent_token", data.token);
      }

      router.push("/agent/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      setLoading(false);
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
            <h2 className="text-2xl font-black text-white">Agent Portal Inactive</h2>
            <p className="text-xs text-slate-400">
              The Agent Store network is currently preparing for launch. Please check back soon or visit our waitlist.
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

  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotAgentId, setForgotAgentId] = useState("");
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotMsg("");
    setForgotLoading(true);

    try {
      const res = await fetch("/api/agent/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_code", identifier: forgotIdentifier }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to find agent account");
      }
      setForgotAgentId(data.agent_id);
      setForgotMaskedEmail(data.masked_email);
      setForgotMsg(data.message);
      setForgotStep("verify");
    } catch (err: any) {
      setForgotError(err.message || "Could not request code");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotMsg("");
    setForgotLoading(true);

    try {
      const res = await fetch("/api/agent/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_and_reset",
          agent_id: forgotAgentId,
          code: forgotCode,
          new_password: forgotNewPass,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update password");
      }
      setForgotMsg("Password reset successfully! You can now log in.");
      setPassword(forgotNewPass);
      setTimeout(() => {
        setForgotModalOpen(false);
        setForgotStep("request");
        setForgotCode("");
        setForgotNewPass("");
      }, 2000);
    } catch (err: any) {
      setForgotError(err.message || "Could not reset password");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20 mx-auto flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Store className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-3xl font-black text-white tracking-tight">
          Agent Partner Login
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Sign in to manage your data store, update pricing, and withdraw profits.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Email, Phone or Store Slug
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="0551234567 or email@domain.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Password / Access PIN
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setForgotIdentifier(identifier);
                    setForgotError("");
                    setForgotMsg("");
                    setForgotStep("request");
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Access Dashboard"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don&apos;t have an agent store yet?{" "}
            <Link href="/agent/register" className="text-emerald-400 font-bold hover:underline">
              Create Agent Account
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Reset Account Password</h3>
                  <p className="text-[11px] text-slate-400">Secure verification via registered email</p>
                </div>
              </div>
              <button
                onClick={() => setForgotModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotMsg && (
              <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl">
                <span>{forgotMsg}</span>
              </div>
            )}

            {forgotStep === "request" ? (
              <form onSubmit={handleRequestResetCode} className="mt-4 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered email address, phone number, or store slug. We will immediately send a 6-digit verification code to your email.
                </p>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Email, Phone or Store Slug
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your account identifier"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndReset} className="mt-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 text-center">
                    Check inbox/spam of <strong className="text-slate-300">{forgotMaskedEmail}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    New Password / Access PIN
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="Enter new 4+ character password"
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep("request");
                      setForgotError("");
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set New Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
