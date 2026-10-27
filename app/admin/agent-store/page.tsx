"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { getDeliveryStatusConfig } from "@/lib/delivery-status";
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
  KeyRound,
  Trash2,
  Ban,
  Edit2,
  Zap,
  RotateCcw,
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
  const [productNetworkFilter, setProductNetworkFilter] = useState<string>("all");

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
  const [editSuggestedPrice, setEditSuggestedPrice] = useState("");

  // Delete product modal
  const [deleteProductModal, setDeleteProductModal] = useState<{
    open: boolean;
    productId: string;
    network: string;
    size: string;
    basePrice: number;
    loading: boolean;
  }>({
    open: false,
    productId: "",
    network: "",
    size: "",
    basePrice: 0,
    loading: false,
  });

  // Agent Management Modals
  const [resetModal, setResetModal] = useState<{
    open: boolean;
    agentId: string;
    agentName: string;
    agentEmail: string;
    newPass: string;
    loading: boolean;
  }>({
    open: false,
    agentId: "",
    agentName: "",
    agentEmail: "",
    newPass: "",
    loading: false,
  });

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    agentId: string;
    agentName: string;
    loading: boolean;
  }>({
    open: false,
    agentId: "",
    agentName: "",
    loading: false,
  });

  // Register New Agent Modal State
  const [createAgentModalOpen, setCreateAgentModalOpen] = useState(false);
  const [createAgentLoading, setCreateAgentLoading] = useState(false);
  const [newAgentForm, setNewAgentForm] = useState({
    name: "",
    store_name: "",
    store_slug: "",
    email: "",
    phone: "",
    password: "",
    initial_balance: "0",
  });

  // Adjust Agent Wallet Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedAgentForAdjust, setSelectedAgentForAdjust] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Scan & Recover Old Agents State
  const [recoveringAgents, setRecoveringAgents] = useState(false);

  const handleRecoverAgents = async () => {
    if (!confirm("Run deep database scan to discover and restore all past registered agents from database records, orders, and withdrawals?")) {
      return;
    }
    try {
      setRecoveringAgents(true);
      setError("");
      const res = await fetch("/api/admin/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recover_agents" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Recovery failed");
      }
      setNotice(data.message || `Successfully recovered ${data.recovered_count || 0} agents.`);
      setTimeout(() => setNotice(""), 6000);
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Agent recovery encountered an issue");
    } finally {
      setRecoveringAgents(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentForm.name || !newAgentForm.store_name || !newAgentForm.phone) {
      alert("Please fill in Agent name, Store name, and Phone number.");
      return;
    }
    try {
      setCreateAgentLoading(true);
      const res = await fetch("/api/admin/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_agent",
          ...newAgentForm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create agent");
      }
      setNotice(data.message);
      setTimeout(() => setNotice(""), 4000);
      setCreateAgentModalOpen(false);
      setNewAgentForm({
        name: "",
        store_name: "",
        store_slug: "",
        email: "",
        phone: "",
        password: "",
        initial_balance: "0",
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to register agent");
    } finally {
      setCreateAgentLoading(false);
    }
  };

  const handleAdjustAgentWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentForAdjust) return;
    const val = Number(adjustAmount);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    const finalAmount = adjustType === "credit" ? val : -val;
    try {
      setAdjustLoading(true);
      const res = await fetch("/api/admin/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_wallet",
          agent_id: selectedAgentForAdjust.id,
          amount: finalAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to adjust balance");
      }
      setNotice(data.message);
      setTimeout(() => setNotice(""), 4000);
      setAdjustModalOpen(false);
      setSelectedAgentForAdjust(null);
      setAdjustAmount("");
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to adjust wallet");
    } finally {
      setAdjustLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/agent-store?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load agent store details");
      }
      setConfig(data.config || { is_enabled: true, registration_fee: 0 });
      setRegFeeInput(String(data.config?.registration_fee || 0));
      setBaseProducts(data.baseProducts || []);
      setAgents(data.agents || []);
      setWithdrawals(data.withdrawals || []);
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load agent store details");
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
        setNotice(data.message || (!currentStatus ? "Agent activated" : "Agent placed on suspension"));
        setTimeout(() => setNotice(""), 3500);
      }
    } catch (err) {
      setError("Failed to update agent");
    }
  };

  const handleResetAgentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModal.agentId) return;
    try {
      setResetModal((prev) => ({ ...prev, loading: true }));
      setError("");
      const res = await fetch("/api/admin/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          agent_id: resetModal.agentId,
          new_password: resetModal.newPass,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reset password");
      }
      setNotice(data.message || `Password reset successfully for ${resetModal.agentName}`);
      setResetModal({ open: false, agentId: "", agentName: "", agentEmail: "", newPass: "", loading: false });
      setTimeout(() => setNotice(""), 4500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setResetModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteAgentConfirm = async () => {
    if (!deleteModal.agentId) return;
    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));
      setError("");
      const res = await fetch("/api/admin/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_agent",
          agent_id: deleteModal.agentId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete agent");
      }
      setAgents((prev) => prev.filter((a) => a.id !== deleteModal.agentId));
      setNotice(data.message || "Agent deleted permanently.");
      setDeleteModal({ open: false, agentId: "", agentName: "", loading: false });
      setTimeout(() => setNotice(""), 4500);
    } catch (err: any) {
      setError(err.message || "Failed to delete agent");
    } finally {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProduct(true);
      setError("");
      const numBase = parseFloat(newBasePrice);
      const numSuggested = parseFloat(newSuggestedPrice || newBasePrice);
      if (isNaN(numBase) || numBase <= 0) {
        setError("Please enter a valid base price");
        return;
      }
      const res = await fetch("/api/admin/agent-store/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: newNetwork,
          size: newSize.trim(),
          base_price: numBase,
          suggested_price: !isNaN(numSuggested) && numSuggested > 0 ? numSuggested : numBase + 1.0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save base product");
      }
      setNotice(`Base product ${newNetwork.toUpperCase()} ${newSize} saved successfully!`);
      setIsAddModalOpen(false);
      setNewSize("");
      setNewBasePrice("");
      setNewSuggestedPrice("");
      await fetchData();
      setTimeout(() => setNotice(""), 3500);
    } catch (err: any) {
      setError(err?.message || "Failed to save product");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateProductPrice = async (id: string) => {
    try {
      setError("");
      const numBase = parseFloat(editBasePrice);
      const numSuggested = parseFloat(editSuggestedPrice);
      if (isNaN(numBase) || numBase <= 0) {
        setError("Please enter a valid base price");
        return;
      }
      const res = await fetch("/api/admin/agent-store/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          base_price: numBase,
          suggested_price: !isNaN(numSuggested) && numSuggested > 0 ? numSuggested : numBase + 1.0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update price");
      }
      setNotice("Base price and suggested price updated successfully");
      setEditingId(null);
      await fetchData();
      setTimeout(() => setNotice(""), 3500);
    } catch (err: any) {
      setError(err?.message || "Failed to update price");
    }
  };

  const handleDeleteProductConfirm = async () => {
    if (!deleteProductModal.productId) return;
    try {
      setDeleteProductModal((prev) => ({ ...prev, loading: true }));
      setError("");
      const res = await fetch(`/api/admin/agent-store/products?id=${encodeURIComponent(deleteProductModal.productId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete agent product/price");
      }
      setBaseProducts((prev) => prev.filter((p) => p.id !== deleteProductModal.productId));
      setNotice(`Deleted ${deleteProductModal.network.toUpperCase()} ${deleteProductModal.size} price successfully`);
      setDeleteProductModal({ open: false, productId: "", network: "", size: "", basePrice: 0, loading: false });
      await fetchData();
      setTimeout(() => setNotice(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to delete price");
    } finally {
      setDeleteProductModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const [payingPaystackId, setPayingPaystackId] = useState<string | null>(null);

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

  const handlePaystackPayout = async (id: string) => {
    const target = withdrawals.find((w) => w.id === id);
    if (!target) return;
    if (
      !confirm(
        `Are you sure you want to disburse GHS ${Number(target.amount).toFixed(2)} to ${target.momo_network.toUpperCase()} (${target.momo_number}) via live Paystack Transfer?`
      )
    ) {
      return;
    }

    try {
      setPayingPaystackId(id);
      setError("");
      setNotice("");
      const res = await fetch("/api/admin/agent-store/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "completed", pay_with_paystack: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Paystack payout failed");
      }
      setNotice(data.message || "Payout disbursed via Paystack successfully!");
      setWithdrawals((prev) => prev.map((w) => (w.id === id ? data.withdrawal : w)));
      fetchData();
      setTimeout(() => setNotice(""), 6000);
    } catch (err: any) {
      setError(err?.message || "Paystack payout failed");
    } finally {
      setPayingPaystackId(null);
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

            {/* Network Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
              {[
                { id: "all", label: "All Networks", count: baseProducts.length },
                {
                  id: "mtn",
                  label: "MTN",
                  count: baseProducts.filter((p) => p.network?.toLowerCase() === "mtn").length,
                  badge: "bg-amber-400/20 text-amber-300 border-amber-400/30",
                },
                {
                  id: "telecel",
                  label: "Telecel",
                  count: baseProducts.filter((p) => p.network?.toLowerCase() === "telecel").length,
                  badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                },
                {
                  id: "at",
                  label: "AT (AirtelTigo)",
                  count: baseProducts.filter((p) => p.network?.toLowerCase() === "at").length,
                  badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                },
              ].map((tab) => {
                const isSelected = productNetworkFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProductNetworkFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      isSelected
                        ? "bg-slate-800 text-white border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/30 font-black"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                      {tab.count}
                    </span>
                  </button>
                );
              })}
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
                  {baseProducts
                    .filter((p) => productNetworkFilter === "all" || p.network?.toLowerCase() === productNetworkFilter.toLowerCase())
                    .length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No base products found for {productNetworkFilter.toUpperCase()}.
                      </td>
                    </tr>
                  ) : (
                    baseProducts
                      .filter((p) => productNetworkFilter === "all" || p.network?.toLowerCase() === productNetworkFilter.toLowerCase())
                      .map((p) => {
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
                            <div>
                              <input
                                type="number"
                                step="0.1"
                                value={editBasePrice}
                                onChange={(e) => setEditBasePrice(e.target.value)}
                                className="w-24 bg-slate-800 border border-emerald-500/50 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                placeholder="Base Price"
                              />
                              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Admin Cost</div>
                            </div>
                          ) : (
                            <span className="font-mono font-black text-amber-300 text-sm">
                              GHS {Number(p.base_price).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div>
                              <input
                                type="number"
                                step="0.1"
                                value={editSuggestedPrice}
                                onChange={(e) => setEditSuggestedPrice(e.target.value)}
                                className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
                                placeholder="Retail Price"
                              />
                              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Suggested Retail</div>
                            </div>
                          ) : (
                            <span className="font-mono text-slate-400">
                              GHS {Number(p.suggested_price || p.base_price).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdateProductPrice(p.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow transition-all"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[11px] transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingId(p.id);
                                  setEditBasePrice(String(p.base_price));
                                  setEditSuggestedPrice(String(p.suggested_price || p.base_price));
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteProductModal({
                                    open: true,
                                    productId: p.id,
                                    network: p.network,
                                    size: p.size,
                                    basePrice: Number(p.base_price),
                                    loading: false,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
                                title="Delete Price"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Registered Agents */}
        {activeTab === "agents" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Registered Agents ({agents.length})</h3>
                <p className="text-xs text-slate-400">Manage agent accounts, credentials, wallet floats, suspension, and permissions.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleRecoverAgents}
                  disabled={recoveringAgents}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  title="Deep scan database tables, orders, and withdrawal history to restore past registered agents"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${recoveringAgents ? "animate-spin" : ""}`} />
                  <span>{recoveringAgents ? "Scanning Database..." : "Scan & Restore Old Agents"}</span>
                </button>
                <Link
                  href="/admin/registered-accounts"
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>View in Accounts Table</span>
                </Link>
                <button
                  onClick={() => setCreateAgentModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Agent</span>
                </button>
              </div>
            </div>
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
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {agents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
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
                            href={`/${a.store_slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline font-mono"
                          >
                            <span>/{a.store_slug}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          <div>{a.phone}</div>
                          <div className="text-[10px] text-slate-500">{a.email}</div>
                          <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400 font-bold border border-slate-700">
                            <span>PIN:</span>
                            <span className="text-white">{a.password_hash || "123456"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-400 text-sm">
                          GHS {Number(a.wallet_balance || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          GHS {Number(a.total_earned || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              a.is_active
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {a.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Adjust Wallet Balance */}
                            <button
                              onClick={() => {
                                setSelectedAgentForAdjust(a);
                                setAdjustAmount("");
                                setAdjustType("credit");
                                setAdjustModalOpen(true);
                              }}
                              title="Add or Deduct Agent Wallet Balance"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 border border-slate-700 transition-colors"
                            >
                              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() =>
                                setResetModal({
                                  open: true,
                                  agentId: a.id,
                                  agentName: a.name,
                                  agentEmail: a.email,
                                  newPass: "",
                                  loading: false,
                                Sha: "",
                                } as any)
                              }
                              title="Reset Password & Email Agent"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-400 border border-slate-700 transition-colors"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Finances / Test Data */}
                            <button
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Reset all orders, withdrawals, and balances for "${a.name}" (${a.store_name}) to fresh GHS 0.00?`
                                  )
                                ) {
                                  try {
                                    const res = await fetch("/api/admin/agent-store", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "reset_finances", agent_id: a.id }),
                                    });
                                    const d = await res.json();
                                    if (d.success) {
                                      alert(d.message);
                                      fetchData();
                                    } else {
                                      alert(d.message || "Failed to reset finances");
                                    }
                                  } catch (e: any) {
                                    alert(e.message);
                                  }
                                }
                              }}
                              title="Reset Finances & Test Transactions to GHS 0.00"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 border border-slate-700 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* Suspend / Reactivate */}
                            <button
                              onClick={() => handleToggleAgent(a.id, a.is_active)}
                              title={a.is_active ? "Put Agent on Suspension" : "Reactivate Agent Account"}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                a.is_active
                                  ? "bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border-slate-700"
                                  : "bg-slate-800 hover:bg-emerald-500/20 text-rose-400 hover:text-emerald-400 border-rose-800/40"
                              }`}
                            >
                              {a.is_active ? <Ban className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete Agent */}
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  open: true,
                                  agentId: a.id,
                                  agentName: a.name,
                                  loading: false,
                                })
                              }
                              title="Delete Agent Permanently"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                            {w.paystack_transfer_code && (
                              <div className="text-[9px] text-blue-400 font-mono mt-0.5 font-normal">
                                {w.paystack_transfer_code}
                              </div>
                            )}
                            {w.note && !w.paystack_transfer_code && (
                              <div className="text-[9px] text-slate-500 truncate max-w-[120px] mt-0.5" title={w.note}>
                                {w.note}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {w.status === "pending" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  disabled={payingPaystackId === w.id}
                                  onClick={() => handlePaystackPayout(w.id)}
                                  className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all"
                                  title="Send instant payout via Paystack Transfer API"
                                >
                                  {payingPaystackId === w.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3 h-3 text-amber-300" />
                                      Pay via Paystack
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleWithdrawalStatus(w.id, "completed")}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-colors"
                                  title="Mark as paid manually"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => handleWithdrawalStatus(w.id, "rejected")}
                                  className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                                  title="Reject and refund agent balance"
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
                            {(() => {
                              const stCfg = getDeliveryStatusConfig(o.delivery_status || o.status);
                              return (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${stCfg.badgeClass}`}>
                                  {stCfg.label}
                                </span>
                              );
                            })()}
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
        {/* Reset Password Modal */}
        {resetModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Reset Agent Password</h3>
                    <p className="text-[11px] text-slate-400">{resetModal.agentName} ({resetModal.agentEmail})</p>
                  </div>
                </div>
                <button
                  onClick={() => setResetModal((prev) => ({ ...prev, open: false }))}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleResetAgentPassword} className="mt-4 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter a new password or PIN below, or leave blank to auto-generate a secure 6-digit PIN. The new credentials will be <strong>automatically emailed</strong> to <span className="text-amber-400">{resetModal.agentEmail}</span>.
                </p>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    New Password / PIN (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 849201 (or leave blank to auto-generate)"
                      value={resetModal.newPass}
                      onChange={(e) => setResetModal((prev) => ({ ...prev, newPass: e.target.value }))}
                      className="flex-1 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setResetModal((prev) => ({
                          ...prev,
                          newPass: Math.floor(100000 + Math.random() * 900000).toString(),
                        }))
                      }
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModal((prev) => ({ ...prev, open: false }))}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetModal.loading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {resetModal.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset & Email"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Agent Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-rose-900/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Delete Agent Account</h3>
                  <p className="text-[11px] text-rose-400 font-bold">Permanent Deletion Warning</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-white">{deleteModal.agentName}</strong>?
                </p>

                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[11px] text-rose-300 space-y-1">
                  <div>• Their partner storefront will be immediately removed.</div>
                  <div>• All custom bundle markups will be deleted.</div>
                  <div>• Their account database record will be permanently wiped.</div>
                  <div className="font-bold pt-1">This action cannot be undone.</div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModal((prev) => ({ ...prev, open: false }))}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteModal.loading}
                    onClick={handleDeleteAgentConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {deleteModal.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Permanently Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Base Product / Price Modal */}
        {deleteProductModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-rose-900/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Delete Agent Store Price</h3>
                  <p className="text-[11px] text-rose-400 font-bold">Remove Base Product</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to delete the price for{" "}
                  <strong className="text-white uppercase">{deleteProductModal.network} {deleteProductModal.size}</strong>{" "}
                  (Cost: GHS {deleteProductModal.basePrice.toFixed(2)})?
                </p>

                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[11px] text-rose-300 space-y-1">
                  <div>• This package will be removed from all agent store catalogs.</div>
                  <div>• Existing registered custom prices for this package will be cleared.</div>
                  <div className="font-bold pt-1">This action cannot be undone.</div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteProductModal({
                        open: false,
                        productId: "",
                        network: "",
                        size: "",
                        basePrice: 0,
                        loading: false,
                      })
                    }
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteProductModal.loading}
                    onClick={handleDeleteProductConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {deleteProductModal.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Price"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Register New Agent Modal */}
        {createAgentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Register New Agent</h3>
                  <p className="text-[11px] text-slate-400">Create an agent store, set up credentials, and assign initial float.</p>
                </div>
              </div>

              <form onSubmit={handleCreateAgent} className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Agent Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newAgentForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewAgentForm((prev) => ({
                        ...prev,
                        name,
                        store_name: prev.store_name ? prev.store_name : `${name} Data`,
                      }));
                    }}
                    placeholder="e.g. Kwame Mensah"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Store Name *</label>
                    <input
                      type="text"
                      required
                      value={newAgentForm.store_name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const slug = val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
                        setNewAgentForm((prev) => ({ ...prev, store_name: val, store_slug: slug }));
                      }}
                      placeholder="e.g. Kwame Data Hub"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Store Slug (/slug)</label>
                    <input
                      type="text"
                      value={newAgentForm.store_slug}
                      onChange={(e) => setNewAgentForm((prev) => ({ ...prev, store_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-") }))}
                      placeholder="e.g. kwame-data"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-emerald-400 font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={newAgentForm.phone}
                      onChange={(e) => setNewAgentForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="054XXXXXXX"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newAgentForm.email}
                      onChange={(e) => setNewAgentForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="agent@example.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Login PIN / Password</label>
                    <input
                      type="text"
                      value={newAgentForm.password}
                      onChange={(e) => setNewAgentForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Default: 123456"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-300 font-mono font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Initial Float (GHS)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAgentForm.initial_balance}
                      onChange={(e) => setNewAgentForm((prev) => ({ ...prev, initial_balance: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-emerald-400 font-mono font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreateAgentModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAgentLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {createAgentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Agent Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Adjust Agent Wallet Float Modal */}
        {adjustModalOpen && selectedAgentForAdjust && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Adjust Agent Wallet</h3>
                  <p className="text-[11px] text-slate-400">{selectedAgentForAdjust.name} ({selectedAgentForAdjust.store_name})</p>
                </div>
              </div>

              <form onSubmit={handleAdjustAgentWallet} className="mt-5 space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Current Balance:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    GHS {Number(selectedAgentForAdjust.wallet_balance || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAdjustType("credit")}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                      adjustType === "credit"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    + Credit (Deposit Float)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("debit")}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                      adjustType === "debit"
                        ? "bg-rose-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    - Debit (Deduct Float)
                  </button>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Adjustment Amount (GHS) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                      GHS
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      required
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustModalOpen(false);
                      setSelectedAgentForAdjust(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustLoading}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${
                      adjustType === "credit"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                        : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                    }`}
                  >
                    {adjustLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : adjustType === "credit" ? (
                      "Apply Credit"
                    ) : (
                      "Apply Debit"
                    )}
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
