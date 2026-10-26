"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import {
  Users,
  Wallet,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  PlusCircle,
  MinusCircle,
  Phone,
  Mail,
  Calendar,
  X,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Trash2,
  Loader2,
} from "lucide-react";

interface CustomerTransaction {
  id: string;
  customer_id: string;
  amount: number;
  type: "deposit" | "purchase" | "refund";
  reference: string;
  status: "success" | "pending" | "failed";
  description: string;
  created_at: string;
}

interface EnrichedCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  wallet_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  total_orders: number;
  total_deposits: number;
  total_spent: number;
  recent_transactions?: CustomerTransaction[];
}

interface SummaryData {
  total_customers: number;
  active_customers: number;
  suspended_customers: number;
  total_wallet_float: number;
}

export default function AdminRegisteredAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<EnrichedCustomer[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "has_balance" | "zero">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Modal States
  const [selectedCustomer, setSelectedCustomer] = useState<EnrichedCustomer | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Delete Customer State
  const [customerToDelete, setCustomerToDelete] = useState<EnrichedCustomer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/registered-accounts");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to load registered accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    triggerToast(`Phone ${phone} copied to clipboard!`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const copyAllPhones = () => {
    const phones = customers.map((c) => c.phone).join(", ");
    navigator.clipboard.writeText(phones);
    triggerToast(`Copied ${customers.length} customer phone numbers!`);
  };

  // Toggle customer active/suspended status
  const handleToggleStatus = async (customer: EnrichedCustomer) => {
    const nextState = !customer.is_active;
    const confirmMsg = nextState
      ? `Re-activate customer account for ${customer.name}?`
      : `Are you sure you want to suspend ${customer.name}? They will not be able to log in or use their wallet.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin/registered-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer.id,
          is_active: nextState,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(data.message);
        fetchAccounts();
      } else {
        alert(data.message || "Failed to update status.");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update status.");
    }
  };

  // Permanently delete registered customer account
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(
        `/api/admin/registered-accounts?customer_id=${encodeURIComponent(customerToDelete.id)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        triggerToast(data.message || `Account for ${customerToDelete.name} was permanently deleted.`);
        setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
        setCustomerToDelete(null);
        fetchAccounts();
      } else {
        alert(data.message || "Failed to delete customer account.");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete customer account.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit manual wallet adjustment
  const handleAdjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const val = Number(adjustAmount);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }

    const finalAmount = adjustType === "credit" ? val : -val;

    try {
      setSubmittingAction(true);
      const res = await fetch("/api/admin/registered-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          action: "adjust_wallet",
          amount: finalAmount,
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(data.message);
        setIsAdjustModalOpen(false);
        setAdjustAmount("");
        setAdjustReason("");
        fetchAccounts();
      } else {
        alert(data.message || "Failed to adjust wallet balance.");
      }
    } catch (err: any) {
      alert(err?.message || "Network error while adjusting balance.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && c.is_active) ||
      (statusFilter === "suspended" && !c.is_active);

    const matchesBalance =
      balanceFilter === "all" ||
      (balanceFilter === "has_balance" && Number(c.wallet_balance || 0) > 0) ||
      (balanceFilter === "zero" && Number(c.wallet_balance || 0) <= 0);

    return matchesSearch && matchesStatus && matchesBalance;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto text-slate-100">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-bottom-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Registered Customer Accounts
                </h1>
                <p className="text-xs text-slate-400">
                  Manage registered user accounts, deposit balances & wallet ledgers
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/customers"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="View 1,000+ storefront guest buyer phone contacts"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Guest Leads (1,000+)</span>
            </Link>

            <button
              onClick={copyAllPhones}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Copy all customer phone numbers"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Copy Phones</span>
            </button>

            <button
              onClick={fetchAccounts}
              disabled={loading}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Clear Info Banner distinguishing Registered Accounts from Guest Buyers */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-300 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              This page displays only <strong>verified registered customer accounts</strong> with login credentials & wallet floats. Storefront guest buyers (1,000+) who purchase bundles without registration are kept in Guest Buyer Leads.
            </span>
          </div>
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-bold shrink-0 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>View Guest Buyer Leads (1,000+) →</span>
          </Link>
        </div>

        {/* Top Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Registered
              </span>
              <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                {summary?.total_customers ?? 0}
              </span>
              <span className="text-[10px] text-slate-500">Sign-up accounts</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Customer Float
              </span>
              <span className="text-2xl font-black text-amber-400 font-mono mt-0.5 block">
                GHS {(summary?.total_wallet_float ?? 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">Held in wallets</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Accounts
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
                {summary?.active_customers ?? 0}
              </span>
              <span className="text-[10px] text-emerald-500/80">Can buy & deposit</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Suspended Accounts
              </span>
              <span className="text-2xl font-black text-rose-400 font-mono mt-0.5 block">
                {summary?.suspended_customers ?? 0}
              </span>
              <span className="text-[10px] text-rose-400/80">Blocked from store</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone number, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>

            <select
              value={balanceFilter}
              onChange={(e: any) => setBalanceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Balances</option>
              <option value="has_balance">With Balance (&gt; ₵0)</option>
              <option value="zero">Zero Balance (₵0)</option>
            </select>
          </div>
        </div>

        {/* Customers Table / Card List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs font-bold">Loading registered customer accounts...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">No registered accounts found</p>
              <p className="text-xs text-slate-500">
                {searchQuery ? "Try a different search query or filter" : "Customers who sign up via /signup will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Contact Info</th>
                    <th className="py-3.5 px-4">Wallet Balance</th>
                    <th className="py-3.5 px-4 text-center">Orders</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredCustomers.map((cust) => (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Customer Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {cust.name ? cust.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <span className="font-bold text-white block leading-tight text-sm">
                              {cust.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {cust.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-200 text-xs">{cust.phone}</span>
                            <button
                              type="button"
                              onClick={() => copyPhone(cust.phone)}
                              className="text-slate-500 hover:text-amber-400 transition-colors"
                              title="Copy phone"
                            >
                              {copiedPhone === cust.phone ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {cust.email && (
                            <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                              {cust.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Wallet Balance */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={`font-mono font-black text-sm block ${
                              cust.wallet_balance > 0 ? "text-emerald-400" : "text-slate-400"
                            }`}
                          >
                            GHS {cust.wallet_balance.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Deposited: ₵{(cust.total_deposits || 0).toFixed(0)}
                          </span>
                        </div>
                      </td>

                      {/* Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold font-mono text-[11px]">
                          {cust.total_orders || 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {cust.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldAlert className="w-3 h-3" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {cust.created_at
                          ? new Date(cust.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Adjust Balance Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setAdjustType("credit");
                              setAdjustAmount("");
                              setAdjustReason("");
                              setIsAdjustModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Adjust wallet balance"
                          >
                            <Wallet className="w-3 h-3" />
                            <span>Adjust</span>
                          </button>

                          {/* Statement Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsStatementModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="View transaction statement"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>History</span>
                          </button>

                          {/* Status toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(cust)}
                            className={`p-1.5 rounded-xl border text-[11px] transition-colors cursor-pointer ${
                              cust.is_active
                                ? "bg-rose-950/40 hover:bg-rose-950/80 border-rose-500/30 text-rose-400"
                                : "bg-emerald-950/40 hover:bg-emerald-950/80 border-emerald-500/30 text-emerald-400"
                            }`}
                            title={cust.is_active ? "Suspend Account" : "Activate Account"}
                          >
                            {cust.is_active ? (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete Account Button */}
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(cust)}
                            className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/70 text-rose-400 hover:text-rose-200 text-[11px] transition-colors cursor-pointer"
                            title={`Delete account for ${cust.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Adjust Wallet Balance Modal */}
        {isAdjustModalOpen && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400" />

              <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Adjust Customer Wallet</h3>
                    <p className="text-xs text-slate-400">{selectedCustomer.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdjustWallet} className="p-6 space-y-4">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Current Balance:</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    GHS {selectedCustomer.wallet_balance.toFixed(2)}
                  </span>
                </div>

                {/* Adjust Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Action Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType("credit")}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                        adjustType === "credit"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Credit (+) Deposit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType("debit")}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                        adjustType === "debit"
                          ? "bg-rose-500/20 border-rose-500 text-rose-300"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span>Debit (-) Deduct</span>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Amount (GHS)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono text-xs">
                      ₵
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      required
                      placeholder="e.g. 50.00"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Reason / Admin Note
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cash topup received, promotional credit, refund adjustment"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {submittingAction ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Apply Adjustment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Customer Statement / History Modal */}
        {isStatementModalOpen && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 pb-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">{selectedCustomer.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedCustomer.phone} • Balance: GHS {selectedCustomer.wallet_balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsStatementModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Recent Ledger Transactions
                </h4>

                {(!selectedCustomer.recent_transactions ||
                  selectedCustomer.recent_transactions.length === 0) ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No transactions recorded for this account yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.recent_transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">{tx.description}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Ref: {tx.reference} • {new Date(tx.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-black text-xs ${
                            tx.amount >= 0 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {tx.amount >= 0 ? `+GHS ${tx.amount.toFixed(2)}` : `-GHS ${Math.abs(tx.amount).toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-right">
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Customer Account Confirmation Modal */}
        {customerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1.5 w-full bg-rose-500" />

              <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Delete Registered Account</h3>
                    <p className="text-xs text-rose-300 font-semibold">Irreversible action</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCustomerToDelete(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Are you sure you want to permanently delete the registered account for{" "}
                  <strong className="text-white font-bold">{customerToDelete.name}</strong>?
                </p>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Phone:</span>
                    <span className="font-mono font-bold text-slate-200">{customerToDelete.phone}</span>
                  </div>
                  {customerToDelete.email && (
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Email:</span>
                      <span className="text-slate-200 truncate max-w-[200px]">{customerToDelete.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Wallet Balance:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      GHS {Number(customerToDelete.wallet_balance || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Total Orders:</span>
                    <span className="font-bold text-slate-200">{customerToDelete.total_orders}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>
                    This customer will no longer be able to log in or access their wallet. This action cannot be undone.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setCustomerToDelete(null)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteCustomer}
                    className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Yes, Delete Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
