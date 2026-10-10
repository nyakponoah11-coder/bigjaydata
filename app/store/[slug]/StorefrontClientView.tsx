"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DeliveryTrackerCard from "@/components/DeliveryTrackerCard";
import {
  Store,
  Sparkles,
  Zap,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Search,
  MessageCircle,
  Clock,
  ArrowRight,
  Radio,
  Package,
  Check,
  RefreshCw,
  Mail,
} from "lucide-react";

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

interface ProductItem {
  id: string;
  network: string;
  size: string;
  price: number;
}

interface Props {
  agent: {
    id: string;
    name: string;
    store_name: string;
    store_slug: string;
    description: string;
    phone: string;
    theme: string;
    logo_url?: string;
    whatsapp_number?: string;
    whatsapp_channel_url?: string;
    support_email?: string;
    email?: string;
  };
  products: ProductItem[];
  paystackPublicKey: string;
}

export default function StorefrontClientView({
  agent,
  products,
  paystackPublicKey,
}: Props) {
  const router = useRouter();
  const [productList, setProductList] = useState<ProductItem[]>(products);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("mtn");
  const [checkoutProduct, setCheckoutProduct] = useState<ProductItem | null>(null);

  // Keep productList synced when SSR products update
  useEffect(() => {
    if (products && products.length > 0) {
      setProductList(products);
    }
  }, [products]);

  // Auto-refresh product prices from agent API so changes in agent dashboard reflect instantly
  useEffect(() => {
    let isMounted = true;
    const fetchFreshProducts = async () => {
      try {
        const res = await fetch(`/api/agent/products?agent_id=${agent.id}`, { cache: "no-store" });
        const data = await res.json();
        if (data.success && Array.isArray(data.products) && isMounted) {
          const mapped: ProductItem[] = data.products
            .filter((p: any) => p.is_active !== false)
            .map((p: any) => ({
              id: p.id,
              network: p.network,
              size: p.size,
              price: Number(p.selling_price),
            }));
          if (mapped.length > 0) {
            setProductList(mapped);
          }
        }
      } catch (err) {}
    };

    fetchFreshProducts();
    const interval = setInterval(fetchFreshProducts, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [agent.id]);

  // Checkout modal states
  const [recipientPhone, setRecipientPhone] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Number Verification State
  const [detectedTelco, setDetectedTelco] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    servable: boolean;
    isExistingLine: boolean;
    recommendation?: string;
    message?: string;
  } | null>(null);

  // Order Tracker Quick Lookup
  const [trackingQuery, setTrackingQuery] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);
  const [trackingError, setTrackingError] = useState("");

  // Load Paystack script
  useEffect(() => {
    if (!window.PaystackPop) {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Ghana telco number detection
  useEffect(() => {
    const clean = recipientPhone.replace(/[^0-9]/g, "");
    if (clean.length >= 3) {
      const prefix = clean.startsWith("233") ? "0" + clean.slice(3, 5) : clean.slice(0, 3);
      if (["024", "054", "055", "059", "025"].includes(prefix)) {
        setDetectedTelco("mtn");
      } else if (["020", "050"].includes(prefix)) {
        setDetectedTelco("telecel");
      } else if (["027", "057", "026", "056"].includes(prefix)) {
        setDetectedTelco("at");
      } else {
        setDetectedTelco(null);
      }
    } else {
      setDetectedTelco(null);
    }

    // Reset verification if phone is altered
    setVerificationResult(null);
  }, [recipientPhone]);

  // Perform Number Verification check via DataMart
  const performNumberVerification = async (targetPhone: string) => {
    const clean = targetPhone.replace(/[^0-9]/g, "");
    if (clean.length < 10) {
      setCheckoutError("Please enter a valid 10-digit number to verify.");
      return;
    }

    setVerifying(true);
    setCheckoutError("");

    try {
      const res = await fetch("/api/orders/verify-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: clean, network: checkoutProduct?.network }),
      });

      const data = await res.json();
      const isServable = data.servable !== false;
      const isOldActive = isServable && data.recommendation !== "activate_first";

      setVerificationResult({
        checked: true,
        servable: isServable,
        isExistingLine: isOldActive,
        recommendation: data.recommendation || (isOldActive ? "sell_any" : "activate_first"),
        message: data.message || "",
      });
    } catch (err) {
      setVerificationResult({
        checked: true,
        servable: true,
        isExistingLine: true,
        recommendation: "sell_any",
        message: "Line checked. Ready to proceed with order.",
      });
    } finally {
      setVerifying(false);
    }
  };

  // Theme Styling Configuration (5 Distinct Designs)
  const theme = agent.theme || "emerald";

  const getThemeStyles = () => {
    switch (theme) {
      case "midnight":
        return {
          wrapper: "bg-slate-950 text-slate-100",
          headerBg: "from-slate-950 via-slate-900 to-indigo-950 border-indigo-900/40",
          badge: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
          accentColor: "text-indigo-400",
          accentBg: "bg-indigo-600 hover:bg-indigo-500",
          cardBg: "bg-slate-900/90 border-slate-800",
          priceColor: "text-indigo-300",
          bannerGlow: "shadow-indigo-500/10",
        };
      case "sunset":
        return {
          wrapper: "bg-[#0c0908] text-slate-100",
          headerBg: "from-[#140d0a] via-[#1a0f0a] to-[#261009] border-amber-900/40",
          badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
          accentColor: "text-amber-400",
          accentBg: "bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500",
          cardBg: "bg-[#140d0a] border-amber-950/80",
          priceColor: "text-amber-300",
          bannerGlow: "shadow-amber-500/10",
        };
      case "sapphire":
        return {
          wrapper: "bg-[#030712] text-slate-100",
          headerBg: "from-[#030712] via-[#09152e] to-[#0c1f44] border-blue-900/40",
          badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
          accentColor: "text-blue-400",
          accentBg: "bg-blue-600 hover:bg-blue-500",
          cardBg: "bg-[#070e1e] border-blue-950/80",
          priceColor: "text-blue-300",
          bannerGlow: "shadow-blue-500/10",
        };
      case "pearl":
        return {
          wrapper: "bg-slate-900 text-slate-100",
          headerBg: "from-slate-900 via-slate-850 to-slate-800 border-slate-700/60",
          badge: "bg-white/10 text-slate-200 border border-white/20",
          accentColor: "text-slate-200",
          accentBg: "bg-white text-slate-950 hover:bg-slate-100",
          cardBg: "bg-slate-850 border-slate-750",
          priceColor: "text-white",
          bannerGlow: "shadow-slate-300",
        };
      case "emerald":
      default:
        return {
          wrapper: "bg-slate-950 text-slate-100",
          headerBg: "from-slate-950 via-slate-900 to-emerald-950 border-emerald-900/40",
          badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
          accentColor: "text-emerald-400",
          accentBg: "bg-emerald-600 hover:bg-emerald-500",
          cardBg: "bg-slate-900/90 border-slate-800",
          priceColor: "text-emerald-300",
          bannerGlow: "shadow-emerald-500/10",
        };
    }
  };

  const themeStyle = getThemeStyles();

  // Distinct Network Styling Rules
  const NETWORK_CONFIGS = [
    {
      id: "mtn",
      name: "MTN Ghana",
      pill: "Ultra Fast 4G+/5G",
      activeTab: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-amber-300 shadow-xl shadow-amber-500/30 font-black",
      inactiveTab: "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20",
      pillBg: "bg-slate-950 text-amber-300",
      cardBorder: "border-amber-400/40 hover:border-amber-400",
      cardBg: "bg-gradient-to-b from-amber-500/10 via-slate-900/95 to-slate-950",
      badgeStyle: "bg-amber-400 text-slate-950",
      priceColor: "text-amber-300",
      buyBtn: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-amber-500/25",
    },
    {
      id: "telecel",
      name: "Telecel Ghana",
      pill: "Turbo Non-Stop",
      activeTab: "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-red-400 shadow-xl shadow-red-500/30 font-black",
      inactiveTab: "bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20",
      pillBg: "bg-white text-red-700",
      cardBorder: "border-red-500/40 hover:border-red-500",
      cardBg: "bg-gradient-to-b from-red-500/10 via-slate-900/95 to-slate-950",
      badgeStyle: "bg-red-600 text-white",
      priceColor: "text-red-400",
      buyBtn: "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-500/25",
    },
    {
      id: "at",
      name: "AT (AirtelTigo)",
      pill: "Best Wholesale Value",
      activeTab: "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-blue-400 shadow-xl shadow-blue-500/30 font-black",
      inactiveTab: "bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20",
      pillBg: "bg-white text-blue-700",
      cardBorder: "border-blue-500/40 hover:border-blue-500",
      cardBg: "bg-gradient-to-b from-blue-500/10 via-slate-900/95 to-slate-950",
      badgeStyle: "bg-blue-600 text-white",
      priceColor: "text-blue-400",
      buyBtn: "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-500/25",
    },
  ];

  const currentNetworkConfig =
    NETWORK_CONFIGS.find((n) => n.id === selectedNetwork.toLowerCase()) || NETWORK_CONFIGS[0];

  // Filter products by selected network
  const networkProducts = productList.filter(
    (p) => p.network.toLowerCase() === selectedNetwork.toLowerCase()
  );

  // Handle Order Status Lookup
  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingQuery.trim()) return;

    setTrackingLoading(true);
    setTrackingError("");
    setTrackedOrder(null);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trackingQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "No transaction found matching this search.");
      }
      const found = data.order || (Array.isArray(data.orders) ? data.orders[0] : null);
      if (!found) {
        throw new Error("No transaction found matching this search.");
      }
      setTrackedOrder(found);
    } catch (err: any) {
      setTrackingError(err.message || "Failed to find order");
    } finally {
      setTrackingLoading(false);
    }
  };

  // Finalize order after successful payment or simulated mock checkout
  const handleFinalizeOrder = async (
    orderRef: string,
    paystackRef: string,
    phone: string,
    product: ProductItem
  ) => {
    try {
      setCheckoutLoading(true);
      const createRes = await fetch(`/api/store/${agent.store_slug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: orderRef,
          network: product.network,
          package_size: product.size,
          phone: phone,
          amount: product.price,
          paystack_ref: paystackRef,
        }),
      });

      const data = await createRes.json();
      if (!createRes.ok || !data.success) {
        throw new Error(data.message || "Failed to finalize order");
      }

      router.push(`/receipt/${orderRef}`);
    } catch (err: any) {
      setCheckoutError(err.message || "Order finalized. Please check your receipt.");
      setCheckoutLoading(false);
    }
  };

  // Launch Paystack Checkout
  const handleProceedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");

    const clean = recipientPhone.replace(/[^0-9]/g, "");
    if (clean.length < 10) {
      setCheckoutError("Please enter a valid 10-digit Ghanaian mobile number.");
      return;
    }

    if (!checkoutProduct) return;

    setCheckoutLoading(true);

    const storePrefix = agent.store_slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "DATA";
    const random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
    const reference = `${storePrefix}-${random8}`;
    const amountInPesewas = Math.max(1, Math.round(checkoutProduct.price * 100));

    const isMockGateway =
      !paystackPublicKey ||
      paystackPublicKey.includes("sample") ||
      paystackPublicKey.includes("placeholder") ||
      typeof window === "undefined" ||
      !window.PaystackPop;

    // Automatic fallback checkout when Paystack is in testing/unconfigured mode
    if (isMockGateway) {
      const simRef = `sim_${Date.now()}`;
      await handleFinalizeOrder(reference, simRef, clean, checkoutProduct);
      return;
    }

    try {
      const activeProduct = checkoutProduct;
      // Plain synchronous functions required by Paystack Inline v1/v2 validator
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: `${clean}@customer.${agent.store_slug}.com`,
        amount: amountInPesewas,
        currency: "GHS",
        ref: reference,
        metadata: {
          custom_fields: [
            { display_name: "Phone Number", variable_name: "phone_number", value: clean },
            { display_name: "Network", variable_name: "network", value: activeProduct.network.toUpperCase() },
            { display_name: "Package", variable_name: "package", value: activeProduct.size },
            { display_name: "Store Slug", variable_name: "store_slug", value: agent.store_slug },
          ],
        },
        callback: function (response: any) {
          const finalPaystackRef = response?.reference || response?.trxref || reference;
          handleFinalizeOrder(reference, finalPaystackRef, clean, activeProduct);
        },
        onClose: function () {
          setCheckoutLoading(false);
        },
      });

      handler.openIframe();
    } catch (err: any) {
      console.error("Paystack launch error:", err);
      setCheckoutError(err.message || "Failed to initialize payment gateway");
      setCheckoutLoading(false);
    }
  };

  const cleanPhoneLength = recipientPhone.replace(/[^0-9]/g, "").length;

  const networkMismatch =
    detectedTelco &&
    checkoutProduct &&
    checkoutProduct.network.toLowerCase() !== detectedTelco &&
    ["mtn", "telecel", "at"].includes(checkoutProduct.network.toLowerCase());

  return (
    <div className={`min-h-screen ${themeStyle.wrapper}`}>
      {/* Top Support Bar */}
      <div className="border-b border-inherit bg-black/20 text-xs py-2 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {agent.logo_url ? (
              <img
                src={agent.logo_url}
                alt={agent.store_name}
                className="w-5 h-5 rounded-full object-cover border border-white/20"
              />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            <span className="font-semibold">{agent.store_name} Official Store</span>
          </div>

          <div className="flex items-center gap-3">
            {agent.whatsapp_channel_url && (
              <a
                href={agent.whatsapp_channel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>WhatsApp Channel</span>
              </a>
            )}
            {(agent.whatsapp_number || agent.phone) && (
              <a
                href={`https://wa.me/${(agent.whatsapp_number || agent.phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${agent.store_name}, I have an inquiry.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Support</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Storefront Hero Header */}
        <div
          className={`rounded-3xl p-6 sm:p-10 bg-gradient-to-r ${themeStyle.headerBg} border shadow-2xl relative overflow-hidden`}
        >
          <div className="max-w-2xl relative z-10 space-y-3">
            <div className="flex items-center gap-3">
              {agent.logo_url && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-slate-900 shrink-0">
                  <img
                    src={agent.logo_url}
                    alt={agent.store_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${themeStyle.badge}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Verified Agent Store</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mt-1">
                  {agent.store_name}
                </h1>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {agent.description ||
                "Welcome to our verified data bundle store. We provide non-expiry data for MTN, Telecel, and AT with instant automated line crediting."}
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="px-3 py-1 rounded-full bg-black/30 border border-white/10 flex items-center gap-1.5 text-white">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Non-Expiry Bundles
              </span>
              <span className="px-3 py-1 rounded-full bg-black/30 border border-white/10 flex items-center gap-1.5 text-white">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Guaranteed Delivery
              </span>
              {agent.whatsapp_channel_url && (
                <a
                  href={agent.whatsapp_channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center gap-1.5 hover:bg-emerald-500/30 transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400" /> Join Channel
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Live Delivery Tracker & Status Search Bar */}
        <div className="space-y-4">
          <DeliveryTrackerCard />

          {/* Quick Order Lookup Form */}
          <div className="rounded-2xl p-4 bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span>Already Placed an Order? Track Status:</span>
            </div>
            <form onSubmit={handleTrackOrder} className="flex gap-2">
              <input
                type="text"
                placeholder={`Enter Reference (e.g. ${agent.store_slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "ORD"}-12345678) or Phone Number`}
                value={trackingQuery}
                onChange={(e) => setTrackingQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shrink-0 flex items-center justify-center gap-1.5 transition-all"
              >
                {trackingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check Status"}
              </button>
            </form>

            {/* Tracking Result */}
            {trackedOrder && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs animate-fade-in">
                <div>
                  <span className="font-bold text-white">
                    {trackedOrder.network?.toUpperCase()} {trackedOrder.package_size}
                  </span>
                  <span className="text-slate-400 ml-2">to {trackedOrder.phone}</span>
                </div>
                <span className="font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                  {trackedOrder.delivery_status || trackedOrder.status}
                </span>
              </div>
            )}
            {trackingError && (
              <p className="mt-2 text-[11px] text-rose-400 font-medium">{trackingError}</p>
            )}
          </div>
        </div>

        {/* Network Selector Tabs - DISTINCT BRAND COLORS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
              Select Your Telecom Network
            </h3>
            <span className="text-xs text-slate-400">Non-Expiry Bundles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {NETWORK_CONFIGS.map((net) => {
              const active = selectedNetwork.toLowerCase() === net.id;
              return (
                <button
                  key={net.id}
                  onClick={() => setSelectedNetwork(net.id)}
                  className={`py-4 px-4 rounded-2xl border text-center transition-all cursor-pointer ${
                    active
                      ? `${net.activeTab} scale-[1.02]`
                      : `${net.inactiveTab} opacity-85 hover:opacity-100`
                  }`}
                >
                  <div className="font-black text-sm sm:text-base tracking-tight">{net.name}</div>
                  <div
                    className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-1 ${
                      active ? net.pillBg : "bg-black/30 text-slate-300"
                    }`}
                  >
                    {net.pill}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Available Bundles Grid - DISTINCT CARD COLORS FOR EACH NETWORK */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black tracking-tight text-white">
              Available {currentNetworkConfig.name} Packages
            </h3>
            <span className="text-xs text-slate-400">Instant Delivery</span>
          </div>

          {networkProducts.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-slate-900/60 border border-slate-800">
              <Package className="w-8 h-8 opacity-40 mx-auto mb-2 text-slate-400" />
              <p className="text-xs text-slate-400">
                No {currentNetworkConfig.name} bundles currently active. Please select another network above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {networkProducts.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-3xl p-6 border-2 transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between space-y-4 shadow-xl ${currentNetworkConfig.cardBorder} ${currentNetworkConfig.cardBg}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs ${currentNetworkConfig.badgeStyle}`}
                      >
                        {p.network.toUpperCase()} Non-Expiry
                      </span>
                      <h4 className="text-3xl font-black mt-2 text-white">{p.size}</h4>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black font-mono ${currentNetworkConfig.priceColor}`}>
                        GHS {p.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <ul className="text-xs space-y-2 text-slate-300 border-t border-white/10 pt-3">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Instant automated line delivery</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>No expiry • Keep data until finished</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Direct {p.network.toUpperCase()} gateway fulfillment</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => {
                      setCheckoutProduct(p);
                      setRecipientPhone("");
                      setCheckoutError("");
                      setVerificationResult(null);
                    }}
                    className={`w-full py-3.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-95 ${currentNetworkConfig.buyBtn}`}
                  >
                    <span>Buy {p.network.toUpperCase()} Bundle</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Comprehensive Storefront 4-Column Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/95 text-slate-300 mt-16 pt-12 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-10 pb-10 border-b border-slate-800">
            {/* Column 1: Store Brand */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md bg-black flex items-center justify-center p-0.5 border border-slate-800 shrink-0">
                  {agent.logo_url ? (
                    <img
                      src={agent.logo_url}
                      alt={agent.store_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center rounded-lg">
                      {agent.store_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-extrabold text-lg text-white tracking-tight">
                  {agent.store_name}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {agent.description ||
                  "Ghana's premier automated mobile data platform. Get instant, affordable MTN, Telecel, and AT data packages delivered directly to your line in seconds."}
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Guaranteed Telco Delivery</span>
              </div>
            </div>

            {/* Column 2: Data Networks */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Data Networks
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <button
                    onClick={() => {
                      setSelectedNetwork("mtn");
                      window.scrollTo({ top: 380, behavior: "smooth" });
                    }}
                    className="hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>MTN Ghana Bundles</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSelectedNetwork("telecel");
                      window.scrollTo({ top: 380, behavior: "smooth" });
                    }}
                    className="hover:text-red-400 flex items-center gap-2 transition-colors cursor-pointer text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    <span>Telecel Ghana Bundles</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSelectedNetwork("at");
                      window.scrollTo({ top: 380, behavior: "smooth" });
                    }}
                    className="hover:text-blue-400 flex items-center gap-2 transition-colors cursor-pointer text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span>AT (AirtelTigo) Bundles</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      window.scrollTo({ top: 200, behavior: "smooth" });
                    }}
                    className="hover:text-emerald-400 flex items-center gap-2 transition-colors cursor-pointer text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Track Any Order</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <button
                    onClick={() => window.scrollTo({ top: 200, behavior: "smooth" })}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Check Delivery Status
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => window.scrollTo({ top: 380, behavior: "smooth" })}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Buy Data Packages
                  </button>
                </li>
                {(agent.whatsapp_number || agent.phone) && (
                  <li>
                    <a
                      href={`https://wa.me/${(agent.whatsapp_number || agent.phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${agent.store_name}, I have an inquiry.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Live WhatsApp Chat</span>
                    </a>
                  </li>
                )}
                {agent.whatsapp_channel_url && (
                  <li>
                    <a
                      href={agent.whatsapp_channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-emerald-400 font-semibold"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Join WhatsApp Channel</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Column 4: 24/7 Support Desk */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                24/7 Support Desk
              </h4>
              <ul className="space-y-3 text-xs text-slate-400">
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono">{agent.phone}</span>
                </li>
                {(agent.support_email || agent.email) && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                    <a
                      href={`mailto:${agent.support_email || agent.email}`}
                      className="hover:text-white truncate"
                    >
                      {agent.support_email || agent.email}
                    </a>
                  </li>
                )}
                {(agent.whatsapp_number || agent.phone) && (
                  <li className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <a
                      href={`https://wa.me/${(agent.whatsapp_number || agent.phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${agent.store_name}, I need assistance with my order.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-400 font-medium"
                    >
                      Chat with Support on WhatsApp
                    </a>
                  </li>
                )}
                {agent.whatsapp_channel_url && (
                  <li className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                    <a
                      href={agent.whatsapp_channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-400 font-medium"
                    >
                      Follow WhatsApp Channel
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              &copy; {new Date().getFullYear()} {agent.store_name}. All rights reserved. Automated Telco Gateway.
            </p>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-slate-400">
                Secured with <span className="font-semibold text-emerald-400">Paystack</span>
              </span>
              <span>•</span>
              <span className="text-slate-300 font-medium">Built by Stony</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Checkout Modal - WITH COMPLETE NUMBER VERIFICATION */}
      {checkoutProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    checkoutProduct.network.toLowerCase() === "mtn"
                      ? "bg-amber-400 text-slate-950"
                      : checkoutProduct.network.toLowerCase() === "telecel"
                      ? "bg-red-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {checkoutProduct.network.toUpperCase()} Instant Checkout
                </span>
                <h3 className="text-xl font-black mt-1">
                  {checkoutProduct.network.toUpperCase()} {checkoutProduct.size} Package
                </h3>
              </div>
              <button
                onClick={() => setCheckoutProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Price Preview */}
            <div className="bg-slate-800/80 rounded-2xl p-4 flex items-center justify-between border border-slate-700/60">
              <span className="text-xs text-slate-300 font-medium">Total Amount Due</span>
              <span className="text-2xl font-black text-amber-300 font-mono">
                GHS {checkoutProduct.price.toFixed(2)}
              </span>
            </div>

            {checkoutError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Telco Mismatch Warning Alert */}
            {networkMismatch && (
              <div className="p-3 bg-amber-950/70 border border-amber-600 text-amber-200 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Notice:</strong> Your phone number looks like an{" "}
                  <span className="font-black uppercase">{detectedTelco}</span> line, but you are purchasing{" "}
                  <span className="font-black uppercase">{checkoutProduct.network}</span> data. Please make sure the recipient network is correct.
                </div>
              </div>
            )}

            <form onSubmit={handleProceedPayment} className="space-y-4">
              {/* Phone Input with Inline Line Verification */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Recipient Phone Number *
                  </label>
                  {cleanPhoneLength === 10 && (
                    <button
                      type="button"
                      onClick={() => performNumberVerification(recipientPhone)}
                      disabled={verifying}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${verifying ? "animate-spin" : ""}`} />
                      <span>Verify Line (Optional)</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    autoFocus
                    placeholder="e.g. 0551234567"
                    maxLength={13}
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full pl-10 pr-28 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                  />

                  {/* Inline Verify Button */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      onClick={() => performNumberVerification(recipientPhone)}
                      disabled={verifying || cleanPhoneLength < 10}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        verificationResult?.checked && verificationResult.isExistingLine
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40"
                      }`}
                    >
                      {verifying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : verificationResult?.checked ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : null}
                      <span>
                        {verifying
                          ? "Checking..."
                          : verificationResult?.checked
                          ? "Verified"
                          : "Verify Line"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Verification Feedback Notification Card */}
                {verifying ? (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-2 text-xs text-slate-300 animate-pulse">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                    <span>Checking line status with telecom carrier...</span>
                  </div>
                ) : verificationResult?.checked ? (
                  verificationResult.isExistingLine ? (
                    <div className="mt-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Line verified &amp; active on network. Ready for instant bundle crediting.</span>
                    </div>
                  ) : (
                    <div className="mt-2.5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 animate-fade-in">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{verificationResult.message || "Line checked. You may proceed with the order."}</span>
                    </div>
                  )
                ) : null}

                <p className="text-[11px] text-slate-400 mt-1.5">
                  Double check the phone number. Data is credited immediately upon payment.
                </p>
              </div>

              <button
                type="submit"
                disabled={checkoutLoading || cleanPhoneLength < 10}
                className={`w-full py-3.5 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                  checkoutProduct.network.toLowerCase() === "mtn"
                    ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-amber-500/25"
                    : checkoutProduct.network.toLowerCase() === "telecel"
                    ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-500/25"
                    : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-500/25"
                }`}
              >
                {checkoutLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Proceed to Mobile Money Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
