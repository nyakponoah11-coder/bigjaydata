"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  KeyRound,
  RotateCcw,
  Check,
  ArrowLeft,
  X,
} from "lucide-react";

// Official Google Multi-Color SVG
const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export default function CustomerLoginPage() {
  const router = useRouter();

  // Mode: "password" | "verify"
  const [mode, setMode] = useState<"password" | "verify">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Verification Code State
  const [customerId, setCustomerId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoNotice, setInfoNotice] = useState("");

  // Quick Google Account Modal for Local Testing
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googleNameInput, setGoogleNameInput] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const needVerify = params.get("verify") || params.get("requires_verification");
    const idParam = params.get("id");
    if (needVerify) {
      setMode("verify");
      if (idParam) setCustomerId(idParam);
      setInfoNotice("Please enter the 6-digit verification code sent to your email and phone to activate your account.");
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoNotice("");

    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your phone number or email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/customer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to log in.");
      }

      // If account requires 6-digit verification code
      if (data.requires_verification) {
        setCustomerId(data.customer_id);
        setVerificationCode("");
        setInfoNotice(data.message || "Please enter the 6-digit verification code sent to your email.");
        setResendCooldown(30);
        setMode("verify");
        return;
      }

      if (data.customer) {
        localStorage.setItem("bmgh_customer_session", JSON.stringify(data.customer));
      }

      router.push("/account");
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Request instant login OTP code (Passwordless OTP login)
  const handleRequestOtpLogin = async () => {
    setError("");
    if (!identifier.trim()) {
      setError("Please enter your mobile number or email address first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          purpose: "login",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not find an account with that number or email.");
      }

      setVerificationCode("");
      setInfoNotice(data.message || "Verification code sent to your registered email.");
      setResendCooldown(30);
      setMode("verify");
    } catch (err: any) {
      setError(err?.message || "Could not generate login code.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Code for Login
  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCode = verificationCode.trim().replace(/[^0-9]/g, "");
    if (cleanCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/customer/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId || undefined,
          identifier: identifier.trim() || undefined,
          code: cleanCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid verification code.");
      }

      if (data.customer) {
        localStorage.setItem("bmgh_customer_session", JSON.stringify(data.customer));
      }

      router.push("/account");
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleAuth = async (googleUser: { email: string; name: string }) => {
    setError("");
    setGoogleLoading(true);

    try {
      const res = await fetch("/api/customer/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.name,
          google_id: `g-${googleUser.email}`,
          picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleUser.name)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Google sign in failed.");
      }

      if (data.customer) {
        localStorage.setItem("bmgh_customer_session", JSON.stringify(data.customer));
      }

      setIsGoogleModalOpen(false);
      router.push("/account");
    } catch (err: any) {
      setError(err?.message || "Google sign in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0b1021] to-[#050811] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative selection:bg-amber-400 selection:text-slate-950">
      {/* Background glow effects */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Skip Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-2 sm:py-4 relative z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-slate-800 p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="BundleMartGh" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-white block leading-tight">
              BundleMart<span className="text-amber-400">Gh</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
              Customer Portal
            </span>
          </div>
        </Link>

        {/* Prominent Direct Skip Button */}
        <Link
          href="/#networks"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-400/30 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all shadow-md group"
        >
          <Zap className="w-3.5 h-3.5 fill-current text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Skip & Buy Directly</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md mx-auto w-full my-6 sm:my-10 relative z-10">
        <div className="bg-slate-900/90 border border-slate-800/90 shadow-2xl shadow-black/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
          {/* Card subtle glow top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-400 to-yellow-500" />

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-2">
              <UserCheck className="w-3 h-3" />
              Member Access
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {mode === "password" ? "Customer Sign In" : "Enter Verification Code"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {mode === "password"
                ? "Sign in with Google, password, or verification code to access your wallet balance."
                : `Enter the 6-digit code sent for ${identifier}`}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoNotice && !error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-400/30 text-amber-200 text-xs flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{infoNotice}</span>
            </div>
          )}

          {/* MODE 1: PASSWORD OR GOOGLE */}
          {mode === "password" && (
            <>
              {/* Google Sign-In Button */}
              <button
                type="button"
                disabled={googleLoading}
                onClick={() => {
                  setGoogleNameInput("Noah");
                  setGoogleEmailInput("nyakponoah11@gmail.com");
                  setIsGoogleModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                ) : (
                  <GoogleIcon />
                )}
                <span>Sign in with Google</span>
              </button>

              {/* Divider */}
              <div className="relative my-5 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <span className="relative px-3 bg-slate-900 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Or with phone / email
                </span>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Identifier */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Mobile Number or Email
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 055XXXXXXX or user@gmail.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Password / PIN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">Password / PIN</label>
                    <button
                      type="button"
                      onClick={handleRequestOtpLogin}
                      className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                    >
                      Login via Code (OTP) instead?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password or PIN"
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* MODE 2: VERIFICATION CODE ENTRY */}
          {mode === "verify" && (
            <div className="space-y-5">
              {/* Email Sent Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs flex items-center gap-3">
                <Mail className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Verification Code Sent via Email</p>
                  <p className="text-[11px] text-slate-300">
                    We sent a 6-digit verification code to your email. Please check your inbox or spam folder.
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="000000"
                      className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black py-3 rounded-2xl bg-slate-950 border-2 border-amber-400 text-amber-300 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Enter the one-time code sent to your phone or email.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Sign In</span>
                    </>
                  )}
                </button>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setMode("password")}
                    className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to password</span>
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={handleRequestOtpLogin}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Bottom Links */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Don't have an account yet?{" "}
              <Link
                href="/signup"
                className="font-bold text-amber-400 hover:text-amber-300 hover:underline"
              >
                Sign Up here
              </Link>
            </p>

            <div className="pt-2">
              <Link
                href="/#networks"
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
              >
                <span>Continue as guest without account</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Security assurance */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Paystack-secured wallet • Instant automated delivery</span>
        </div>
      </div>

      {/* Google Sign In Modal (Test & Direct on Localhost) */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 pb-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <GoogleIcon />
                <div>
                  <h3 className="text-sm font-bold text-white">Continue with Google</h3>
                  <p className="text-[11px] text-slate-400">Sign in with your Google Account</p>
                </div>
              </div>
              <button
                onClick={() => setIsGoogleModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Quick Preset Account */}
              <button
                type="button"
                onClick={() =>
                  handleGoogleAuth({
                    name: "Noah",
                    email: "nyakponoah11@gmail.com",
                  })
                }
                className="w-full p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-400/50 flex items-center gap-3 text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  N
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white block group-hover:text-amber-300 truncate">
                    Noah (nyakponoah11@gmail.com)
                  </span>
                  <span className="text-[10px] text-emerald-400">1-Click Google Sign In</span>
                </div>
              </button>

              <div className="relative text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <span className="relative px-2 bg-slate-900 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Or enter another Google account
                </span>
              </div>

              {/* Custom Google Email Input */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={googleNameInput}
                    onChange={(e) => setGoogleNameInput(e.target.value)}
                    placeholder="e.g. Kwame Mensah"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Google Email
                  </label>
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <button
                  type="button"
                  disabled={!googleEmailInput.trim()}
                  onClick={() =>
                    handleGoogleAuth({
                      name: googleNameInput.trim() || googleEmailInput.split("@")[0],
                      email: googleEmailInput.trim(),
                    })
                  }
                  className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                >
                  <GoogleIcon />
                  <span>Authorize with Google</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="text-center py-4 text-xs text-slate-500 relative z-10">
        © {new Date().getFullYear()} BundleMartGh. All rights reserved.
      </footer>
    </div>
  );
}
