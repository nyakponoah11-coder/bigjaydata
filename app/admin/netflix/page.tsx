"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Tv,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Key,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Send,
  Eye,
  EyeOff,
  Clock,
  Mail,
  User,
  Phone,
  Search,
  Check,
  Wallet,
  X,
  PlusCircle,
} from "lucide-react";

export default function AdminNetflixPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Configuration state
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [retailPrice, setRetailPrice] = useState(25);
  const [agentBasePrice, setAgentBasePrice] = useState(18);
  const [wholesaleCost] = useState(15); // Fixed Data1 wholesale rate

  // Balance state
  const [balance, setBalance] = useState(150);
  const [updatingBalance, setUpdatingBalance] = useState(false);
  const [customBalanceInput, setCustomBalanceInput] = useState("");
  const [customTopUpInput, setCustomTopUpInput] = useState("150");
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [balanceTab, setBalanceTab] = useState<"topup" | "set">("topup");

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchingCodeRef, setFetchingCodeRef] = useState<string | null>(null);
  const [fetchedCodes, setFetchedCodes] = useState<Record<string, { code?: string; error?: string; pending?: boolean }>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manual Dispatch state
  const [dispatchName, setDispatchName] = useState("");
  const [dispatchPhone, setDispatchPhone] = useState("");
  const [dispatchEmail, setDispatchEmail] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Fetch initial data
  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/netflix");
      const data = await res.json();
      if (data.success && data.config) {
        setApiKey(data.config.apiKey || "");
        setIsEnabled(data.config.isEnabled !== false);
        setRetailPrice(Number(data.config.retailPrice) || 25);
        setAgentBasePrice(Number(data.config.agentBasePrice) || 18);
        const currentBal = Number(data.balance !== undefined ? data.balance : (data.config.balance || 150));
        setBalance(currentBal);
        setCustomBalanceInput(String(currentBal));
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load Netflix admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/netflix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          netflix_enabled: isEnabled,
          netflix_api_key: apiKey,
          netflix_price: Number(retailPrice),
          netflix_agent_base_price: Number(agentBasePrice),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: "Settings and pricing saved successfully!" });
      } else {
        setTestResult({ success: false, message: data.message || "Failed to save settings." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleTopUpBalance = async (amount: number) => {
    setUpdatingBalance(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/netflix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "top_up_balance", amount }),
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
        setCustomBalanceInput(String(data.balance));
        setTestResult({ success: true, message: data.message || "Top-up added successfully!" });
        setIsTopUpModalOpen(false);
      } else {
        setTestResult({ success: false, message: data.message || "Failed to top up." });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || "Failed to top up." });
    } finally {
      setUpdatingBalance(false);
    }
  };

  const handleSetBalance = async (newBal: number) => {
    setUpdatingBalance(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/netflix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_balance", balance: newBal }),
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
        setCustomBalanceInput(String(data.balance));
        setTestResult({ success: true, message: data.message || "Balance updated successfully!" });
        setIsTopUpModalOpen(false);
      } else {
        setTestResult({ success: false, message: data.message || "Failed to update balance." });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || "Failed to update balance." });
    } finally {
      setUpdatingBalance(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/netflix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_connection",
          api_key: apiKey,
        }),
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "Connection established!" : "Connection failed."),
      });
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Test failed." });
    } finally {
      setTesting(false);
    }
  };

  const handleFetchCode = async (reference: string) => {
    setFetchingCodeRef(reference);
    try {
      const res = await fetch("/api/admin/netflix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fetch_code",
          reference,
        }),
      });

      const data = await res.json();
      if (data.success && data.code) {
        setFetchedCodes((prev) => ({
          ...prev,
          [reference]: { code: data.code },
        }));
      } else if (data.status === "pending" || data.retryable) {
        setFetchedCodes((prev) => ({
          ...prev,
          [reference]: {
            pending: true,
            error: data.error || "Pending: Enter email on Netflix, click 'Send code', then try again.",
          },
        }));
      } else {
        setFetchedCodes((prev) => ({
          ...prev,
          [reference]: { error: data.error || data.message || "Failed to fetch code" },
        }));
      }
    } catch (err: any) {
      setFetchedCodes((prev) => ({
        ...prev,
        [reference]: { error: err?.message || "Network error" },
      }));
    } finally {
      setFetchingCodeRef(null);
    }
  };

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    setDispatchMsg(null);

    try {
      const res = await fetch("/api/admin/netflix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_order",
          customer_name: dispatchName.trim(),
          customer_phone: dispatchPhone.trim(),
          customer_email: dispatchEmail.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDispatchMsg({
          success: true,
          message: `Netflix access dispatched! Assigned email: ${data.api_result?.netflix_email || "Active"}`,
          details: data.api_result,
        });
        setDispatchName("");
        setDispatchPhone("");
        setDispatchEmail("");
        loadData(); // reload orders table
      } else {
        setDispatchMsg({ success: false, message: data.message || "Dispatch failed." });
      }
    } catch (err: any) {
      setDispatchMsg({ success: false, message: err?.message || "Dispatch error." });
    } finally {
      setDispatching(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (o.reference || "").toLowerCase().includes(q) ||
      (o.phone || "").toLowerCase().includes(q) ||
      (o.customer_name || "").toLowerCase().includes(q) ||
      (o.customer_email || "").toLowerCase().includes(q) ||
      (o.netflix_email || "").toLowerCase().includes(q)
    );
  });

  const storefrontProfit = Number((retailPrice - wholesaleCost).toFixed(2));
  const agentPlatformProfit = Number((agentBasePrice - wholesaleCost).toFixed(2));

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Connecting to Netflix Reseller Hub...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 border border-red-900/40 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider">
                <Tv className="w-3.5 h-3.5" />
                Data1 Official Partner Gateway
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                Netflix Reseller Hub
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Automated 30-day Netflix Ultra HD accounts with real-time OTP sign-in code fetching.
                Control storefront pricing, agent wholesale pricing, and instant customer fulfillment.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="p-4 rounded-2xl bg-black/40 border border-red-500/40 text-center min-w-[140px] relative group shadow-lg">
                <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Netflix Balance
                </div>
                <div className="text-xl font-black text-white font-mono mt-0.5">GH₵ {balance.toFixed(2)}</div>
                <div className="text-[10px] text-slate-400 font-medium">~{Math.floor(balance / wholesaleCost)} accounts</div>
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(true)}
                  className="mt-1 text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-wider underline cursor-pointer"
                >
                  Top Up / Edit →
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-red-900/30 text-center min-w-[130px]">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Wholesale Rate</div>
                <div className="text-xl font-black text-red-400 mt-0.5">GH₵ 15.00</div>
                <div className="text-[10px] text-slate-500">per 30 days</div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-emerald-900/30 text-center min-w-[130px]">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Store Profit</div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">+GH₵ {storefrontProfit}</div>
                <div className="text-[10px] text-emerald-500 font-medium">per retail sale</div>
              </div>
            </div>
          </div>
        </div>

        {/* Status / Alert Banner */}
        {testResult && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium ${
              testResult.success
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                : "bg-red-950/60 border-red-500/40 text-red-200"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: API & Pricing Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Card 1: API Configuration & Live Status */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Data1 API Credentials</h2>
                    <p className="text-xs text-slate-400">Partner: Bigjay • Rate: GH₵ 15 / 30-day</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEnabled(!isEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isEnabled ? "bg-red-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-slate-300">
                    {isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Data1 Partner API Key (x-api-key)
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="d1_live_nf_bigjay_..."
                      className="w-full pl-4 pr-24 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        title={showApiKey ? "Hide Key" : "Show Key"}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(apiKey, "api_key")}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        title="Copy Key"
                      >
                        {copiedKey === "api_key" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Pre-configured with Bigjay's live partner credentials. Automatically passed in request headers.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing || !apiKey}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <RefreshCw className="w-3.5 h-3.5 text-red-400" />}
                    <span>Test API Connection</span>
                  </button>
                  <span className="text-xs text-slate-500">
                    Endpoint: <code className="text-slate-400 font-mono">https://www.data1gh.com/api/partner/netflix</code>
                  </span>
                </div>
              </div>
            </div>

            {/* Card 1.5: Netflix Partner Wallet & Stock Balance */}
            <div className="rounded-3xl bg-slate-900/90 border border-red-500/30 p-6 sm:p-7 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      Netflix Reseller Balance
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    </h2>
                    <p className="text-xs text-slate-400">Funded account credits on Data1 gateway (GH₵ 15 per order)</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-red-400 font-mono">
                    GH₵ {balance.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-semibold">
                    ~{Math.floor(balance / wholesaleCost)} accounts stock
                  </div>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBalanceTab("topup")}
                  className={`py-2 rounded-xl transition-all ${
                    balanceTab === "topup"
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  + Add Top-Up Deposit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBalanceTab("set");
                    setCustomBalanceInput(String(balance));
                  }}
                  className={`py-2 rounded-xl transition-all ${
                    balanceTab === "set"
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Set Exact Balance
                </button>
              </div>

              {balanceTab === "topup" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Quick Top-Up Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "+GH₵ 75", acc: "5 acc", val: 75 },
                        { label: "+GH₵ 150", acc: "10 acc", val: 150 },
                        { label: "+GH₵ 300", acc: "20 acc", val: 300 },
                        { label: "+GH₵ 750", acc: "50 acc", val: 750 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          disabled={updatingBalance}
                          onClick={() => handleTopUpBalance(p.val)}
                          className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-red-500/50 hover:bg-red-950/20 text-center transition-all group disabled:opacity-50"
                        >
                          <div className="text-sm font-black text-white group-hover:text-red-400 font-mono">
                            {p.label}
                          </div>
                          <div className="text-[10px] text-slate-500">{p.acc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Custom Top-Up Amount (GHS)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                          GH₵
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          value={customTopUpInput}
                          onChange={(e) => setCustomTopUpInput(e.target.value)}
                          placeholder="e.g. 150"
                          className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={updatingBalance || !customTopUpInput || Number(customTopUpInput) <= 0}
                        onClick={() => handleTopUpBalance(Number(customTopUpInput))}
                        className="py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-red-950/50 transition-all disabled:opacity-50 shrink-0"
                      >
                        {updatingBalance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                        <span>Deposit</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Override / Correct Exact Netflix Balance (GHS)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        GH₵
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customBalanceInput}
                        onChange={(e) => setCustomBalanceInput(e.target.value)}
                        placeholder="e.g. 150.00"
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={updatingBalance || customBalanceInput === "" || Number(customBalanceInput) < 0}
                      onClick={() => handleSetBalance(Number(customBalanceInput))}
                      className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50 shrink-0"
                    >
                      {updatingBalance ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>Set Balance</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Use this whenever you want to manually synchronize your tracked wallet balance with Data1.
                  </p>
                </div>
              )}
            </div>

            {/* Card 2: Pricing & Profit Margins */}
            <form onSubmit={handleSaveConfig} className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Pricing & Profit Margins</h2>
                  <p className="text-xs text-slate-400">Set retail price for customers and wholesale for agents</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Main Storefront Price */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      Main Storefront Price
                    </label>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Retail
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      GH₵
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="15"
                      required
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(Number(e.target.value))}
                      className="w-full pl-14 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span>Wholesale: GH₵ 15</span>
                    <span className="text-emerald-400 font-bold">
                      Profit: +GH₵ {storefrontProfit} ({((storefrontProfit / wholesaleCost) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>

                {/* Agent Store Base Price */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      Agent Base Wholesale
                    </label>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Resellers
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      GH₵
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="15"
                      required
                      value={agentBasePrice}
                      onChange={(e) => setAgentBasePrice(Number(e.target.value))}
                      className="w-full pl-14 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span>Cost: GH₵ 15</span>
                    <span className="text-amber-400 font-bold">
                      Your Margin: +GH₵ {agentPlatformProfit} / order
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-sm shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                  <span>Save Configuration & Pricing</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Instant Manual Dispatch (5 Cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Manual Netflix Dispatch</h2>
                  <p className="text-xs text-slate-400">Generate 30-day access directly for a customer</p>
                </div>
              </div>

              {dispatchMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium ${
                    dispatchMsg.success
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                      : "bg-red-950/60 border-red-500/40 text-red-200"
                  }`}
                >
                  <p className="font-bold">{dispatchMsg.message}</p>
                  {dispatchMsg.details && (
                    <div className="mt-2 font-mono text-[11px] bg-black/40 p-2 rounded-lg space-y-1">
                      <div>Ref: {dispatchMsg.details.reference}</div>
                      <div>Email: {dispatchMsg.details.netflix_email}</div>
                      <div>Expires: {new Date(dispatchMsg.details.expires_at).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleManualDispatch} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                    Customer Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={dispatchName}
                      onChange={(e) => setDispatchName(e.target.value)}
                      placeholder="e.g. Kwame Mensah"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                    Customer Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={dispatchPhone}
                      onChange={(e) => setDispatchPhone(e.target.value)}
                      placeholder="0541234567"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                    Customer Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={dispatchEmail}
                      onChange={(e) => setDispatchEmail(e.target.value)}
                      placeholder="customer@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={dispatching || !dispatchPhone || !dispatchEmail}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-sm shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {dispatching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Dispatch 30-Day Netflix Access</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Section: Netflix Orders & Live OTP Fetching */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-7 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Netflix Orders & Sign-in Code Manager</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-500/30">
                  {filteredOrders.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live list of Netflix customer orders. Click "Fetch Sign-In Code" to retrieve the 4-digit code in real-time.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone, email, ref..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Tv className="w-10 h-10 mx-auto opacity-30 text-red-400" />
              <p className="text-sm font-medium">No Netflix orders found yet.</p>
              <p className="text-xs text-slate-600">
                When customers purchase Netflix on the storefront or via an agent, their orders will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Assigned Netflix Email</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Sign-in Code</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredOrders.map((o) => {
                    const codeInfo = fetchedCodes[o.reference] || (o.netflix_code ? { code: o.netflix_code } : null);
                    const isFetchingThis = fetchingCodeRef === o.reference;

                    return (
                      <tr key={o.id || o.reference} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{o.reference}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(o.reference, o.reference)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title="Copy Reference"
                            >
                              {copiedKey === o.reference ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 font-sans">
                            {new Date(o.created_at).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{o.customer_name || "Customer"}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{o.phone}</div>
                          {o.customer_email && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{o.customer_email}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                              {o.netflix_email || "stillmoving11@gmail.com"}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(o.netflix_email || "stillmoving11@gmail.com", `email_${o.reference}`)}
                              className="text-slate-500 hover:text-white"
                              title="Copy Email"
                            >
                              {copiedKey === `email_${o.reference}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">30-Day Ultra HD Profile</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">GH₵ {Number(o.amount || 0).toFixed(2)}</div>
                          <div className="text-[10px] text-slate-500">{o.source || "web"}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            {o.delivery_status || o.status || "Active"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          {codeInfo?.code ? (
                            <div className="inline-flex items-center gap-2 bg-red-950/80 border border-red-500/50 px-2.5 py-1 rounded-xl">
                              <span className="text-sm font-black text-red-400 tracking-widest">{codeInfo.code}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(codeInfo.code!, `code_${o.reference}`)}
                                className="text-red-300 hover:text-white"
                                title="Copy Sign-in Code"
                              >
                                {copiedKey === `code_${o.reference}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : codeInfo?.pending ? (
                            <span className="text-[11px] text-amber-400 animate-pulse font-sans">
                              Code requested... check mailbox
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-sans">Not fetched yet</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleFetchCode(o.reference)}
                            disabled={isFetchingThis}
                            className="py-1.5 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold text-[11px] inline-flex items-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {isFetchingThis ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            <span>Fetch Code</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Netflix Balance Top-Up / Edit Modal */}
        {isTopUpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
              <button
                type="button"
                onClick={() => setIsTopUpModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-wider">
                  <Wallet className="w-3.5 h-3.5" />
                  Data1 Netflix Partner Wallet
                </div>
                <h3 className="text-xl font-black text-white">Update Netflix Balance</h3>
                <p className="text-xs text-slate-400">
                  Track your wholesale credit with Data1. Wholesale cost: GH₵ 15 per 30-day account.
                </p>
              </div>

              {/* Current Balance Pill */}
              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</div>
                  <div className="text-2xl font-black text-red-400 font-mono mt-0.5">
                    GH₵ {balance.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Available Stock</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    ~{Math.floor(balance / wholesaleCost)} accounts
                  </div>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Quick Deposit Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "+GH₵ 75 (5 acc)", val: 75 },
                    { label: "+GH₵ 150 (10 acc)", val: 150 },
                    { label: "+GH₵ 300 (20 acc)", val: 300 },
                    { label: "+GH₵ 750 (50 acc)", val: 750 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      disabled={updatingBalance}
                      onClick={() => handleTopUpBalance(p.val)}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-left text-slate-300 hover:text-white hover:border-red-500 transition-all disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Top Up */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Custom Top-Up (GHS)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      GH₵
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={customTopUpInput}
                      onChange={(e) => setCustomTopUpInput(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={updatingBalance || !customTopUpInput || Number(customTopUpInput) <= 0}
                    onClick={() => handleTopUpBalance(Number(customTopUpInput))}
                    className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-red-950/50 transition-all disabled:opacity-50 shrink-0"
                  >
                    {updatingBalance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Set Exact Balance */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2">
                <label className="text-xs font-bold text-slate-300">Or Set Exact Balance (GHS)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      GH₵
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customBalanceInput}
                      onChange={(e) => setCustomBalanceInput(e.target.value)}
                      placeholder="e.g. 150.00"
                      className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={updatingBalance || customBalanceInput === "" || Number(customBalanceInput) < 0}
                    onClick={() => handleSetBalance(Number(customBalanceInput))}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50 shrink-0"
                  >
                    {updatingBalance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>Set</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SaveIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
