"use client";

import React, { useState } from "react";
import { Product, Settings } from "@/lib/db";
import CheckoutModal from "@/components/CheckoutModal";
import { Zap, Check, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

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
            {theme.title}
          </h1>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeProducts.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => handleSelect(pkg)}
                className={`group bg-white rounded-3xl p-6 border-2 border-slate-200/90 ${theme.borderHover} shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1 relative`}
              >
                {/* Size and badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                      {pkg.size}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${theme.badgeColor}`}>
                      No Expiry
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-6">
                    {network.toUpperCase()} High-Speed Internet Bundle with instant crediting.
                  </p>
                </div>

                {/* Price and CTA */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-xs text-slate-400 font-medium">Price</span>
                    <div className="text-2xl font-black text-slate-900">
                      GHS {pkg.price.toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all group-hover:shadow-md ${theme.selectBtn}`}
                  >
                    <span>Buy {pkg.size} Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
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
