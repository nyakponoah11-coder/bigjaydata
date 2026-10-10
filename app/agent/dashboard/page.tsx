"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Smartphone,
  Eye,
  ShieldCheck,
  Send,
  Share2,
  Camera,
  Upload,
  MessageCircle,
  Mail,
  Trash2,
  Radio,
  Lock,
  Globe,
} from "lucide-react";
import { encodeAgentToken } from "@/lib/agent-link";

export default function AgentDashboardPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "products" | "orders" | "withdrawals" | "settings">("home");
  const [linkMode, setLinkMode] = useState<"clean" | "cloaked" | "short" | "masked" | "standard">("clean");
  const [customDomain, setCustomDomain] = useState<string>("fastdata-gh.vercel.app");
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [tinyUrl, setTinyUrl] = useState<string>("");
  const [shortening, setShortening] = useState<boolean>(false);

  // Home / Dashboard States
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [copied, setCopied] = useState(false);

  // Products States
  const [products, setProducts] = useState<any[]>([]);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});

  // Orders States
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersDateFilter, setOrdersDateFilter] = useState<string>("");

  // Withdrawal States
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawMomo, setWithdrawMomo] = useState<string>("");
  const [withdrawNetwork, setWithdrawNetwork] = useState<string>("MTN");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpFeedback, setOtpFeedback] = useState("");
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  // Settings States
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeTheme, setStoreTheme] = useState("emerald");
  const [storeLogo, setStoreLogo] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Handle Logo / Profile Image Upload (converts to base64 data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setStoreLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Check auth & fetch data
  useEffect(() => {
    const rawSession = localStorage.getItem("bmgh_agent_session");
    if (!rawSession) {
      router.push("/agent/login");
      return;
    }

    try {
      const parsed = JSON.parse(rawSession);
      setAgent(parsed);
      setStoreSlug(parsed.store_slug || "");
      setStoreName(parsed.store_name || "");
      setStoreDescription(parsed.description || "");
      setStorePhone(parsed.phone || "");
      setStoreTheme(parsed.theme || "emerald");
      setStoreLogo(parsed.logo_url || "");
      setWhatsappNumber(parsed.whatsapp_number || parsed.phone || "");
      setWhatsappChannelUrl(parsed.whatsapp_channel_url || "");
      setSupportEmail(parsed.support_email || parsed.email || "");
      setWithdrawMomo(parsed.momo_number || parsed.phone || "");
      setWithdrawNetwork(parsed.momo_network || "MTN");
      loadDashboardData(parsed.id);
    } catch {
      router.push("/agent/login");
    }
  }, []);

  const loadDashboardData = async (agentId: string) => {
    try {
      setLoading(true);
      const [profRes, prodRes, ordRes, withRes] = await Promise.all([
        fetch(`/api/agent/profile?agent_id=${agentId}`),
        fetch(`/api/agent/products?agent_id=${agentId}`),
        fetch(`/api/agent/orders?agent_id=${agentId}`),
        fetch(`/api/agent/withdrawals?agent_id=${agentId}`),
      ]);

      const [profData, prodData, ordData, withData] = await Promise.all([
        profRes.json(),
        prodRes.json(),
        ordRes.json(),
        withRes.json(),
      ]);

      if (profData.success && profData.agent) {
        setAgent(profData.agent);
        setStoreSlug(profData.agent.store_slug || "");
        setStoreName(profData.agent.store_name || "");
        setStoreDescription(profData.agent.description || "");
        setStorePhone(profData.agent.phone || "");
        setStoreTheme(profData.agent.theme || "emerald");
        setStoreLogo(profData.agent.logo_url || "");
        setWhatsappNumber(profData.agent.whatsapp_number || profData.agent.phone || "");
        setWhatsappChannelUrl(profData.agent.whatsapp_channel_url || "");
        setSupportEmail(profData.agent.support_email || profData.agent.email || "");
        if (profData.custom_domain) {
          setCustomDomain(profData.custom_domain);
        }
        localStorage.setItem("bmgh_agent_session", JSON.stringify(profData.agent));
      }
      if (prodData.success) {
        setProducts(prodData.products || []);
        const pricesMap: Record<string, string> = {};
        (prodData.products || []).forEach((p: any) => {
          pricesMap[p.base_product_id] = String(p.selling_price);
        });
        setEditPrices(pricesMap);
      }
      if (ordData.success) setOrders(ordData.orders || []);
      if (withData.success) setWithdrawals(withData.withdrawals || []);
    } catch (err: any) {
      setError("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const encryptedToken = agent ? encodeAgentToken(agent.store_slug) : "";
  const cleanPath = agent ? `/${agent.store_slug}` : "";
  const shortPath = agent ? `/s/${agent.store_slug}` : "";
  const standardPath = agent ? `/store/${agent.store_slug}` : "";
  const maskedPath = agent ? `/d/${encryptedToken}` : "";

  const effectiveDomain = customDomain || "fastdata-gh.vercel.app";
  const baseOrigin = `https://${effectiveDomain.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;

  const directCleanUrl = agent && baseOrigin ? `${baseOrigin}${cleanPath}` : "";
  const directShortUrl = agent && baseOrigin ? `${baseOrigin}${shortPath}` : "";
  const directMaskedUrl = agent && baseOrigin ? `${baseOrigin}${maskedPath}` : "";
  const directStoreUrl = agent && baseOrigin ? `${baseOrigin}${standardPath}` : "";

  // Cloaked URL (100% white-label)
  const cloakedUrl = tinyUrl || agent?.cloaked_url || "";

  const activeDisplayUrl =
    linkMode === "clean"
      ? (directCleanUrl || directShortUrl)
      : linkMode === "cloaked"
      ? (cloakedUrl || directCleanUrl || directShortUrl)
      : linkMode === "short"
      ? directShortUrl
      : linkMode === "masked"
      ? directMaskedUrl
      : directStoreUrl;

  const handleCopyLink = (textToCopy?: string) => {
    const target = textToCopy || activeDisplayUrl || directShortUrl;
    if (typeof window !== "undefined" && target) {
      navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleGenerateTinyUrl = async (overrideTarget?: string) => {
    const targetToShorten = overrideTarget || directShortUrl;
    if (!targetToShorten) return null;
    try {
      setShortening(true);
      setError("");

      let short = "";

      // 1. TinyURL
      try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetToShorten)}`);
        if (res.ok) {
          const text = await res.text();
          if (text && text.startsWith("http")) short = text.trim();
        }
      } catch {}

      // 2. Fallback to is.gd
      if (!short) {
        try {
          const res2 = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(targetToShorten)}`);
          if (res2.ok) {
            const text2 = await res2.text();
            if (text2 && text2.startsWith("http")) short = text2.trim();
          }
        } catch {}
      }

      if (short) {
        setTinyUrl(short);
        if (agent && agent.id) {
          fetch("/api/agent/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent_id: agent.id, cloaked_url: short }),
          }).catch(() => {});
        }
        return short;
      }
    } catch {
      // Fallback
    } finally {
      setShortening(false);
    }
    return null;
  };

  // Auto-generate cloaked link for ANY current or future agent as soon as dashboard loads
  useEffect(() => {
    if (agent) {
      if (agent.cloaked_url && !tinyUrl) {
        setTinyUrl(agent.cloaked_url);
      } else if (!tinyUrl && !agent.cloaked_url && directShortUrl) {
        handleGenerateTinyUrl(directShortUrl);
      }
    }
  }, [agent?.id, agent?.store_slug, agent?.cloaked_url, directShortUrl]);

  // Sign out
  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bmgh_agent_session");
      localStorage.removeItem("bmgh_agent_token");
    }
    router.push("/agent/login");
  };

  // Update Product Retail Price
  const handleSaveProductPrice = async (p: any) => {
    const rawVal = editPrices[p.base_product_id] !== undefined ? editPrices[p.base_product_id] : String(p.selling_price);
    const newPrice = parseFloat(rawVal);
    if (isNaN(newPrice) || newPrice < p.base_price) {
      setError(`Selling price cannot be less than base price (GHS ${p.base_price.toFixed(2)})`);
      return;
    }

    try {
      setSavingProductId(p.base_product_id);
      setError("");
      const res = await fetch("/api/agent/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agent.id,
          base_product_id: p.base_product_id,
          selling_price: newPrice,
          is_active: p.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice("Retail price updated successfully!");
        setRecentlySavedId(p.base_product_id);
        setProducts((prev) =>
          prev.map((item) =>
            item.base_product_id === p.base_product_id ? { ...item, selling_price: newPrice } : item
          )
        );
        setTimeout(() => {
          setNotice("");
          setRecentlySavedId(null);
        }, 3000);
      }
    } catch (err) {
      setError("Failed to update product");
    } finally {
      setSavingProductId(null);
    }
  };

  const [savingAll, setSavingAll] = useState(false);

  const handleSaveAllPrices = async () => {
    if (!agent) return;
    try {
      setSavingAll(true);
      setError("");
      setNotice("");
      for (const p of products) {
        const customVal = editPrices[p.base_product_id];
        if (customVal !== undefined && customVal !== "") {
          const numPrice = parseFloat(customVal);
          if (!isNaN(numPrice) && numPrice >= p.base_price) {
            await fetch("/api/agent/products", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agent_id: agent.id,
                base_product_id: p.base_product_id,
                selling_price: numPrice,
                is_active: p.is_active,
              }),
            });
          }
        }
      }
      setNotice("All product retail prices updated successfully!");
      await loadDashboardData(agent.id);
      setTimeout(() => setNotice(""), 3500);
    } catch (err: any) {
      setError("Failed to save some prices. Please retry.");
    } finally {
      setSavingAll(false);
    }
  };

  const handleToggleProductActive = async (p: any) => {
    try {
      const nextState = !p.is_active;
      const res = await fetch("/api/agent/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agent.id,
          base_product_id: p.base_product_id,
          selling_price: p.selling_price,
          is_active: nextState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) =>
          prev.map((item) =>
            item.base_product_id === p.base_product_id ? { ...item, is_active: nextState } : item
          )
        );
      }
    } catch (err) {
      setError("Failed to toggle product");
    }
  };

  // Withdrawals: Request OTP
  const handleRequestOtp = async () => {
    const num = parseFloat(withdrawAmount);
    if (isNaN(num) || num < 5.0) {
      setError("Minimum withdrawal amount is GHS 5.00.");
      return;
    }
    if (num > (agent?.wallet_balance || 0)) {
      setError(`Insufficient wallet balance. You have GHS ${(agent?.wallet_balance || 0).toFixed(2)}.`);
      return;
    }

    try {
      setRequestingOtp(true);
      setError("");
      const res = await fetch("/api/agent/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_otp",
          agent_id: agent.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setOtpFeedback(data.message || `A 6-digit verification code was sent to ${agent.email}.`);
      } else {
        throw new Error(data.message || "Failed to request code");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRequestingOtp(false);
    }
  };

  // Withdrawals: Submit Payout
  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingWithdrawal(true);
      setError("");
      const res = await fetch("/api/agent/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_withdrawal",
          agent_id: agent.id,
          amount: parseFloat(withdrawAmount),
          momo_number: withdrawMomo,
          momo_network: withdrawNetwork,
          verification_code: otpCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Withdrawal failed");
      }

      setNotice(data.message);
      setAgent((prev: any) => ({ ...prev, wallet_balance: data.new_balance }));
      setWithdrawAmount("");
      setOtpSent(false);
      setOtpCode("");
      setWithdrawals((prev) => [data.withdrawal, ...prev]);
      setTimeout(() => setNotice(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  // Save Settings & Theme
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setError("");
      const res = await fetch("/api/agent/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agent.id,
          store_slug: storeSlug.trim(),
          store_name: storeName,
          description: storeDescription,
          phone: storePhone,
          theme: storeTheme,
          momo_number: withdrawMomo,
          momo_network: withdrawNetwork,
          logo_url: storeLogo,
          whatsapp_number: whatsappNumber,
          whatsapp_channel_url: whatsappChannelUrl,
          support_email: supportEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAgent(data.agent);
        if (data.agent?.store_slug) setStoreSlug(data.agent.store_slug);
        if (data.agent?.store_name) setStoreName(data.agent.store_name);
        localStorage.setItem("bmgh_agent_session", JSON.stringify(data.agent));
        setNotice("Store settings & custom link saved successfully!");
        setTimeout(() => setNotice(""), 3500);
      } else {
        setError(data.message || "Failed to save settings");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Calculated Stats for Selected Date
  const dateOrders = orders.filter((o) => {
    if (!o.created_at) return false;
    return new Date(o.created_at).toISOString().split("T")[0] === selectedDate;
  });

  const todaySpent = dateOrders.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
  const todayProfit = dateOrders.reduce((acc, o) => acc + (Number(o.agent_profit) || 0), 0);

  // Filtered orders for Orders tab
  const displayedOrders = ordersDateFilter
    ? orders.filter((o) => new Date(o.created_at).toISOString().split("T")[0] === ordersDateFilter)
    : orders;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (agent && agent.is_active === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/60 rounded-3xl p-8 space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-rose-400">Account Suspended</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your partner account (<strong className="text-white">{agent.store_name}</strong>) has been placed on suspension by platform administration.
          </p>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
            While suspended, your storefront is temporarily offline and dashboard access is paused. Please contact administration for assistance.
          </div>
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Store Branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Store className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <span className="font-black text-base sm:text-lg text-white tracking-tight block">
                  {agent?.store_name || "Agent Store"}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Partner Portal
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href={activeDisplayUrl || directShortUrl}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">View Store</span>
              </a>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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

        {/* Store Link Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Customer Storefront URL
              </div>
              <h2 className="text-lg font-black text-white">Share Your Store with Customers</h2>

              {/* 100% White-Labeled Link Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>100% White-Labeled (bundlemartgh.com Hidden)</span>
                </span>
                <span className="text-[11px] text-emerald-300 font-medium">
                  Zero setup needed • Ready to share with customers
                </span>
              </div>


              {/* Active URL display */}
              <div className="space-y-1.5">
                <p className="text-xs text-emerald-300 font-mono bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 break-all select-all flex items-center justify-between gap-2">
                  <span>{activeDisplayUrl || directShortUrl}</span>
                </p>

                <p className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1.5 pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Direct Agent Link: Opens your personalized store with your custom prices.</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-end">
              <button
                onClick={() => handleCopyLink(activeDisplayUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
                title="Edit your store name or URL slug"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Link</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Buy cheap MTN, Telecel & AT data bundles instantly on my portal: ${activeDisplayUrl || directShortUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </a>

              <a
                href={activeDisplayUrl || directShortUrl}
                target="_blank"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Open storefront"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>
                Your store link is: <strong className="text-white font-mono">{activeDisplayUrl || directShortUrl}</strong>. You can customize this link anytime in Settings.
              </span>
            </div>
            {customDomain && (
              <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                Custom Domain Active: {customDomain}
              </span>
            )}
          </div>
        </div>

        {/* Tab Menu Navigation */}
        <div className="flex border-b border-slate-800 overflow-x-auto gap-1 pb-1">
          {[
            { id: "home", label: "Homepage", icon: LayoutDashboard },
            { id: "products", label: "Products", icon: Package },
            { id: "orders", label: "Orders", icon: ShoppingCart },
            { id: "withdrawals", label: "Withdrawal", icon: Wallet },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 py-3 px-4 sm:px-6 text-xs font-bold rounded-2xl transition-all shrink-0 ${
                  active
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: HOMEPAGE (Stats, Today's Spend, Profit, Calendar) */}
        {activeTab === "home" && (
          <div className="space-y-6">
            {/* Calendar / Date Filter for Dashboard Time */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Dashboard Performance Period:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 rounded-xl"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Performance Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Orders for Selected Day */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Day&apos;s Orders</span>
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {dateOrders.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Orders placed on {selectedDate}
                </div>
              </div>

              {/* Amount Spent Today */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Sales Volume</span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300 font-mono">
                  GHS {todaySpent.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Gross customer purchases
                </div>
              </div>

              {/* Profit Accumulated Today */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Profit for Day</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  +GHS {todayProfit.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Net earnings accumulated
                </div>
              </div>

              {/* Available Wallet Balance */}
              <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Wallet Balance</span>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  GHS {Number(agent?.wallet_balance || 0).toFixed(2)}
                </div>
                <button
                  onClick={() => setActiveTab("withdrawals")}
                  className="mt-2 text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Withdraw Earnings →</span>
                </button>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">Recent Store Activity</h3>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="text-xs font-bold text-emerald-400 hover:underline"
                >
                  View All Orders →
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No orders yet. Copy your store link above and share with your customers!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Package</th>
                        <th className="py-2.5 px-3">Recipient</th>
                        <th className="py-2.5 px-3">Customer Paid</th>
                        <th className="py-2.5 px-3">Your Profit</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id}>
                          <td className="py-2.5 px-3 text-slate-400">
                            {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {o.network.toUpperCase()} {o.package_size}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{o.phone}</td>
                          <td className="py-2.5 px-3 font-mono text-white">GHS {Number(o.amount).toFixed(2)}</td>
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-400">
                            +GHS {Number(o.agent_profit).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              {o.delivery_status || o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS (Set & Edit Pricing against Base Price) */}
        {activeTab === "products" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Store Bundle Pricing & Margins</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Set your retail selling prices against the Admin Base Cost. When customers pay on your store, the base cost is deducted and the remaining profit automatically accumulates in your wallet.
                </p>
              </div>
              <button
                onClick={handleSaveAllPrices}
                disabled={savingAll}
                className="self-start sm:self-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving All...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save All Prices</span>
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-4">Network</th>
                    <th className="py-3 px-4">Package Size</th>
                    <th className="py-3 px-4">Admin Base Cost</th>
                    <th className="py-3 px-4">Your Retail Price (GHS)</th>
                    <th className="py-3 px-4">Your Profit / Sale</th>
                    <th className="py-3 px-4 text-center">Store Visible</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {products.map((p) => {
                    const currentSelling = parseFloat(editPrices[p.base_product_id] || p.selling_price);
                    const profitPerSale = Math.max(0, currentSelling - p.base_price);
                    const isSaving = savingProductId === p.base_product_id;

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
                        <td className="py-3 px-4 font-mono text-slate-400">
                          GHS {Number(p.base_price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-bold text-xs">GHS</span>
                            <input
                              type="number"
                              step="0.1"
                              min={p.base_price}
                              value={editPrices[p.base_product_id] !== undefined ? editPrices[p.base_product_id] : p.selling_price}
                              onChange={(e) =>
                                setEditPrices((prev) => ({
                                  ...prev,
                                  [p.base_product_id]: e.target.value,
                                }))
                              }
                              onBlur={() => {
                                const val = editPrices[p.base_product_id];
                                if (val !== undefined && val !== "" && parseFloat(val) !== p.selling_price) {
                                  handleSaveProductPrice(p);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                  handleSaveProductPrice(p);
                                }
                              }}
                              className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-emerald-400 text-xs">
                            +GHS {profitPerSale.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleProductActive(p)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.is_active
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-700 text-slate-400"
                            }`}
                          >
                            {p.is_active ? "Active" : "Hidden"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {recentlySavedId === p.base_product_id ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 font-bold text-[11px] rounded-lg border border-emerald-500/30">
                              ✓ Saved
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSaveProductPrice(p)}
                              disabled={isSaving}
                              className={`px-3 py-1 font-bold text-[11px] rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
                                editPrices[p.base_product_id] !== undefined &&
                                parseFloat(editPrices[p.base_product_id]) !== p.selling_price
                                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400 animate-pulse font-black"
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
                              }`}
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : editPrices[p.base_product_id] !== undefined &&
                                parseFloat(editPrices[p.base_product_id]) !== p.selling_price ? (
                                "Save ⚡"
                              ) : (
                                "Save"
                              )}
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

        {/* TAB 3: ORDERS (Full orders with date calendar filter) */}
        {activeTab === "orders" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Customer Orders</h3>
                <p className="text-xs text-slate-400">
                  Track all bundle purchases completed through your store.
                </p>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={ordersDateFilter}
                  onChange={(e) => setOrdersDateFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {ordersDateFilter && (
                  <button
                    onClick={() => setOrdersDateFilter("")}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded-xl"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Order Ref</th>
                    <th className="py-3 px-3">Package</th>
                    <th className="py-3 px-3">Recipient Phone</th>
                    <th className="py-3 px-3">Customer Price</th>
                    <th className="py-3 px-3">Base Cost</th>
                    <th className="py-3 px-3">Your Profit</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {displayedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No orders match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(o.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">{o.reference}</td>
                        <td className="py-3 px-3 font-bold text-white">
                          {o.network.toUpperCase()} {o.package_size}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">{o.phone}</td>
                        <td className="py-3 px-3 font-mono text-white">GHS {Number(o.amount).toFixed(2)}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">GHS {Number(o.base_price).toFixed(2)}</td>
                        <td className="py-3 px-3 font-mono font-black text-emerald-400">
                          +GHS {Number(o.agent_profit).toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                            {o.delivery_status || o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: WITHDRAWAL (Wallet Balance, Min 5 GHS, MoMo, OTP Verification) */}
        {activeTab === "withdrawals" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Withdrawal Request Form */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Instant Payout Desk
                </span>
                <h3 className="text-lg font-black text-white mt-1">Request Profit Withdrawal</h3>
                <div className="mt-2 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Available Balance:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    GHS {Number(agent?.wallet_balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Withdrawal Amount (Min GHS 5.00)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                      GHS
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="5"
                      max={agent?.wallet_balance || 0}
                      required
                      placeholder="5.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Network */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Mobile Money Network
                  </label>
                  <select
                    value={withdrawNetwork}
                    onChange={(e) => setWithdrawNetwork(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-bold"
                  >
                    <option value="MTN">MTN MoMo</option>
                    <option value="Telecel">Telecel Cash</option>
                    <option value="AT">AT Money</option>
                  </select>
                </div>

                {/* MoMo Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Recipient MoMo Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0551234567"
                    value={withdrawMomo}
                    onChange={(e) => setWithdrawMomo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Security OTP Verification Step */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Email Verification Code
                    </label>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={requestingOtp || !withdrawAmount || parseFloat(withdrawAmount) < 5}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                    >
                      {requestingOtp ? "Sending Code..." : otpSent ? "Resend Code" : "Send OTP to Email"}
                    </button>
                  </div>

                  {otpFeedback && (
                    <p className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-900 p-2 rounded-xl">
                      {otpFeedback}
                    </p>
                  )}

                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingWithdrawal || !otpCode}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingWithdrawal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Submit Payout Request</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Payout History */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white">Payout History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">MoMo Destination</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No withdrawal history found. Minimum withdrawal is GHS 5.00.
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 text-slate-400">
                            {new Date(w.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-amber-300">
                            GHS {Number(w.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-bold mr-1">
                              {w.momo_network}
                            </span>
                            {w.momo_number}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS (Storefront Design Customizer - 5 Distinct Designs) */}
        {activeTab === "settings" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Storefront Customization & Design</h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize your store name, tagline, and select from 5 unique storefront designs that match your personal brand.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Profile / Store Logo Upload Section */}
              <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Store Profile Picture / Logo</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Upload your brand logo or profile photo. It will appear on your storefront header, footer, and receipts.
                    </p>
                  </div>
                  {storeLogo && (
                    <button
                      type="button"
                      onClick={() => setStoreLogo("")}
                      className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Avatar Preview */}
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700 flex items-center justify-center shrink-0 shadow-lg">
                    {storeLogo ? (
                      <img
                        src={storeLogo}
                        alt={storeName || "Store"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800">
                        <Store className="w-8 h-8 text-emerald-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                          {storeName ? storeName.slice(0, 3) : "LOGO"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                    <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{storeLogo ? "Change Profile / Logo" : "Upload Store Profile Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Supports PNG, JPG, WEBP • Recommended square 500×500px • Max 2MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Store Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Stony Data Store"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Displayed at the top of your customer storefront</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Your Store Link Handle (Slug) *
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-slate-400 text-xs font-mono font-bold select-none">
                      {baseOrigin ? baseOrigin.replace(/^https?:\/\//i, "") : "store"}/
                    </span>
                    <input
                      type="text"
                      required
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"))}
                      placeholder="e.g. stony"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-r-xl text-emerald-400 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Live link: <span className="text-emerald-400 font-mono font-bold">{baseOrigin}/{storeSlug || "your-name"}</span> • You can edit this anytime!
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Customer Support Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="e.g. 0551234567"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Customer Communication & Support Desk */}
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Customer Support Desk & Channels</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      WhatsApp Support Number
                    </label>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="e.g. 0551234567"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">For direct customer chat inquiries</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      WhatsApp Channel URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={whatsappChannelUrl}
                      onChange={(e) => setWhatsappChannelUrl(e.target.value)}
                      placeholder="https://whatsapp.com/channel/..."
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Direct link for clients to follow your channel</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Support Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="e.g. support@myshop.com"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Shown in the storefront 24/7 footer</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Tagline / Store Description
                </label>
                <textarea
                  rows={2}
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  placeholder="e.g. Ghana's fastest automated mobile data provider for MTN, Telecel, and AT..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* 5 Distinct Design Themes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Select Storefront Design Theme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    {
                      id: "emerald",
                      name: "Emerald Elite",
                      desc: "Dark luxury with glowing emerald neon accents",
                      previewBg: "from-slate-950 via-slate-900 to-emerald-950",
                      accent: "bg-emerald-500",
                    },
                    {
                      id: "midnight",
                      name: "Cyber Midnight",
                      desc: "High-tech neon indigo & violet aesthetic",
                      previewBg: "from-slate-950 via-slate-900 to-indigo-950",
                      accent: "bg-indigo-500",
                    },
                    {
                      id: "sunset",
                      name: "Sunset Flare",
                      desc: "Radiant warm gradient of amber & rose coral",
                      previewBg: "from-slate-950 via-amber-950/40 to-rose-950/40",
                      accent: "bg-amber-500",
                    },
                    {
                      id: "sapphire",
                      name: "Royal Sapphire",
                      desc: "Executive deep blue prestige corporate theme",
                      previewBg: "from-slate-950 via-blue-950/50 to-cyan-950/40",
                      accent: "bg-blue-500",
                    },
                    {
                      id: "pearl",
                      name: "Clean Pearl",
                      desc: "Pristine, crisp ultra-modern light design",
                      previewBg: "from-slate-100 via-white to-slate-200 text-slate-900",
                      accent: "bg-slate-900",
                    },
                  ].map((theme) => {
                    const isSelected = storeTheme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => setStoreTheme(theme.id)}
                        className={`cursor-pointer rounded-2xl p-4 border transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? "border-emerald-400 ring-2 ring-emerald-400/30 bg-slate-800/80"
                            : "border-slate-800 hover:border-slate-700 bg-slate-800/40"
                        }`}
                      >
                        <div
                          className={`h-16 rounded-xl bg-gradient-to-br ${theme.previewBg} p-2 flex flex-col justify-between mb-3 border border-white/10`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="w-2 h-2 rounded-full bg-white/40" />
                            <span className={`w-3 h-3 rounded-full ${theme.accent}`} />
                          </div>
                          <div className="h-1.5 w-12 rounded-full bg-white/30" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white flex items-center justify-between">
                            <span>{theme.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">{theme.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/40 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out of Store
                </button>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
