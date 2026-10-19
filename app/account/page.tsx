"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  PlusCircle,
  Zap,
  ArrowRight,
  LogOut,
  RefreshCw,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Settings,
  User,
  Camera,
  Mail,
  KeyRound,
  Gift,
  Loader2,
  Phone,
} from "lucide-react";
import CustomerDepositModal from "@/components/CustomerDepositModal";
import FreeDataClaimModal from "@/components/FreeDataClaimModal";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  wallet_balance: number;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  reference: string;
  paystack_ref?: string;
  status: string;
  description: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  reference: string;
  network: string;
  package_size: string;
  phone: string;
  amount: number;
  payment_status: string;
  delivery_status: string;
  created_at: string;
}

export default function CustomerAccountDashboard() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isFreeDataOpen, setIsFreeDataOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"transactions" | "orders" | "settings">("transactions");

  // Profile and Settings State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Sync edit fields when customer changes
  useEffect(() => {
    if (customer) {
      setEditName(customer.name || "");
      setEditPhone(customer.phone || "");
    }
  }, [customer?.name, customer?.phone]);

  // Load customer session
  useEffect(() => {
    const raw = localStorage.getItem("bmgh_customer_session");
    if (!raw) {
      router.push("/login");
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setCustomer(parsed);
      loadFreshData(parsed.id);
    } catch {
      router.push("/login");
    }
  }, [router]);

  const loadFreshData = async (customerId?: string) => {
    const targetId = customerId || customer?.id;
    if (!targetId) return;

    setRefreshing(true);
    try {
      const res = await fetch(`/api/customer/me?id=${encodeURIComponent(targetId)}&include_orders=true`);
      const data = await res.json();
      if (data.success && data.customer) {
        setCustomer(data.customer);
        localStorage.setItem("bmgh_customer_session", JSON.stringify(data.customer));
        setTransactions(data.transactions || []);
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn("Failed to load customer profile:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bmgh_customer_session");
    document.cookie = "bmgh_customer_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/");
  };

  const handleDepositSuccess = (newBalance: number) => {
    if (customer) {
      const updated = { ...customer, wallet_balance: newBalance };
      setCustomer(updated);
      localStorage.setItem("bmgh_customer_session", JSON.stringify(updated));
    }
    loadFreshData();
  };

  // Avatar Upload Handler (converts to Base64 and commits to database)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !customer) return;

    if (!file.type.startsWith("image/")) {
      setProfileMsg({ type: "error", text: "Please select an image file (PNG, JPG, WebP)." });
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setProfileMsg({ type: "error", text: "Image is too large. Maximum size is 2.5MB." });
      return;
    }

    setUploadingAvatar(true);
    setProfileMsg(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Url = reader.result as string;
        const res = await fetch("/api/customer/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_profile",
            customerId: customer.id,
            avatar_url: base64Url,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to update profile picture.");
        }
        const updated = { ...customer, avatar_url: base64Url };
        setCustomer(updated);
        localStorage.setItem("bmgh_customer_session", JSON.stringify(updated));
        setProfileMsg({ type: "success", text: "Profile picture updated successfully!" });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err?.message || "Failed to upload image." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Profile Save Handler (Name & Phone)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/customer/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          customerId: customer.id,
          name: editName.trim(),
          phone: editPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile.");
      }
      const updated = { ...customer, name: data.customer.name, phone: data.customer.phone };
      setCustomer(updated);
      localStorage.setItem("bmgh_customer_session", JSON.stringify(updated));
      setProfileMsg({ type: "success", text: "Profile changes saved successfully!" });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err?.message || "Failed to update profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  // Request Email Change OTP (Sent to old email)
  const handleRequestEmailOtp = async () => {
    if (!customer) return;
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setEmailMsg({ type: "error", text: "Please enter a valid new email address." });
      return;
    }
    setSendingEmailOtp(true);
    setEmailMsg(null);

    try {
      const res = await fetch("/api/customer/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_email_change",
          customerId: customer.id,
          newEmail: newEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to request email change.");
      }
      setEmailOtpSent(true);
      if (data.dev_code) {
        setEmailOtp(data.dev_code);
      }
      setEmailMsg({
        type: "success",
        text: data.dev_code
          ? `Confirmation code generated: ${data.dev_code}. It has been pre-filled below.`
          : `A 6-digit verification code has been sent to your current email (${customer.email || "old email"}). Check your inbox/spam and enter the code below to confirm.`,
      });
    } catch (err: any) {
      setEmailMsg({ type: "error", text: err?.message || "Failed to send verification code." });
    } finally {
      setSendingEmailOtp(false);
    }
  };

  // Confirm Email Change with OTP
  const handleConfirmEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!emailOtp.trim() || emailOtp.trim().length !== 6) {
      setEmailMsg({ type: "error", text: "Please enter the 6-digit verification code sent to your old email." });
      return;
    }
    setVerifyingEmailOtp(true);
    setEmailMsg(null);

    try {
      const res = await fetch("/api/customer/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_email_change",
          customerId: customer.id,
          code: emailOtp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid or expired verification code.");
      }
      const updated = { ...customer, email: data.customer.email };
      setCustomer(updated);
      localStorage.setItem("bmgh_customer_session", JSON.stringify(updated));
      setEmailMsg({
        type: "success",
        text: `Email address successfully verified and updated to ${data.customer.email}!`,
      });
      setNewEmail("");
      setEmailOtp("");
      setEmailOtpSent(false);
    } catch (err: any) {
      setEmailMsg({ type: "error", text: err?.message || "Failed to confirm email change." });
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  if (loading && !customer) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-sm font-bold text-slate-400">Loading your account dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0b1021] to-[#050811] text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950">
      {/* Background ambient lighting */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[38rem] h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-slate-800 p-0.5 shadow-md group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="BundleMartGh" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white block leading-tight">
                BundleMart<span className="text-amber-400">Gh</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Customer Account
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/#networks"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Browse Bundles</span>
            </Link>

            <button
              onClick={() => loadFreshData()}
              disabled={refreshing}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Refresh Balance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full relative z-10 space-y-8 flex-1">
        {/* Welcome Profile Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {/* Avatar with Upload Hover */}
            <div className="relative group shrink-0">
              {customer?.avatar_url ? (
                <img
                  src={customer.avatar_url}
                  alt={customer.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-lg shadow-amber-500/20"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  {customer?.name ? customer.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <label
                htmlFor="avatar-upload-quick"
                className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-bold"
                title="Change Profile Picture"
              >
                <Camera className="w-4 h-4 text-amber-300" />
                <span>Change</span>
              </label>
              <input
                id="avatar-upload-quick"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Welcome, {customer?.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Phone: {customer?.phone} {customer?.email && `• ${customer.email}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("settings")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Profile & Settings</span>
            </button>
            <Link
              href="/#networks"
              className="hidden sm:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-amber-400/30 text-amber-300 text-xs font-black transition-all"
            >
              <span>Browse Bundles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Hero Wallet Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Wallet Balance Box */}
          <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-[#0d1627] to-slate-950 border-2 border-amber-400/40 shadow-2xl shadow-amber-500/10 relative overflow-hidden backdrop-blur-md flex flex-col justify-between">
            {/* Top gold highlight glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Available Wallet Balance</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Instant 1-Click Use</span>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
                  GHS
                </span>
                <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-white font-mono tracking-tight">
                  {Number(customer?.wallet_balance || 0).toFixed(2)}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 max-w-md">
                Deposit funds directly via Paystack (Momo or Card). Use your balance to buy any MTN, Telecel, or AT bundle instantly with zero checkout delay.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setIsDepositOpen(true)}
                className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Deposit Funds (Paystack)</span>
              </button>

              <Link
                href="/#networks"
                className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
              >
                <Zap className="w-4 h-4 fill-current text-slate-950" />
                <span>Buy Data from Wallet</span>
              </Link>
            </div>
          </div>

          {/* Quick Telecom Networks Box */}
          <div className="rounded-3xl p-6 bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-white text-base">Select Network</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Fast 60-second automated delivery to your line:
              </p>

              <div className="space-y-2.5">
                <Link
                  href="/buy/mtn"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-amber-400/30 hover:border-amber-400 text-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#ffcc00] text-black font-black text-xs flex items-center justify-center shadow-md">
                      MTN
                    </span>
                    <div>
                      <span className="text-sm font-bold block leading-tight">MTN Bundles</span>
                      <span className="text-[10px] text-slate-400">4G+/5G Turbo Data</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/buy/telecel"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-red-500/30 hover:border-red-500 text-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#e60000] text-white font-black text-xs flex items-center justify-center shadow-md">
                      t
                    </span>
                    <div>
                      <span className="text-sm font-bold block leading-tight">Telecel Bundles</span>
                      <span className="text-[10px] text-slate-400">High-Speed Turbo</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/buy/at"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-blue-500/30 hover:border-blue-500 text-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#1a73e8] text-white font-black text-xs flex items-center justify-center shadow-md">
                      AT
                    </span>
                    <div>
                      <span className="text-sm font-bold block leading-tight">AT AirtelTigo</span>
                      <span className="text-[10px] text-slate-400">Non-Expiry Wholesale</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </div>
            </div>

            {/* Free Data Promotional & Eligibility Card */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-300">
                  <Gift className="w-4 h-4 text-amber-300 animate-bounce" />
                  <span>Free Data Promo</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">
                  {orders.length} Orders Placed
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-snug mb-3">
                Admins periodically drop free data codes! Accounts with 3, 4, 5+ orders unlock exclusive claims.
              </p>
              <button
                type="button"
                onClick={() => setIsFreeDataOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all animate-pulse hover:animate-none cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Claim Free Data Voucher</span>
              </button>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 text-center">
              <Link
                href="/track"
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <span>Track an existing order</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs for Transaction History, Orders & Settings */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab("transactions")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === "transactions"
                    ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Wallet Transactions ({transactions.length})
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === "orders"
                    ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Order History ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === "settings"
                    ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </button>
            </div>

            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Manage your personal info, email verification & security
            </span>
          </div>

          {/* Tab 1: Transactions */}
          {activeTab === "transactions" && (
            <div className="p-4 sm:p-6">
              {transactions.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No transactions yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Deposit funds using Paystack or purchase data to see your wallet statement here.
                  </p>
                  <button
                    onClick={() => setIsDepositOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Make First Deposit</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {transactions.map((tx) => {
                    const isCredit = tx.type === "deposit" || tx.amount > 0;
                    return (
                      <div
                        key={tx.id}
                        className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-950/40 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isCredit
                                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                                : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                              {tx.description || (isCredit ? "Wallet Deposit" : "Bundle Purchase")}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                              <span>Ref: {tx.reference}</span>
                              <span>•</span>
                              <span>{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm sm:text-base font-black font-mono ${
                              isCredit ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {isCredit ? "+" : "-"}₵{Math.abs(tx.amount).toFixed(2)}
                          </span>
                          <span className="block text-[10px] uppercase font-bold text-slate-500">
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Orders */}
          {activeTab === "orders" && (
            <div className="p-4 sm:p-6">
              {orders.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No orders placed yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Buy cheap MTN, Telecel, or AT bundles directly from your wallet or with Momo.
                  </p>
                  <Link
                    href="/#networks"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-500 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Browse Bundles</span>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-950/40 px-2 rounded-xl transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-amber-400">
                            {o.network}
                          </span>
                          <span className="text-sm font-bold text-white">{o.package_size}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Recipient: {o.phone} • Ref: {o.reference}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <span className="text-sm sm:text-base font-black text-white font-mono block">
                          ₵{Number(o.amount).toFixed(2)}
                        </span>
                        <Link
                          href={`/receipt/${o.reference}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-colors"
                        >
                          <span>Receipt</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Account Settings */}
          {activeTab === "settings" && (
            <div className="p-4 sm:p-8 space-y-8">
              {/* Profile Alerts */}
              {profileMsg && (
                <div
                  className={`p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm ${
                    profileMsg.type === "success"
                      ? "bg-emerald-950/70 border border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/70 border border-rose-500/40 text-rose-300"
                  }`}
                >
                  {profileMsg.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                  )}
                  <p className="font-bold">{profileMsg.text}</p>
                </div>
              )}

              {/* Grid with 2 columns: Profile Details & Email Change Security */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Card: Profile Picture & Basic Info */}
                <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-6">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                    <User className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-black text-white">Profile Information</h3>
                  </div>

                  {/* Profile Picture Upload Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                    <div className="relative group shrink-0">
                      {customer?.avatar_url ? (
                        <img
                          src={customer.avatar_url}
                          alt={customer.name}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-xl"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xl">
                          {customer?.name ? customer.name.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <h4 className="text-sm font-bold text-white">Profile Picture</h4>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Upload a PNG, JPG, or WebP photo (max 2.5MB). Your avatar will appear on your account dashboard.
                      </p>
                      <div>
                        <label
                          htmlFor="avatar-upload-input"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-white hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          <span>{customer?.avatar_url ? "Change Picture" : "Upload Picture"}</span>
                        </label>
                        <input
                          id="avatar-upload-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Edit Name & Phone Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Samuel Mensah"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Phone Number (Order Delivery & Contact)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          required
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="e.g. 0551234567"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ensure this is your primary Ghanaian phone number for fast data crediting.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="w-full py-3 px-5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>Save Profile Changes</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Right Card: Email Address Change with Old Email Verification */}
                <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                      <Mail className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-base font-black text-white">Email Address & Security</h3>
                    </div>

                    {/* Email Alert Banner */}
                    {emailMsg && (
                      <div
                        className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs ${
                          emailMsg.type === "success"
                            ? "bg-emerald-950/70 border border-emerald-500/40 text-emerald-300"
                            : "bg-rose-950/70 border border-rose-500/40 text-rose-300"
                        }`}
                      >
                        {emailMsg.type === "success" ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        )}
                        <p className="font-semibold leading-relaxed">{emailMsg.text}</p>
                      </div>
                    )}

                    {/* Security Notice */}
                    <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs leading-relaxed flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block font-bold mb-0.5">Two-Step Email Verification:</strong>
                        To protect your account balance, changing your email requires a 6-digit confirmation code sent to your <strong>current (old) email</strong> address.
                      </div>
                    </div>

                    {/* Current Email Display */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Current Registered Email
                      </label>
                      <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs flex items-center justify-between">
                        <span>{customer?.email || "No email assigned"}</span>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Active
                        </span>
                      </div>
                    </div>

                    {/* Step 1: Input New Email & Request Code */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          New Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="e.g. newname@example.com"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {!emailOtpSent ? (
                        <button
                          type="button"
                          onClick={handleRequestEmailOtp}
                          disabled={sendingEmailOtp || !newEmail.trim()}
                          className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {sendingEmailOtp ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>Sending Code to {customer?.email || "Old Email"}...</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              <span>Send Verification Code to Current Email</span>
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>

                    {/* Step 2: Verification Code Input & Confirm Button */}
                    {emailOtpSent && (
                      <form onSubmit={handleConfirmEmailOtp} className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                            <KeyRound className="w-4 h-4 text-indigo-400" />
                            <span>Enter 6-Digit Code</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleRequestEmailOtp}
                            disabled={sendingEmailOtp}
                            className="text-[11px] text-amber-400 hover:underline font-bold"
                          >
                            Resend Code
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="••••••"
                          className="w-full text-center py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-black text-xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={verifyingEmailOtp || emailOtp.length !== 6}
                          className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {verifyingEmailOtp ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>Verifying Code & Updating...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-white" />
                              <span>Verify & Confirm New Email</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>BundleMartGh Account Security</span>
                    <span>15-min code expiry</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Free Data Claim Modal */}
      <FreeDataClaimModal
        isOpen={isFreeDataOpen}
        onClose={() => setIsFreeDataOpen(false)}
      />

      {/* Deposit Modal */}
      <CustomerDepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        customer={customer}
        onSuccess={handleDepositSuccess}
      />

      {/* Footer Minimal */}
      <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-800/60 relative z-10">
        © {new Date().getFullYear()} BundleMartGh • Instant Automated Data Fulfillment
      </footer>
    </div>
  );
}
