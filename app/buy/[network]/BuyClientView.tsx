"use client";

import React, { useState } from "react";
import { Product, Settings } from "@/lib/db";
import CheckoutModal from "@/components/CheckoutModal";
import { Zap, Check, ArrowRight, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";

interface Props {
  network: string;
  products: Product[];
  settings: Settings;
}

export default function BuyClientView({ network, products, settings }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Network badge/theme configuration
  const getTheme = () => {
    switch (network.toLowerCase()) {
      case "mtn":
        return {
          title: "MTN Ghana Bundles",
          pill: "MTN 4G+/5G",
          accentBg: "bg-amber-500",
          borderHover: "hover:border-amber-400",
          headerGradient: "from-amber-400 via-yellow-400 to-amber-500 text-slate-950",
          selectBtn: "bg-amber-500 hover:bg-amber-600 text-slate-950",
          badgeColor: "bg-amber-100 text-amber-900",
        };
      case "telecel":
        return {
          title: "Telecel Ghana Bundles",
          pill: "Telecel Turbo",
          accentBg: "bg-red-600",
          borderHover: "hover:border-red-400",
          headerGradient: "from-red-600 via-rose-600 to-red-700 text-white",
          selectBtn: "bg-red-600 hover:bg-red-700 text-white",
          badgeColor: "bg-red-100 text-red-900",
        };
      case "at":
        return {
          title: "AT (AirtelTigo) Bundles",
          pill: "AT Non-Expiry",
          accentBg: "bg-blue-600",
          borderHover: "hover:border-blue-400",
          headerGradient: "from-blue-600 via-indigo-600 to-blue-700 text-white",
          selectBtn: "bg-blue-600 hover:bg-blue-700 text-white",
          badgeColor: "bg-blue-100 text-blue-900",
        };
      default:
        return {
          title: `${network.toUpperCase()} Bundles`,
          pill: network.toUpperCase(),
          accentBg: "bg-emerald-600",
          borderHover: "hover:border-emerald-400",
          headerGradient: "from-emerald-600 via-teal-600 to-emerald-700 text-white",
          selectBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
          badgeColor: "bg-emerald-100 text-emerald-900",
        };
    }
  };

  const theme = getTheme();
  const activeProducts = products.filter((p) => p.is_active);

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Network Header Banner */}
      <div className={`rounded-3xl p-8 sm:p-10 bg-gradient-to-r ${theme.headerGradient} shadow-xl relative overflow-hidden`}>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-black/15 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {theme.pill}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            {network.toLowerCase() === "mtn" ? "MTN Bundles" : theme.title}
          </h1>

          {network.toLowerCase() === "mtn" ? (
            /* Crucial MTN Rules & Restrictions */
            <div className="mt-5 space-y-3">
              <div className="bg-black/10 backdrop-blur-md border border-black/15 rounded-2xl p-4 sm:p-5 text-slate-950 space-y-3 shadow-xs">
                {/* Rule 1 */}
                <div className="flex items-start gap-2.5 text-xs sm:text-sm font-extrabold">
                  <span className="bg-slate-950 text-amber-400 font-black rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs mt-0.5">
                    1
                  </span>
                  <span>Wrong numbers cannot be refunded.</span>
                </div>

                {/* Rule 2 */}
                <div className="flex items-start gap-2.5 text-xs sm:text-sm font-extrabold">
                  <span className="bg-slate-950 text-amber-400 font-black rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs mt-0.5">
                    2
                  </span>
                  <div>
                    <span>Avoid duplicate orders:</span>{" "}
                    <span className="font-bold opacity-90">
                      Wait 5 minutes after the first order is received before placing another order on the same number.
                    </span>
                  </div>
                </div>

                {/* Rule 3 */}
                <div className="pt-2 border-t border-black/10">
                  <div className="flex items-start gap-2.5 text-xs sm:text-sm font-extrabold mb-2">
                    <span className="bg-slate-950 text-amber-400 font-black rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs mt-0.5">
                      3
                    </span>
                    <span>Order Rules – Do NOT place orders on:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-7">
                    {[
                      "Turbonet SIMs",
                      "Broadband SIMs",
                      "Agent SIMs",
                      "Invalid SIMs",
                      "Ported numbers",
                    ].map((item) => (
                      <span
                        key={item}
                        className="bg-black/20 text-slate-950 font-black px-2.5 py-1 rounded-lg text-xs border border-black/15 shadow-2xs"
                      >
                        ✕ {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm sm:text-base opacity-90 max-w-xl leading-relaxed">
                Choose your preferred data package. All bundles feature instant automated delivery directly to your Ghanaian phone number.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl">
                  <Zap className="w-3.5 h-3.5" /> Automated Line Crediting
                </span>
                <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl">
                  <ShieldCheck className="w-3.5 h-3.5" /> No Expiry Guarantee
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Package Selection Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Available Data Bundles ({activeProducts.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Prices in Ghanaian Cedis (GHS)
          </span>
        </div>

        {activeProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <p className="text-base text-slate-600 font-medium">
              No active packages available for {network.toUpperCase()} right now.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Please check back shortly or choose another network.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {activeProducts.map((pkg) => {
              const isMtn = network.toLowerCase() === "mtn";
              const isTelecel = network.toLowerCase() === "telecel";
              const cardBg = isMtn
                ? "bg-[#ffcc00] text-slate-950"
                : isTelecel
                ? "bg-[#e60000] text-white"
                : "bg-[#1a73e8] text-white";

              return (
                <div
                  key={pkg.id}
                  onClick={() => handleSelect(pkg)}
                  className={`rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl transform hover:-translate-y-0.5 active:scale-98 relative flex flex-col justify-between ${cardBg}`}
                >
                  {/* Top: Oval network pill badge + chevron icon */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="border border-current/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {network.toUpperCase()}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Middle: Big bold size + network bundle label */}
                  <div className="my-1.5">
                    <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
                      {pkg.size}
                    </div>
                    <div className="text-xs font-semibold opacity-90 mt-1">
                      {network.toUpperCase()} Bundle
                    </div>
                  </div>

                  {/* Bottom: Price in Cedis + No Expiry */}
                  <div className="flex items-baseline justify-between pt-2 border-t border-current/15 mt-2">
                    <span className="text-xl sm:text-2xl font-black tracking-tight">
                      ₵{pkg.price.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold opacity-85">
                      No Expiry
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        settings={settings}
      />
    </div>
  );
}
