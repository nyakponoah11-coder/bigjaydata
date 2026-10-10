"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Store,
  Power,
  DollarSign,
  Package,
  Users,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  Lock,
} from "lucide-react";

export default function AdminAgentStorePage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{
    is_enabled: boolean;
    registration_fee: number;
    developer_master_enabled?: boolean;
    admin_enabled?: boolean;
  }>({ is_enabled: true, registration_fee: 0 });
  const [baseProducts, setBaseProducts] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "agents" | "withdrawals" | "orders">("products");

  // Form states
  const [regFeeInput, setRegFeeInput] = useState<string>("0");
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Product modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNetwork, setNewNetwork] = useState("mtn");
  const [newSize, setNewSize] = useState("");
  const [newBasePrice, setNewBasePrice] = useState("");
  const [newSuggestedPrice, setNewSuggestedPrice] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // Edit product
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBasePrice, setEditBasePrice] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/agent-store");
      const data = await res.json();
      if (data.success) {
        setConfig(data.config || { is_enabled: true, registration_fee: 0 });
        setRegFeeInput(String(data.config?.registration_fee || 0));
        setBaseProducts(data.baseProducts || []);
        setAgents(data.agents || []);
        setWithdrawals(data.withdrawals || []);
        setOrders(data.orders || []);
      }
    } catch (err: any) {
      setError("Failed to load agent store details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleSystem = async () => {
    try {
      setUpdatingConfig(true);
      setError("");
      const nextState = !config.is_enabled;
      const res = await fetch("/api/admin/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_config", is_enabled: nextState }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update status");
      }
      setConfig(data.config);
      setNotice(`Agent Store system turned ${nextState ? "ON" : "OFF"}`);
      setTimeout(() => setNotice(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingConfig(true);
      const feeNum = parseFloat(regFeeInput) || 0;
      const res = await fetch("/api/admin/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_config", registration_fee: feeNum }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setNotice(`Registration fee set to GHS ${feeNum.toFixed(2)}`);
        setTimeout(() => setNotice(""), 3000);
      }
    } catch (err) {
      setError("Failed to save fee");
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleToggleAgent = async (agentId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_agent", agent_id: agentId, is_active: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, is_active: !currentStatus } : a)));
      }
    } catch (err) {
      setError("Failed to update agent");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProduct(true);
      const res = await fetch("/api/admin/agent-store/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: newNetwork,
          size: newSize,
          base_price: parseFloat(newBasePrice),
          suggested_price: parseFloat(newSuggestedPrice || newBasePrice),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBaseProducts((prev) => [...prev, data.product]);
        setIsAddModalOpen(false);
        setNewSize("");
        setNewBasePrice("");
        setNewSuggestedPrice("");
      }
    } catch (err) {
      setError("Failed to save product");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateProductPrice = async (id: string) => {
    try {
      const numPrice = parseFloat(editBasePrice);
      if (isNaN(numPrice) || numPrice <= 0) return;
      const res = await fetch("/api/admin/agent-store/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, base_price: numPrice }),
      });
      const data = await res.json();
      if (data.success) {
        setBaseProducts((prev) => prev.map((p) => (p.id === id ? data.product : p)));
        setEditingId(null);
      }
    } catch (err) {
      setError("Failed to update price");
    }
  };

  const handleWithdrawalStatus = async (id: string, status: "completed" | "rejected") => {
    try {
      const res = await fetch("/api/admin/agent-store/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawals((prev) => prev.map((w) => (w.id === id ? data.withdrawal : w)));
        fetchData(); // refresh balances
      }
    } catch (err) {
      setError("Failed to update withdrawal");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Store className="w-3.5 h-3.5" />
              Agent Multi-Store Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Agent Store Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure wholesale base pricing, toggle network operations, and oversee agent sales & payouts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href="/agent/register"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors"
            >
              <span>Agent Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            </a>
          </div>
        </div>

        {/* Notices */}
        {notice && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Master Controls: System ON/OFF & Registration Fee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* System ON/OFF Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
            {config.developer_master_enabled === false && (
              <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-600/40 text-amber-300 text-xs flex items-center gap-2.5">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Master Key Locked:</strong> The Agent Store network is locked by the Developer Master License. The admin cannot enable this feature until it is unlocked by the developer.
                </span>
              </div>
            )}

            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Global System Switch
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Agent Store System Status
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {config.developer_master_enabled === false
                    ? "Locked by Developer Master License key. Switch is disabled."
                    : config.is_enabled
                    ? "Agent stores and registration are LIVE. Agents and customers can place orders."
                    : "Agent stores are PAUSED. Frontends show temporary maintenance."}
                </p>
              </div>

              <button
                onClick={handleToggleSystem}
                disabled={updatingConfig || config.developer_master_enabled === false}
                title={config.developer_master_enabled === false ? "Locked by developer" : "Toggle switch"}
                className={`relative inline-flex h-9 w-16 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.developer_master_enabled === false
                    ? "bg-slate-800 opacity-60 cursor-not-allowed"
                    : config.is_enabled
                    ? "bg-emerald-600 cursor-pointer"
                    : "bg-slate-700 cursor-pointer"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    config.is_enabled ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Status:</span>
              <span
                className={`font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  config.developer_master_enabled === false
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : config.is_enabled
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {config.developer_master_enabled === false
                  ? "Master License Locked"
                  : config.is_enabled
                  ? "Online & Active"
                  : "Offline / Disabled"}
              </span>
            </div>
          </div>

          {/* Registration Fee Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Agent Onboarding
            </span>
            <h3 className="text-lg font-black text-white mt-1">
              Registration Fee (GHS)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Set the one-time signup fee agents must pay via Paystack to open their store. Set to 0 for free registration.
            </p>

            <form onSubmit={handleSaveFee} className="mt-4 flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                  GHS
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={regFeeInput}
                  onChange={(e) => setRegFeeInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>
              <button
                type="submit"
                disabled={updatingConfig}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0"
              >
                {updatingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Fee"}
              </button>
            </form>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 overflow-x-auto gap-2">
          {[
            { id: "products", label: "Agent Base Pricing", icon: Package, count: baseProducts.length },
            { id: "agents", label: "Registered Agents", icon: Users, count: agents.length },
            { id: "withdrawals", label: "Payout Requests", icon: Wallet, count: withdrawals.filter((w) => w.status === "pending").length },
            { id: "orders", label: "Store Orders", icon: TrendingUp, count: orders.length },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-bold rounded-t-2xl border-b-2 transition-all shrink-0 ${
                  active
                    ? "border-emerald-500 text-white bg-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-emerald-400" : ""}`} />
                <span>{t.label}</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Base Products & Pricing */}
        {activeTab === "products" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Agent Base Cost Pricing</h3>
                <p className="text-xs text-slate-400">
                  This is the cost price charged to the agent per bundle. Any markup they charge above this price is their profit.
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start"
              >
                <Plus className="w-4 h-4" />
                Add Base Product
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-4">Network</th>
                    <th className="py-3 px-4">Package Size</th>
                    <th className="py-3 px-4">Admin Base Cost (GHS)</th>
                    <th className="py-3 px-4">Suggested Retail (GHS)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {baseProducts.map((p) => {
                    const isEditing = editingId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-[10px] ${
                              p.network.toLowerCase() === "mtn"
                                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                : p.network.toLowerCase() === "telecel"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {p.network}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">{p.size}</td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.1"
                                value={editBasePrice}
                                onChange={(e) => setEditBasePrice(e.target.value)}
                                className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                              />
                              <button
                                onClick={() => handleUpdateProductPrice(p.id)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 bg-slate-700 text-slate-300 rounded-lg text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono font-black text-amber-300 text-sm">
                              GHS {Number(p.base_price).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          GHS {Number(p.suggested_price || p.base_price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingId(p.id);
                                setEditBasePrice(String(p.base_price));
                              }}
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                            >
                              Edit Base Price
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Registered Agents */}
        {activeTab === "agents" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Registered Agents</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">Store Name & Link</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Wallet Balance</th>
                    <th className="py-3 px-4">Total Earned</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {agents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No registered agents yet. Agents can register at{" "}
                        <a href="/agent/register" target="_blank" className="text-emerald-400 underline">
                          /agent/register
                        </a>
                      </td>
                    </tr>
                  ) : (
                    agents.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{a.name}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-200">{a.store_name}</div>
                          <a
                            href={`/store/${a.store_slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline font-mono"
                          >
                            <span>/store/{a.store_slug}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          <div>{a.phone}</div>
                          <div className="text-[10px] text-slate-500">{a.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-400 text-sm">
                          GHS {Number(a.wallet_balance || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          GHS {Number(a.total_earned || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleAgent(a.id, a.is_active)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              a.is_active
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {a.is_active ? "Active" : "Suspended"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Withdrawal Requests */}
        {activeTab === "withdrawals" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Agent Withdrawal Requests</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Agent</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">MoMo Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No withdrawal requests found.
                      </td>
                    </tr>
                  ) : (
                    withdrawals.map((w) => {
                      const agent = agents.find((a) => a.id === w.agent_id);
                      return (
                        <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(w.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            {agent ? agent.store_name : w.agent_id}
                          </td>
                          <td className="py-3 px-4 font-mono font-black text-amber-300 text-sm">
                            GHS {Number(w.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-bold mr-1.5">
                              {w.momo_network}
                            </span>
                            {w.momo_number}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                w.status === "completed"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : w.status === "rejected"
                                  ? "bg-rose-500/20 text-rose-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {w.status === "pending" && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleWithdrawalStatus(w.id, "completed")}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => handleWithdrawalStatus(w.id, "rejected")}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Agent Orders */}
        {activeTab === "orders" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Store Sales & Profit History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Store</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Base Cost</th>
                    <th className="py-3 px-4">Agent Profit</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No agent orders placed yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const agent = agents.find((a) => a.id === o.agent_id);
                      return (
                        <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white">{o.reference}</td>
                          <td className="py-3 px-4 text-slate-300">
                            {agent ? agent.store_name : o.agent_id}
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            {o.network.toUpperCase()} {o.package_size}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">{o.phone}</td>
                          <td className="py-3 px-4 font-mono text-white">
                            GHS {Number(o.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            GHS {Number(o.base_price).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono font-black text-emerald-400">
                            +GHS {Number(o.agent_profit).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                              {o.delivery_status || o.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Base Product Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-black text-white mb-4">Add Agent Base Product</h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Network</label>
                  <select
                    value={newNetwork}
                    onChange={(e) => setNewNetwork(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold"
                  >
                    <option value="mtn">MTN</option>
                    <option value="telecel">Telecel</option>
                    <option value="at">AT (AirtelTigo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Package Size</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1GB, 2GB, 5GB"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Admin Base Cost (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 4.00"
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Suggested Retail Price (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.50"
                    value={newSuggestedPrice}
                    onChange={(e) => setNewSuggestedPrice(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    {savingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Product"}
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
