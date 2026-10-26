"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import {
  Users,
  UserCheck,
  Copy,
  Check,
  Download,
  Phone,
  Search,
  RefreshCw,
  MessageCircle,
  FileText,
  Filter,
  ShoppingCart,
  Store,
  MessageSquare,
  Gift,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Wallet,
  ShieldCheck,
  UserX,
} from "lucide-react";

interface CustomerRecord {
  phone: string;
  international_phone: string;
  name: string;
  network: "mtn" | "telecel" | "at" | "other";
  total_orders: number;
  total_spent: number;
  sources: string[];
  first_seen: string;
  last_seen: string;
  recent_references: string[];
  is_registered?: boolean;
  customer_id?: string;
  wallet_balance?: number;
  email?: string;
}

interface SummaryData {
  total_contacts: number;
  total_registered_accounts: number;
  total_guest_buyers: number;
  total_storefront_customers: number;
  total_agent_customers: number;
  total_chat_customers: number;
  mtn_count: number;
  telecel_count: number;
  at_count: number;
  numbers_comma: string;
  numbers_newline: string;
  numbers_intl_comma: string;
  numbers_intl_newline: string;
}

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState<"all" | "registered" | "guests">("all");
  const [copyFormat, setCopyFormat] = useState<"comma" | "newline" | "intl_comma">("comma");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.phone.includes(q) ||
      c.international_phone.includes(q) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      c.sources.some((s) => s.toLowerCase().includes(q));

    const matchesNetwork = networkFilter === "all" || c.network === networkFilter;

    const matchesSource =
      sourceFilter === "all" ||
      (sourceFilter === "storefront" && c.sources.some((s) => s.includes("Main Storefront"))) ||
      (sourceFilter === "agent" && c.sources.some((s) => s.includes("Agent"))) ||
      (sourceFilter === "chat" && c.sources.some((s) => s.includes("Live Chat"))) ||
      (sourceFilter === "voucher" && c.sources.some((s) => s.includes("Voucher")));

    const matchesAccountType =
      accountTypeFilter === "all" ||
      (accountTypeFilter === "registered" && c.is_registered) ||
      (accountTypeFilter === "guests" && !c.is_registered);

    return matchesSearch && matchesNetwork && matchesSource && matchesAccountType;
  });

  // Numbers generated for the currently filtered set
  const filteredLocalNumbers = filteredCustomers.map((c) => c.phone);
  const filteredIntlNumbers = filteredCustomers.map((c) => c.international_phone);

  const getFilteredCopyText = () => {
    if (copyFormat === "newline") {
      return filteredLocalNumbers.join("\n");
    }
    if (copyFormat === "intl_comma") {
      return filteredIntlNumbers.join(", ");
    }
    return filteredLocalNumbers.join(", ");
  };

  const handleCopyAll = () => {
    const text = getFilteredCopyText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    triggerToast(`Copied ${filteredCustomers.length} numbers to clipboard!`);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopySingle = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(phone);
    triggerToast(`Copied ${phone}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    if (!filteredCustomers.length) return;
    const headers = ["Phone", "International", "Name", "Email", "Account Type", "Wallet Balance", "Network", "Total Orders", "Total Spent (GHS)", "Sources", "Last Seen"];
    const rows = filteredCustomers.map((c) => [
      `"${c.phone}"`,
      `"${c.international_phone}"`,
      `"${c.name || ""}"`,
      `"${c.email || ""}"`,
      `"${c.is_registered ? "Registered Account" : "Guest Buyer"}"`,
      c.wallet_balance ? c.wallet_balance.toFixed(2) : "0.00",
      `"${c.network.toUpperCase()}"`,
      c.total_orders,
      c.total_spent.toFixed(2),
      `"${c.sources.join(" | ")}"`,
      `"${new Date(c.last_seen).toLocaleDateString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Customer CSV exported successfully!");
  };

  const handleExportTXT = () => {
    if (!filteredCustomers.length) return;
    const txtContent = "data:text/plain;charset=utf-8," + encodeURIComponent(getFilteredCopyText());
    const link = document.createElement("a");
    link.setAttribute("href", txtContent);
    link.setAttribute("download", `customer_numbers_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Customer phone numbers text file exported!");
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              Customer Audience & Lead Directory
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Customer Directory & Leads
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              All 1,000+ guest buyers and registered user phone numbers across the platform. Guest buyers buy without creating an account; registered customers have accounts and wallets.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/registered-accounts"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer"
              title="View Registered User Accounts & Wallets"
            >
              <UserCheck className="w-4 h-4 text-slate-950" />
              <span>Registered Accounts ({summary?.total_registered_accounts || 0})</span>
            </Link>

            <button
              onClick={fetchCustomers}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredCustomers.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Export to Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportTXT}
              disabled={filteredCustomers.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Export as Text file for Bulk SMS portals"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export TXT</span>
            </button>

            {/* Prominent Copy All Button */}
            <button
              onClick={handleCopyAll}
              disabled={filteredCustomers.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
              title="Copy all currently filtered customer phone numbers"
            >
              {copiedAll ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>Copy All ({filteredCustomers.length})</span>
            </button>
          </div>
        </div>

        {/* Audience Metrics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Registered Accounts */}
          <div
            onClick={() => setAccountTypeFilter("registered")}
            className={`rounded-3xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition-all border ${
              accountTypeFilter === "registered"
                ? "bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/50"
                : "bg-slate-900 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Registered Accounts</span>
              <UserCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              {summary?.total_registered_accounts || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Have accounts & wallets</div>
          </div>

          {/* Guest Buyers */}
          <div
            onClick={() => setAccountTypeFilter("guests")}
            className={`rounded-3xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition-all border ${
              accountTypeFilter === "guests"
                ? "bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/50"
                : "bg-slate-900 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Guest Order Buyers</span>
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {summary?.total_guest_buyers || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Direct storefront buyers</div>
          </div>

          {/* Total Unique Contacts */}
          <div
            onClick={() => setAccountTypeFilter("all")}
            className={`rounded-3xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition-all border ${
              accountTypeFilter === "all"
                ? "bg-slate-800 border-blue-500 ring-2 ring-blue-500/50"
                : "bg-slate-900 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>All Contacts</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-300 font-mono">
              {summary?.total_contacts || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Total combined directory</div>
          </div>

          {/* Network Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              Telco Breakdown
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="text-amber-400">MTN: {summary?.mtn_count || 0}</span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-400">TEL: {summary?.telecel_count || 0}</span>
              <span className="text-slate-600">|</span>
              <span className="text-blue-400">AT: {summary?.at_count || 0}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">SIM network detection</div>
          </div>
        </div>

        {/* Audience Segment Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setAccountTypeFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              accountTypeFilter === "all"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All Contacts ({summary?.total_contacts || 0})
          </button>
          <button
            onClick={() => setAccountTypeFilter("registered")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              accountTypeFilter === "registered"
                ? "bg-amber-400 text-slate-950 shadow-md font-black"
                : "bg-slate-900 text-amber-400 hover:text-amber-300 border border-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Registered Accounts ({summary?.total_registered_accounts || 0})</span>
          </button>
          <button
            onClick={() => setAccountTypeFilter("guests")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              accountTypeFilter === "guests"
                ? "bg-slate-200 text-slate-950 shadow-md font-black"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Guest Order Buyers ({summary?.total_guest_buyers || 0})</span>
          </button>
        </div>

        {/* Copy All Format Selector & Quick Action Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-300">Copy Format:</span>
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700">
              <button
                onClick={() => setCopyFormat("comma")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  copyFormat === "comma" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Comma Separated (024..., 055...)
              </button>
              <button
                onClick={() => setCopyFormat("newline")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  copyFormat === "newline" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                One Per Line (SMS Portals)
              </button>
              <button
                onClick={() => setCopyFormat("intl_comma")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  copyFormat === "intl_comma" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                International (+233...)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              Showing <strong className="text-white">{filteredCustomers.length}</strong> of {customers.length} contacts
            </span>
            <button
              onClick={handleCopyAll}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Selected List</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by phone number, name, email, or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Network Filter */}
            <div>
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">All Networks</option>
                <option value="mtn">MTN Only</option>
                <option value="telecel">Telecel Only</option>
                <option value="at">AT (AirtelTigo) Only</option>
                <option value="other">Other / International</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">All Sources</option>
                <option value="storefront">Main Storefront Orders</option>
                <option value="agent">Agent Store Orders & Partners</option>
                <option value="chat">Live Chat Contacts</option>
                <option value="voucher">Free Data Giveaway Claims</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Numbers Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Customer Contacts</span>
            </h3>
            {filteredCustomers.length > 0 && (
              <button
                onClick={handleCopyAll}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All {filteredCustomers.length} Numbers</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Phone Number</th>
                  <th className="py-3 px-3">Customer Identity</th>
                  <th className="py-3 px-3">Account Type & Wallet</th>
                  <th className="py-3 px-3">Network</th>
                  <th className="py-3 px-3">Acquisition Sources</th>
                  <th className="py-3 px-3">Purchases / Spend</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                      <span>Aggregating customer contacts from all systems...</span>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No customer contacts found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.phone} className="hover:bg-slate-800/40 transition-colors">
                      {/* Phone Number with 1-click copy */}
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 text-sm">{c.phone}</span>
                          <button
                            onClick={() => handleCopySingle(c.phone)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy number"
                          >
                            {copiedId === c.phone ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{c.international_phone}</div>
                      </td>

                      {/* Customer Identity / Name */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-200">
                          {c.name || <span className="text-slate-500 italic">Anonymous Buyer</span>}
                        </div>
                        {c.email ? (
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">
                            {c.email}
                          </div>
                        ) : c.recent_references.length > 0 ? (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Ref: {c.recent_references[0]}
                          </div>
                        ) : null}
                      </td>

                      {/* Account Type & Wallet */}
                      <td className="py-3 px-3">
                        {c.is_registered ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                              <UserCheck className="w-3 h-3" />
                              Registered Account
                            </span>
                            <div className="text-xs font-mono font-bold text-emerald-400">
                              Wallet: GHS {(c.wallet_balance || 0).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 bg-slate-800 border border-slate-700">
                            <ShoppingCart className="w-3 h-3 text-slate-500" />
                            Guest Buyer
                          </span>
                        )}
                      </td>

                      {/* Network */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            c.network === "mtn"
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                              : c.network === "telecel"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : c.network === "at"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {c.network.toUpperCase()}
                        </span>
                      </td>

                      {/* Acquisition Sources */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {c.sources.map((s, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                                s.includes("Registered")
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold"
                                  : s.includes("Main Storefront")
                                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                  : s.includes("Agent")
                                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                                  : s.includes("Chat")
                                  ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                  : "bg-slate-800 text-slate-300 border border-slate-700"
                              }`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Purchases / Spend */}
                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-white">
                          {c.total_orders > 0 ? (
                            <span>{c.total_orders} {c.total_orders === 1 ? "order" : "orders"}</span>
                          ) : (
                            <span className="text-slate-500">Inquiry only</span>
                          )}
                        </div>
                        {c.total_spent > 0 && (
                          <div className="text-[11px] text-emerald-400 font-bold">
                            GHS {c.total_spent.toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-3 text-slate-400">
                        <div>
                          {new Date(c.last_seen).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(c.last_seen).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Quick Action */}
                      <td className="py-3 px-3 text-right">
                        {c.is_registered ? (
                          <Link
                            href="/admin/registered-accounts"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-bold border border-amber-400/30 transition-colors"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>Manage Wallet</span>
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleCopySingle(c.phone)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
