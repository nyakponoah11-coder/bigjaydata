"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Code,
  Key,
  ShieldCheck,
  Terminal,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ExternalLink,
  Lock,
  Sparkles,
  Server,
  Layers,
  ChevronRight,
  RefreshCw,
  Coins,
  Send,
  BookOpen,
  Sliders,
  Clock,
  Radio,
  FileCode,
  DollarSign,
} from "lucide-react";

interface DeveloperConfig {
  is_enabled: boolean;
  api_key_price: number;
  min_wallet_funding: number;
  notice_message?: string;
}

interface DeveloperProduct {
  id: string;
  network: string;
  size: string;
  cost_price: number;
  api_price: number;
  is_active: boolean;
}

interface DeveloperAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  api_key: string;
  balance: number;
  is_active: boolean;
  total_spent?: number;
  total_orders?: number;
}

export default function DeveloperPortalPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<DeveloperConfig | null>(null);
  const [products, setProducts] = useState<DeveloperProduct[]>([]);
  const [activeTab, setActiveTab] = useState<"keys" | "docs" | "pricing">("keys");

  // Registration / OTP Flow State
  const [step, setStep] = useState<"input" | "verify" | "key_ready">("input");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Generated Account
  const [currentAccount, setCurrentAccount] = useState<DeveloperAccount | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Existing key login / lookup
  const [loginKey, setLoginKey] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [showLookupBox, setShowLookupBox] = useState(false);

  // Code Snippet Language Selector in Docs
  const [selectedLang, setSelectedLang] = useState<"curl" | "node" | "python" | "php">("curl");
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState<string | null>(null);

  // Load initial config and products
  useEffect(() => {
    // Check saved developer session
    const savedKey = localStorage.getItem("fd_developer_key");
    if (savedKey) {
      lookupAccount(savedKey);
    }

    fetch("/api/developer/agent-store")
      .then(() => {})
      .catch(() => {});

    fetch("/api/admin/developer")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setConfig(d.config);
          setProducts(d.products || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const lookupAccount = async (apiKey: string) => {
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", api_key: apiKey }),
      });
      const data = await res.json();
      if (data.success && data.account) {
        setCurrentAccount({ ...data.account, api_key: apiKey });
        setStep("key_ready");
        localStorage.setItem("fd_developer_key", apiKey);
      }
    } catch {}
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg("Please fill in your Full Name, Email, and Phone number.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_otp",
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate verification code.");
      }

      setSuccessMsg(data.message);
      if (data.simulated_code) {
        setSimulatedOtp(data.simulated_code);
        setOtpCode(data.simulated_code);
      }
      setStep("verify");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to request code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_otp",
          email: email.trim(),
          code: otpCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid verification code.");
      }

      setCurrentAccount(data.account);
      localStorage.setItem("fd_developer_key", data.account.api_key);
      setStep("key_ready");
      setSuccessMsg("API Key generated successfully! Keep it private and safe.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Verification failed. Check the code and try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim()) return;
    setLoggingIn(true);
    setErrorMsg("");
    try {
      await lookupAccount(loginKey.trim());
      setShowLookupBox(false);
    } catch (err: any) {
      setErrorMsg("Invalid API key or account not found.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCopyKey = () => {
    if (!currentAccount?.api_key) return;
    navigator.clipboard.writeText(currentAccount.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyCode = (snippet: string, id: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedCodeSnippet(id);
    setTimeout(() => setCopiedCodeSnippet(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("fd_developer_key");
    setCurrentAccount(null);
    setStep("input");
    setOtpCode("");
    setSimulatedOtp(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // ================= 1. MASTER SWITCH IS OFF -> SLEEK "COMING SOON" SCREEN =================
  if (config && !config.is_enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0b1021] to-[#050811] text-slate-100 flex flex-col justify-between p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
        {/* Top Minimal Nav */}
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black border border-slate-800 flex items-center justify-center p-0.5 shadow-md">
              <img src="/logo.png" alt="FastData" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">FastData</span>
          </Link>

          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            ← Return to Store
          </Link>
        </div>

        {/* Coming Soon Hero Banner */}
        <div className="max-w-2xl mx-auto w-full text-center py-16 sm:py-24 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 shadow-lg shadow-indigo-950/50">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
              Developer Platform • Access Paused
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Developer API Gateway <br />
            <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
              Coming Soon
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            {config.notice_message ||
              "The public developer API gateway is temporarily undergoing scheduled maintenance or paused by platform administration. Key issuance will resume shortly."}
          </p>

          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 max-w-md mx-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Automated API Maintenance</span>
            </div>
            <p className="text-xs text-slate-400">
              Need priority API access or custom enterprise webhook integration? Reach out to support directly.
            </p>
            <div className="flex gap-2">
              <Link
                href="/"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
              >
                Return to Storefront
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-6xl mx-auto w-full text-center py-6 border-t border-slate-800/60 text-xs text-slate-500">
          FastData Developer Gateway • High-Speed Telco APIs for Ghana
        </div>
      </div>
    );
  }

  // ================= 2. MASTER SWITCH IS ON -> COMPLETE DEVELOPER PORTAL =================
  const activeKey = currentAccount?.api_key || "fd_live_your_api_key_here";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://fastdatagh.com";

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-black border border-slate-800 flex items-center justify-center p-0.5 shadow-md group-hover:scale-105 transition-transform">
                <img src="/logo.png" alt="FastData" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-extrabold text-base sm:text-lg text-white tracking-tight leading-none block">
                  FastData
                </span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                  Developer API
                </span>
              </div>
            </Link>
          </div>

          {/* Center Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("keys")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "keys"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>API Key & Wallet</span>
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "docs"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Documentation</span>
            </button>
            <button
              onClick={() => setActiveTab("pricing")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "pricing"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Wholesale Rates</span>
            </button>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            {currentAccount ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-white">{currentAccount.name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-bold">
                    GHS {currentAccount.balance?.toFixed(2) || "0.00"}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLookupBox(!showLookupBox)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Sign In with Key</span>
              </button>
            )}

            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Store ↗
            </Link>
          </div>
        </div>

        {/* Existing Key Lookup Bar */}
        {showLookupBox && !currentAccount && (
          <div className="border-t border-slate-800 bg-[#0c1222] p-4 animate-in slide-in-from-top-2">
            <div className="max-w-xl mx-auto flex items-center gap-2">
              <input
                type="text"
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
                placeholder="Enter existing API key (fd_live_...)"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleKeyLogin}
                disabled={loggingIn}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
              >
                {loggingIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify & Open"}
              </button>
            </div>
          </div>
        )}

        {/* Mobile Subnav */}
        <div className="flex md:hidden border-t border-slate-800/80 px-4 py-2 gap-1 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab("keys")}
            className={`px-3 py-1 rounded-lg ${
              activeTab === "keys" ? "bg-indigo-600 text-white" : "text-slate-400"
            }`}
          >
            Keys & Wallet
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-3 py-1 rounded-lg ${
              activeTab === "docs" ? "bg-indigo-600 text-white" : "text-slate-400"
            }`}
          >
            Documentation
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`px-3 py-1 rounded-lg ${
              activeTab === "pricing" ? "bg-indigo-600 text-white" : "text-slate-400"
            }`}
          >
            Wholesale Rates
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full space-y-8">
        {/* Hero Banner */}
        <div className="relative rounded-3xl p-6 sm:p-10 border border-slate-800 bg-gradient-to-br from-indigo-950/40 via-[#0a0f1d] to-[#050811] shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Production REST API • MTN, Telecel, AT</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Automated Telecom Data <br />
              <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
                Fulfillment API for Ghana
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Integrate non-expiry mobile data bundle delivery directly into your app, bot, fintech, or web app in minutes. High-speed automated delivery with developer wallet billing.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sub-60s Delivery</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>6-Digit 2FA Verified</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Wholesale Pricing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-950/90 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= TAB 1: API KEYS & WALLET ================= */}
        {activeTab === "keys" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Key Generator or Active Dashboard */}
            <div className="lg:col-span-7 space-y-6">
              {step !== "key_ready" ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Key className="w-5 h-5 text-indigo-400" />
                      <span>Generate Your Secret API Key</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {step === "input"
                        ? "Enter your details below. We'll send a 6-digit security verification code to your email to verify and issue your key."
                        : `Enter the 6-digit verification code sent to ${email}.`}
                    </p>
                  </div>

                  {/* API Key Price Badge (if configured by admin) */}
                  {config && config.api_key_price > 0 && (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-2xl flex items-center justify-between text-xs">
                      <span className="text-amber-300 font-semibold">API Key Issuance Price:</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        GHS {config.api_key_price.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* STEP 1: Details Form */}
                  {step === "input" && (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                          Full Name or Organisation
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. John Doe or DevStudio GH"
                          className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                          Developer Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. developer@mycompany.com"
                          className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          A 6-digit authorization code will be dispatched to this address.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                          Ghana Phone Number (MoMo / WhatsApp)
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 0551234567"
                          className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={sendingOtp}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                      >
                        {sendingOtp ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>Send 6-Digit Verification Code</span>
                      </button>
                    </form>
                  )}

                  {/* STEP 2: 6-Digit Code Verification */}
                  {step === "verify" && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      {simulatedOtp && (
                        <div className="p-3 bg-indigo-950/60 border border-indigo-700 rounded-2xl text-xs space-y-1">
                          <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Instant Verification Code:</span>
                          </div>
                          <div className="font-mono text-xl font-black text-amber-300 tracking-widest">
                            {simulatedOtp}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                          Enter 6-Digit Code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="••••••"
                          className="w-full px-4 py-3 bg-slate-800 border border-indigo-500 rounded-xl text-white text-center text-2xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStep("input")}
                          className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                        >
                          ← Back
                        </button>
                        <button
                          type="submit"
                          disabled={verifyingOtp}
                          className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                        >
                          {verifyingOtp ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>Verify & Generate API Key</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* STEP 3: API Key is Ready & Wallet Overview */
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ✓ API Key Active
                      </span>
                      <h2 className="text-lg font-black text-white mt-1">
                        Developer Account: {currentAccount?.name}
                      </h2>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>

                  {/* Secret Key Display Box */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Production Secret Key (Bearer Token)</span>
                      <span className="text-[10px] text-amber-400">Keep Confidential</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <span className="font-mono text-xs sm:text-sm text-indigo-300 font-bold truncate">
                        {currentAccount?.api_key}
                      </span>
                      <button
                        onClick={handleCopyKey}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                      >
                        {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Wallet Balance Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Developer Wallet Balance
                      </span>
                      <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                        GHS {currentAccount?.balance?.toFixed(2) || "0.00"}
                      </span>
                    </div>

                    <a
                      href={`https://wa.me/233551234567?text=Hello%20FastData%20Admin%2C%20I%20want%20to%20fund%20my%20Developer%20API%20Wallet%20(Account%3A%20${encodeURIComponent(
                        currentAccount?.email || ""
                      )})`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Top Up Wallet</span>
                    </a>
                  </div>

                  {/* Quick Usage Stats */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Total Orders</span>
                      <span className="font-mono font-bold text-white text-base">
                        {currentAccount?.total_orders || 0}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Total Spent</span>
                      <span className="font-mono font-bold text-white text-base">
                        GHS {currentAccount?.total_spent?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Key Security & Quick Specs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>API Quick Reference</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Base Endpoint:</span>
                    <code className="block p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-indigo-300 break-all">
                      {baseUrl}/api/v1/developer
                    </code>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Authentication Header:</span>
                    <code className="block p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-emerald-300 break-all">
                      x-api-key: {activeKey.substring(0, 16)}...
                    </code>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-1">Core Endpoints:</span>
                    <ul className="space-y-1.5 font-mono text-[11px] text-slate-300">
                      <li className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold">GET</span> /packages
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold">GET</span> /balance
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold">POST</span> /buy
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold">GET</span> /status?reference=...
                      </li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("docs")}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Explore Interactive Docs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Security Advisory */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-2 text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Security Recommendations</span>
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Always execute API transactions from your server-side environment (Node, Python, PHP). Never expose your secret API key on client-side React/Vue frontends.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: INTERACTIVE DOCUMENTATION ================= */}
        {activeTab === "docs" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white">REST API Documentation</h2>
                <p className="text-xs text-slate-400">
                  Base URL: <code className="text-indigo-300 font-mono">{baseUrl}/api/v1/developer</code>
                </p>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-bold">
                {[
                  { id: "curl", label: "cURL" },
                  { id: "node", label: "Node.js" },
                  { id: "python", label: "Python" },
                  { id: "php", label: "PHP" },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setSelectedLang(lang.id as any)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedLang === lang.id
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ENDPOINT 1: POST /buy */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800">
                  POST
                </span>
                <code className="text-sm sm:text-base font-mono font-bold text-white">
                  /api/v1/developer/buy
                </code>
              </div>
              <p className="text-xs text-slate-400">
                Purchase and dispatch a data bundle directly to a recipient. Automatically deducts the wholesale price from your developer wallet.
              </p>

              {/* Request Parameters Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2">Field</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Required</th>
                      <th className="py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    <tr>
                      <td className="py-2 text-indigo-400">network</td>
                      <td className="py-2 text-slate-400">string</td>
                      <td className="py-2 text-amber-400 font-bold">Yes</td>
                      <td className="py-2 text-slate-400 font-sans">mtn | telecel | at</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-indigo-400">package_size</td>
                      <td className="py-2 text-slate-400">string</td>
                      <td className="py-2 text-amber-400 font-bold">Yes</td>
                      <td className="py-2 text-slate-400 font-sans">e.g. "1GB", "2GB", "5GB", "10GB"</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-indigo-400">phone</td>
                      <td className="py-2 text-slate-400">string</td>
                      <td className="py-2 text-amber-400 font-bold">Yes</td>
                      <td className="py-2 text-slate-400 font-sans">10-digit Ghana mobile number (055xxxxxxx)</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-indigo-400">reference</td>
                      <td className="py-2 text-slate-400">string</td>
                      <td className="py-2 text-slate-400">Optional</td>
                      <td className="py-2 text-slate-400 font-sans">Your internal unique tracking reference</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Code Snippet */}
              <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 overflow-x-auto">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                  <span className="uppercase font-bold">{selectedLang} Request Example</span>
                  <button
                    onClick={() => {
                      const codeText =
                        selectedLang === "curl"
                          ? `curl -X POST "${baseUrl}/api/v1/developer/buy" \\\n  -H "x-api-key: ${activeKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "network": "mtn",\n    "package_size": "5GB",\n    "phone": "0551234567",\n    "reference": "ORDER-9912"\n  }'`
                          : selectedLang === "node"
                          ? `const res = await fetch("${baseUrl}/api/v1/developer/buy", {\n  method: "POST",\n  headers: {\n    "x-api-key": "${activeKey}",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    network: "mtn",\n    package_size: "5GB",\n    phone: "0551234567",\n    reference: "ORDER-9912"\n  })\n});\nconst data = await res.json();\nconsole.log(data);`
                          : selectedLang === "python"
                          ? `import requests\n\nres = requests.post(\n    "${baseUrl}/api/v1/developer/buy",\n    headers={"x-api-key": "${activeKey}"},\n    json={\n        "network": "mtn",\n        "package_size": "5GB",\n        "phone": "0551234567",\n        "reference": "ORDER-9912"\n    }\n)\nprint(res.json())`
                          : `<?php\n$ch = curl_init("${baseUrl}/api/v1/developer/buy");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    "x-api-key: ${activeKey}",\n    "Content-Type: application/json"\n]);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n    "network" => "mtn",\n    "package_size" => "5GB",\n    "phone" => "0551234567",\n    "reference" => "ORDER-9912"\n]));\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$res = curl_exec($ch);\necho $res;`;
                      handleCopyCode(codeText, "buy_sample");
                    }}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {copiedCodeSnippet === "buy_sample" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeSnippet === "buy_sample" ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <pre className="text-xs font-mono text-emerald-300">
                  {selectedLang === "curl" &&
                    `curl -X POST "${baseUrl}/api/v1/developer/buy" \\\n  -H "x-api-key: ${activeKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "network": "mtn",\n    "package_size": "5GB",\n    "phone": "0551234567",\n    "reference": "ORDER-9912"\n  }'`}
                  {selectedLang === "node" &&
                    `const res = await fetch("${baseUrl}/api/v1/developer/buy", {\n  method: "POST",\n  headers: {\n    "x-api-key": "${activeKey}",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    network: "mtn",\n    package_size: "5GB",\n    phone: "0551234567",\n    reference: "ORDER-9912"\n  })\n});\nconst data = await res.json();`}
                  {selectedLang === "python" &&
                    `import requests\n\nres = requests.post(\n    "${baseUrl}/api/v1/developer/buy",\n    headers={"x-api-key": "${activeKey}"},\n    json={\n        "network": "mtn",\n        "package_size": "5GB",\n        "phone": "0551234567",\n        "reference": "ORDER-9912"\n    }\n)\nprint(res.json())`}
                  {selectedLang === "php" &&
                    `<?php\n$ch = curl_init("${baseUrl}/api/v1/developer/buy");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    "x-api-key: ${activeKey}",\n    "Content-Type: application/json"\n]);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n    "network" => "mtn",\n    "package_size" => "5GB",\n    "phone" => "0551234567"\n]));\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$res = curl_exec($ch);`}
                </pre>
              </div>

              {/* Sample Response */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                  Response 200 OK
                </span>
                <pre className="text-xs font-mono text-indigo-300">
                  {`{
  "success": true,
  "reference": "ORDER-9912",
  "network": "mtn",
  "package_size": "5GB",
  "recipient": "0551234567",
  "amount_charged": 23.00,
  "remaining_balance": 77.00,
  "delivery_status": "delivered",
  "delivery_message": "Transaction successful",
  "created_at": "2026-10-10T12:00:00.000Z"
}`}
                </pre>
              </div>
            </div>

            {/* ENDPOINT 2: GET /packages */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                  GET
                </span>
                <code className="text-sm sm:text-base font-mono font-bold text-white">
                  /api/v1/developer/packages
                </code>
              </div>
              <p className="text-xs text-slate-400">
                Retrieve all active bundles, sizes, networks, and live wholesale API prices configured by platform administration.
              </p>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-emerald-300">
                  {`curl -X GET "${baseUrl}/api/v1/developer/packages" \\\n  -H "x-api-key: ${activeKey}"`}
                </pre>
              </div>
            </div>

            {/* ENDPOINT 3: GET /balance */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                  GET
                </span>
                <code className="text-sm sm:text-base font-mono font-bold text-white">
                  /api/v1/developer/balance
                </code>
              </div>
              <p className="text-xs text-slate-400">
                Query your developer wallet balance and account status in real-time.
              </p>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-emerald-300">
                  {`curl -X GET "${baseUrl}/api/v1/developer/balance" \\\n  -H "x-api-key: ${activeKey}"`}
                </pre>
              </div>
            </div>

            {/* ENDPOINT 4: GET /status */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                  GET
                </span>
                <code className="text-sm sm:text-base font-mono font-bold text-white">
                  /api/v1/developer/status?reference=ORDER-9912
                </code>
              </div>
              <p className="text-xs text-slate-400">
                Poll delivery status of an API order using its reference.
              </p>
            </div>
          </div>
        )}

        {/* ================= TAB 3: WHOLESALE RATES ================= */}
        {activeTab === "pricing" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Live Wholesale API Rates</h2>
              <p className="text-xs text-slate-400">
                These prices are configured by platform administration for developers purchasing via API keys.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["mtn", "telecel", "at"].map((net) => {
                const netProducts = products.filter(
                  (p) => p.is_active && p.network.toLowerCase() === net
                );
                return (
                  <div
                    key={net}
                    className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <span className="font-black text-sm uppercase text-white tracking-wider">
                        {net === "mtn" ? "MTN Ghana" : net === "telecel" ? "Telecel Ghana" : "AT Ghana"}
                      </span>
                      <span
                        className={`w-3 h-3 rounded-full ${
                          net === "mtn"
                            ? "bg-amber-400"
                            : net === "telecel"
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                      />
                    </div>

                    <div className="space-y-2.5">
                      {netProducts.length === 0 ? (
                        <div className="text-xs text-slate-500 py-4 text-center">
                          Packages updating soon...
                        </div>
                      ) : (
                        netProducts.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-xl text-xs"
                          >
                            <span className="font-bold text-white">{p.size}</span>
                            <span className="font-mono font-bold text-emerald-400">
                              GHS {p.api_price.toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} FastData Ghana • Developer Platform</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-300">
              Customer Store
            </Link>
            <Link href="/agent-store" className="hover:text-slate-300">
              Agent Portal
            </Link>
            <Link href="/track" className="hover:text-slate-300">
              Track Order
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
