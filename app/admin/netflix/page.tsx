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
  const [wholesaleCost, setWholesaleCost] = useState(1); // Data1 wholesale rate

  // Balance state (read live from Data1 provider or synced in database)
  const [balance, setBalance] = useState(0);
  const [manualBalanceInput, setManualBalanceInput] = useState("");
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceNotice, setBalanceNotice] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("Bigjay");
  const [refreshingBalance, setRefreshingBalance] = useState(false);

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
      const res = await fetch("/api/admin/netflix", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.config) {
        setApiKey(data.config.apiKey || "");
        setIsEnabled(data.config.isEnabled !== false);
        setRetailPrice(Number(data.config.retailPrice) || 25);
        setAgentBasePrice(Number(data.config.agentBasePrice) || 18);
        if (data.wholesale_cost !== undefined) {
          setWholesaleCost(Number(data.wholesale_cost));
        }
        const liveBal = Number(data.balance ?? 0);
        setBalance(liveBal);
        setManualBalanceInput(liveBal > 0 ? liveBal.toFixed(2) : "0.00");
        setPartnerName(data.partner_name || "Bigjay");
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load Netflix admin data:", err);
    } finally {
      setLoading(false);
      setRefreshingBalance(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefreshBalance = async () => {
    setRefreshingBalance(true);
    await loadData();
  };

  const handleSaveManualBalance = async () => {
    const num = parseFloat(manualBalanceInput);
    if (isNaN(num) || num < 0) return;
    setSavingBalance(true);
    try {
      const res = await fetch("/api/admin/netflix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_balance",
          netflix_balance: num,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBalance(num);
        setIsAdjustingBalance(false);
        setBalanceNotice("Wallet balance successfully synced and updated!");
        setTimeout(() => setBalanceNotice(null), 4000);
      }
    } catch (err: any) {
      console.error("Failed to update balance:", err);
    } finally {
      setSavingBalance(false);
    }
  };

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
      if (data.success && data.balance !== undefined) {
        const b = Number(data.balance);
        setBalance(b);
        setManualBalanceInput(b.toFixed(2));
      }
      if (data.partner) {
        setPartnerName(data.partner);
      }
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
              <div className="p-4 rounded-2xl bg-black/40 border border-red-500/40 text-center min-w-[140px] shadow-lg">
                <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Netflix Balance
                </div>
                <div className="text-xl font-black text-white font-mono mt-0.5">GH₵ {balance.toFixed(2)}</div>
                <div className="text-[10px] text-slate-400 font-medium">~{wholesaleCost > 0 ? Math.floor(balance / wholesaleCost) : 0} accounts ({partnerName})</div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-red-900/30 text-center min-w-[130px]">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Wholesale Rate</div>
                <div className="text-xl font-black text-red-400 mt-0.5">GH₵ {wholesaleCost.toFixed(2)}</div>
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
                    <p className="text-xs text-slate-400">Partner: {partnerName} • Rate: GH₵ {wholesaleCost.toFixed(2)} / 30-day</p>
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

            {/* Card 1.5: Data1 Live Reseller Wallet Balance */}
            <div className="rounded-3xl bg-slate-900/90 border border-red-500/30 p-6 sm:p-7 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      Data1 Partner Wallet
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </h2>
                    <p className="text-xs text-slate-400">Live balance from Data1 gateway (GH₵ 15 wholesale per order)</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshBalance}
                  disabled={refreshingBalance}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50"
                  title="Refresh Live Balance from Data1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingBalance ? "animate-spin text-red-400" : "text-slate-400"}`} />
                  <span>{refreshingBalance ? "Checking..." : "Refresh"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Wallet Balance</div>
                  <div className="text-2xl font-black text-red-400 font-mono">
                    GH₵ {balance.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Provider: Data1</div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Available</div>
                  <div className="text-2xl font-black text-white font-mono">
                    ~{wholesaleCost > 0 ? Math.floor(balance / wholesaleCost) : 0}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">30-day Netflix accounts</div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Partner Profile</div>
                  <div className="text-xl font-black text-emerald-400 truncate mt-0.5">
                    {partnerName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Wholesale GH₵ 15 / acc</div>
                </div>
              </div>

              {/* Live & Manual Sync Balance Toolbar */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  {balanceNotice ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      {balanceNotice}
                    </span>
                  ) : (
                    <span>Provider balance syncs automatically. You can also manually adjust or set your funded balance:</span>
                  )}
                </div>

                {!isAdjustingBalance ? (
                  <button
                    type="button"
                    onClick={() => {
                      setManualBalanceInput(balance > 0 ? balance.toFixed(2) : "");
                      setIsAdjustingBalance(true);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow"
                  >
                    <Wallet className="w-3.5 h-3.5 text-red-400" />
                    <span>Set Exact Balance</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">GH₵</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        value={manualBalanceInput}
                        onChange={(e) => setManualBalanceInput(e.target.value)}
                        className="w-32 pl-11 pr-2 py-1.5 bg-slate-950 border border-red-500/60 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-bold"
                        placeholder="150.00"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveManualBalance}
                      disabled={savingBalance}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {savingBalance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdjustingBalance(false)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Top-ups and balance funding are credited directly by the provider (Data1). Whenever you fund your Data1 account, your updated balance reflects here automatically.
              </p>
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
