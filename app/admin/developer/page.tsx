"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Code,
  Power,
  ShieldCheck,
  Key,
  Users,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Sliders,
  DollarSign,
  TrendingUp,
  Package,
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
  created_at: string;
}

interface DeveloperAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  api_key: string;
  balance: number;
  total_spent: number;
  total_orders: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminDeveloperPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<DeveloperConfig | null>(null);
  const [products, setProducts] = useState<DeveloperProduct[]>([]);
  const [accounts, setAccounts] = useState<DeveloperAccount[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pricing" | "accounts" | "orders" | "settings">("pricing");

  // Notifications
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Master switch toggling state
  const [togglingMaster, setTogglingMaster] = useState(false);

  // Pricing editing state
  const [networkFilter, setNetworkFilter] = useState("all");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState<string>("");
  const [editingCostVal, setEditingCostVal] = useState<string>("");
  const [savingPrice, setSavingPrice] = useState(false);

  // Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newNetwork, setNewNetwork] = useState("mtn");
  const [newSize, setNewSize] = useState("");
  const [newCostPrice, setNewCostPrice] = useState("");
  const [newApiPrice, setNewApiPrice] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Fund Wallet Modal
  const [fundingAccount, setFundingAccount] = useState<DeveloperAccount | null>(null);
  const [fundingAmount, setFundingAmount] = useState<string>("");
  const [fundingNote, setFundingNote] = useState<string>("");
  const [processingFund, setProcessingFund] = useState(false);

  // Key visibility toggles
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Search accounts
  const [accountSearch, setAccountSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/developer", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setProducts(data.products || []);
        setAccounts(data.accounts || []);
        setOrders(data.recent_orders || []);
      }
    } catch (err: any) {
      setNotice({ type: "error", message: "Failed to connect to developer management backend." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // 1. Toggle Master Switch
  const handleToggleMaster = async () => {
    if (!config) return;
    const newState = !config.is_enabled;
    const confirmMsg = newState
      ? "Turn ON Developer API? Developers will be able to access the API Portal, generate keys, and make API purchases."
      : "Turn OFF Developer API? When disabled, the public developer page will display 'Coming Soon' and all live API requests will return 403 Forbidden.";

    if (!window.confirm(confirmMsg)) return;

    setTogglingMaster(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          is_enabled: newState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        showNotification(
          "success",
          newState
            ? "Developer API is now LIVE and active!"
            : "Developer API paused. Public portal now displays 'Coming Soon'."
        );
      } else {
        showNotification("error", data.message || "Failed to toggle switch.");
      }
    } catch {
      showNotification("error", "Error connecting to server.");
    } finally {
      setTogglingMaster(false);
    }
  };

  // 2. Save Settings (API Key Price, etc.)
  const [savingSettings, setSavingSettings] = useState(false);
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          api_key_price: Number(config.api_key_price || 0),
          min_wallet_funding: Number(config.min_wallet_funding || 10),
          notice_message: config.notice_message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        showNotification("success", "API settings and key pricing saved successfully!");
      } else {
        showNotification("error", data.message || "Failed to update settings.");
      }
    } catch {
      showNotification("error", "Server error saving settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // 3. Save Product Price
  const handleSavePrice = async (id: string) => {
    const numPrice = parseFloat(editingPriceVal);
    if (isNaN(numPrice) || numPrice <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    const numCost = editingCostVal ? parseFloat(editingCostVal) : undefined;

    setSavingPrice(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_product_price",
          id,
          api_price: numPrice,
          cost_price: numCost,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.map((p) => (p.id === id ? data.product : p)));
        setEditingPriceId(null);
        showNotification("success", "API product price updated.");
      } else {
        showNotification("error", data.message || "Failed to update price.");
      }
    } catch {
      showNotification("error", "Server communication error.");
    } finally {
      setSavingPrice(false);
    }
  };

  // 4. Toggle Product Active
  const handleToggleProduct = async (id: string) => {
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_product", id }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.map((p) => (p.id === id ? data.product : p)));
        showNotification("success", "Product availability updated.");
      }
    } catch {
      showNotification("error", "Error toggling product.");
    }
  };

  // 5. Add Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSize.trim() || !newApiPrice.trim()) return;

    setCreatingProduct(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_product",
          network: newNetwork,
          size: newSize.trim(),
          cost_price: parseFloat(newCostPrice) || 0,
          api_price: parseFloat(newApiPrice),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => [...prev, data.product]);
        setShowAddProductModal(false);
        setNewSize("");
        setNewCostPrice("");
        setNewApiPrice("");
        showNotification("success", "New API product package created!");
      } else {
        showNotification("error", data.message || "Failed to create product.");
      }
    } catch {
      showNotification("error", "Failed to create product.");
    } finally {
      setCreatingProduct(false);
    }
  };

  // 6. Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this API product?")) return;
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_product", id }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showNotification("success", "Product deleted.");
      }
    } catch {
      showNotification("error", "Failed to delete product.");
    }
  };

  // 7. Fund / Credit Developer Wallet
  const handleCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundingAccount || !fundingAmount) return;
    const numAmount = parseFloat(fundingAmount);
    if (isNaN(numAmount) || numAmount === 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setProcessingFund(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "credit_wallet",
          account_id: fundingAccount.id,
          amount: numAmount,
          note: fundingNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === fundingAccount.id ? { ...a, balance: data.new_balance } : a))
        );
        showNotification("success", data.message || "Wallet updated successfully.");
        setFundingAccount(null);
        setFundingAmount("");
        setFundingNote("");
      } else {
        showNotification("error", data.message || "Failed to update wallet.");
      }
    } catch {
      showNotification("error", "Server communication error.");
    } finally {
      setProcessingFund(false);
    }
  };

  // 8. Toggle Developer Suspended / Active
  const handleToggleAccount = async (id: string) => {
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_account", account_id: id }),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts((prev) => prev.map((a) => (a.id === id ? data.account : a)));
        showNotification("success", data.message);
      }
    } catch {
      showNotification("error", "Failed to update account status.");
    }
  };

  // 9. Delete Developer Account
  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this developer and revoke their API key?")) return;
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_account", account_id: id }),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        showNotification("success", "Developer account deleted.");
      }
    } catch {
      showNotification("error", "Failed to delete account.");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredProducts = products.filter((p) => {
    if (networkFilter === "all") return true;
    return p.network.toLowerCase() === networkFilter.toLowerCase();
  });

  const filteredAccounts = accounts.filter((a) => {
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.phone.includes(q);
  });

  const totalDevBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Developer API Hub
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                    REST V1
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Manage API keys, custom wholesale bundle prices, wallet credits, and master switch.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
            <a
              href="/developer"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Public Portal
            </a>
          </div>
        </div>

        {/* Global Notice Toast */}
        {notice && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg animate-in fade-in ${
              notice.type === "success"
                ? "bg-emerald-950/90 text-emerald-300 border border-emerald-800"
                : "bg-red-950/90 text-red-300 border border-red-800"
            }`}
          >
            {notice.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Master Switch Hero Card */}
        {config && (
          <div
            className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-xl relative overflow-hidden ${
              config.is_enabled
                ? "bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-800/80 shadow-indigo-950/30"
                : "bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border-amber-900/60 shadow-amber-950/20"
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                      config.is_enabled ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${
                      config.is_enabled ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {config.is_enabled ? "Developer API Gateway: Active" : "Developer API Gateway: Paused (Coming Soon)"}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {config.is_enabled
                    ? "API Gateway is Live for Developers"
                    : "API Access is Paused by Admin"}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {config.is_enabled
                    ? "Developers can generate secret API keys, check balances, and automate data fulfillment via REST endpoints. All purchases deduct from developer wallets."
                    : "The public developer portal at /developer currently displays the 'Coming Soon' maintenance banner. Programmatic API calls return 403 Forbidden until turned on."}
                </p>
              </div>

              {/* Master Power Toggle */}
              <button
                onClick={handleToggleMaster}
                disabled={togglingMaster}
                className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 shadow-xl transition-all transform active:scale-95 shrink-0 ${
                  config.is_enabled
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                {togglingMaster ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className={`w-4 h-4 ${config.is_enabled ? "text-white" : "text-amber-400"}`} />
                )}
                <span>{config.is_enabled ? "Master Switch: ON" : "Master Switch: OFF"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Registered Developers</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">{accounts.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Active programmatic accounts</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Developer Balance</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              GHS {totalDevBalance.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Pre-funded wallet funds</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">API Orders</span>
              <TrendingUp className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{orders.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Attributed to API keys</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">API Key Price</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {config?.api_key_price ? `GHS ${config.api_key_price.toFixed(2)}` : "Free (GHS 0)"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Issuance / access price</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto pb-1">
          {[
            { id: "pricing", label: "API Custom Pricing", icon: Package, badge: products.length },
            { id: "accounts", label: "Developers & API Keys", icon: Key, badge: accounts.length },
            { id: "orders", label: "API Orders Feed", icon: TrendingUp, badge: orders.length },
            { id: "settings", label: "API Key Price & Settings", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-indigo-950 text-indigo-300" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: API CUSTOM PRICING */}
        {activeTab === "pricing" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-white">Wholesale / API Pricing Management</h3>
                <p className="text-xs text-slate-400">
                  Set custom prices for API consumers. When developers buy via API, they will be billed these exact rates.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Networks</option>
                  <option value="mtn">MTN Ghana</option>
                  <option value="telecel">Telecel Ghana</option>
                  <option value="at">AT (AirtelTigo)</option>
                </select>

                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add API Bundle
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 pl-5">Network</th>
                      <th className="py-3.5">Bundle Size</th>
                      <th className="py-3.5">DataMart Cost</th>
                      <th className="py-3.5">API Selling Price (GHS)</th>
                      <th className="py-3.5">Profit per Order</th>
                      <th className="py-3.5">Status</th>
                      <th className="py-3.5 text-right pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No API products configured. Click "Add API Bundle" to get started.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const isEditing = editingPriceId === p.id;
                        const profit = (p.api_price || 0) - (p.cost_price || 0);

                        return (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 pl-5">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                                  p.network.toLowerCase() === "mtn"
                                    ? "bg-amber-950 text-amber-300 border border-amber-800"
                                    : p.network.toLowerCase() === "telecel"
                                    ? "bg-red-950 text-red-300 border border-red-800"
                                    : "bg-blue-950 text-blue-300 border border-blue-800"
                                }`}
                              >
                                {p.network}
                              </span>
                            </td>
                            <td className="py-3.5 font-bold text-white text-sm">{p.size}</td>
                            <td className="py-3.5 font-mono text-slate-400">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editingCostVal}
                                  onChange={(e) => setEditingCostVal(e.target.value)}
                                  className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : (
                                `GHS ${p.cost_price?.toFixed(2) || "0.00"}`
                              )}
                            </td>
                            <td className="py-3.5">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingPriceVal}
                                    onChange={(e) => setEditingPriceVal(e.target.value)}
                                    className="w-24 px-2 py-1 bg-slate-800 border border-indigo-500 rounded-lg text-white font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSavePrice(p.id)}
                                    disabled={savingPrice}
                                    className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs"
                                    title="Save"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPriceId(null)}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-indigo-400 text-sm">
                                    GHS {p.api_price.toFixed(2)}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingPriceId(p.id);
                                      setEditingPriceVal(p.api_price.toString());
                                      setEditingCostVal((p.cost_price || 0).toString());
                                    }}
                                    className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                                    title="Quick Edit Price"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 font-mono">
                              <span
                                className={`text-xs font-semibold ${
                                  profit >= 0 ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                {profit >= 0 ? "+" : ""}GHS {profit.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <button
                                onClick={() => handleToggleProduct(p.id)}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                                  p.is_active
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900/60"
                                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                                }`}
                              >
                                {p.is_active ? "Active" : "Disabled"}
                              </button>
                            </td>
                            <td className="py-3.5 text-right pr-5">
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEVELOPERS & API KEYS */}
        {activeTab === "accounts" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-white">Registered API Developers</h3>
                <p className="text-xs text-slate-400">
                  Developers verified via 6-digit OTP. You can credit or debit their wallet balances, copy keys, or suspend access.
                </p>
              </div>

              <div className="w-full sm:w-64 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  placeholder="Search Name, Email, Phone..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Developers Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 pl-5">Developer</th>
                      <th className="py-3.5">Contact</th>
                      <th className="py-3.5">API Key</th>
                      <th className="py-3.5">Wallet Balance</th>
                      <th className="py-3.5">Total Orders</th>
                      <th className="py-3.5">Status</th>
                      <th className="py-3.5 text-right pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No developer accounts registered yet.
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((a) => {
                        const isVisible = visibleKeys[a.id];
                        const isCopied = copiedKey === a.id;

                        return (
                          <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 pl-5">
                              <div className="font-bold text-white text-sm">{a.name}</div>
                              <div className="text-[10px] text-slate-400">ID: {a.id}</div>
                            </td>
                            <td className="py-3.5">
                              <div className="text-slate-300 font-medium">{a.email}</div>
                              <div className="text-slate-400 font-mono text-[11px]">{a.phone}</div>
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-lg w-fit">
                                <span className="font-mono text-[11px] text-indigo-300">
                                  {isVisible ? a.api_key : `${a.api_key.substring(0, 11)}••••••••••••`}
                                </span>
                                <button
                                  onClick={() => setVisibleKeys((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                                  className="text-slate-500 hover:text-slate-300 ml-1"
                                  title={isVisible ? "Hide Key" : "Show Key"}
                                >
                                  {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(a.api_key, a.id)}
                                  className="text-slate-500 hover:text-indigo-400 ml-0.5"
                                  title="Copy Key"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-emerald-400 text-sm">
                                  GHS {a.balance?.toFixed(2) || "0.00"}
                                </span>
                                <button
                                  onClick={() => {
                                    setFundingAccount(a);
                                    setFundingAmount("");
                                    setFundingNote("");
                                  }}
                                  className="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-md text-[10px] font-bold"
                                  title="Credit or Debit Balance"
                                >
                                  + Fund Wallet
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 font-mono text-slate-300">
                              {a.total_orders || 0}
                            </td>
                            <td className="py-3.5">
                              <button
                                onClick={() => handleToggleAccount(a.id)}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                                  a.is_active
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                    : "bg-red-950 text-red-400 border border-red-800"
                                }`}
                              >
                                {a.is_active ? "Active" : "Suspended"}
                              </button>
                            </td>
                            <td className="py-3.5 text-right pr-5">
                              <button
                                onClick={() => handleDeleteAccount(a.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                                title="Delete Developer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: API ORDERS FEED */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Live API Orders Feed</h3>
                <p className="text-xs text-slate-400">
                  All automated data bundle orders submitted via Developer API Keys.
                </p>
              </div>
              <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-950 px-3 py-1 rounded-xl border border-indigo-800">
                {orders.length} API Orders
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 pl-5">Order Reference</th>
                      <th className="py-3.5">Developer</th>
                      <th className="py-3.5">Network & Size</th>
                      <th className="py-3.5">Recipient</th>
                      <th className="py-3.5">Amount Billed</th>
                      <th className="py-3.5">Delivery Status</th>
                      <th className="py-3.5 text-right pr-5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No API orders have been submitted yet.
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 pl-5 font-mono font-bold text-white">
                            <div className="flex flex-col gap-1 items-start">
                              <span>{o.reference}</span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700/80">
                                ⚡ API Key
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className="font-bold text-indigo-300">
                              {o.developer_name || o.datamart_response?.developer_name || "API Developer"}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className="font-bold uppercase text-white">
                              {o.network} - {o.package_size}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono text-slate-300">{o.phone}</td>
                          <td className="py-3.5 font-bold font-mono text-emerald-400">
                            GHS {Number(o.amount).toFixed(2)}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                o.delivery_status === "delivered" || o.status === "delivered"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                  : o.delivery_status === "failed" || o.status === "failed"
                                  ? "bg-red-950 text-red-400 border border-red-800"
                                  : "bg-amber-950 text-amber-400 border border-amber-800"
                              }`}
                            >
                              {o.delivery_status || o.status || "processing"}
                            </span>
                          </td>
                          <td className="py-3.5 text-right pr-5 text-slate-400">
                            {new Date(o.created_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: API KEY PRICE & SETTINGS */}
        {activeTab === "settings" && config && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl max-w-2xl">
            <h3 className="text-base font-black text-white mb-1">Developer API Configuration</h3>
            <p className="text-xs text-slate-400 mb-6">
              Configure access fees, wallet top-up parameters, and public notices.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* API Key Price */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  API Key Generation Price (GHS)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs font-mono text-slate-400">GHS</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.api_key_price}
                    onChange={(e) => setConfig({ ...config, api_key_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00 (Leave 0 for free API keys)"
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Set to 0 to offer free instant API keys. If set above 0, the price is shown to developers before issuance.
                </p>
              </div>

              {/* Minimum Wallet Top-up */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Minimum Wallet Funding Amount (GHS)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs font-mono text-slate-400">GHS</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={config.min_wallet_funding}
                    onChange={(e) => setConfig({ ...config, min_wallet_funding: parseFloat(e.target.value) || 10 })}
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Notice Message */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Public Developer Notice (Optional)
                </label>
                <textarea
                  rows={3}
                  value={config.notice_message || ""}
                  onChange={(e) => setConfig({ ...config, notice_message: e.target.value })}
                  placeholder="Welcome to FastData High-Speed Telecom API..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save API Configuration
              </button>
            </form>
          </div>
        )}

        {/* MODAL: FUND DEVELOPER WALLET */}
        {fundingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-black text-white text-base">Credit Developer Wallet</h3>
                </div>
                <button
                  onClick={() => setFundingAccount(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl space-y-1">
                <div className="text-xs text-slate-400 font-semibold">Developer:</div>
                <div className="text-sm font-bold text-white">{fundingAccount.name}</div>
                <div className="text-xs text-slate-400">{fundingAccount.email} • {fundingAccount.phone}</div>
                <div className="text-xs text-emerald-400 font-mono font-bold pt-1">
                  Current Balance: GHS {fundingAccount.balance?.toFixed(2) || "0.00"}
                </div>
              </div>

              <form onSubmit={handleCreditWallet} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Amount to Credit (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={fundingAmount}
                    onChange={(e) => setFundingAmount(e.target.value)}
                    placeholder="e.g. 50.00 (or -10 to debit)"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter a positive amount to credit the wallet, or negative to debit.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Admin Note / MoMo Transaction ID
                  </label>
                  <input
                    type="text"
                    value={fundingNote}
                    onChange={(e) => setFundingNote(e.target.value)}
                    placeholder="e.g. MoMo transfer received via MTN 059..."
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFundingAccount(null)}
                    className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingFund}
                    className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30"
                  >
                    {processingFund ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                    Confirm Top-Up
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD API PRODUCT */}
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-black text-white text-base">Add New API Bundle</h3>
                </div>
                <button
                  onClick={() => setShowAddProductModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Network
                  </label>
                  <select
                    value={newNetwork}
                    onChange={(e) => setNewNetwork(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="mtn">MTN Ghana</option>
                    <option value="telecel">Telecel Ghana</option>
                    <option value="at">AT (AirtelTigo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Bundle Size
                  </label>
                  <input
                    type="text"
                    required
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="e.g. 5GB or 10GB or 500MB"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                      Cost Price (GHS)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value)}
                      placeholder="e.g. 21.00"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                      API Price (GHS)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newApiPrice}
                      onChange={(e) => setNewApiPrice(e.target.value)}
                      placeholder="e.g. 23.00"
                      className="w-full px-3 py-2 bg-slate-800 border border-indigo-500 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
                    className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProduct}
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
                  >
                    {creatingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Package
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
