"use client";

import React, { useState } from "react";
import { Product, Settings } from "@/lib/db";
import CheckoutModal from "./CheckoutModal";
import { ChevronDown, ChevronUp, Zap, Sparkles, Check } from "lucide-react";

interface Props {
  products: Product[];
  settings: Settings;
}

interface NetworkConfig {
  key: string;
  name: string;
  circleBg: string;
  circleText: string;
  circleLabel: string;
  cardBg: string;
  cardText: string;
  btnBg: string;
  btnText: string;
  accentBorder: string;
  bundleCardBg: string;
  bundleCardText: string;
}

const NETWORKS: NetworkConfig[] = [
  {
    key: "mtn",
    name: "MTN",
    circleBg: "bg-[#ffcc00]",
    circleText: "text-black",
    circleLabel: "MTN",
    cardBg: "bg-slate-900",
    cardText: "text-white",
    btnBg: "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600",
    btnText: "text-slate-950",
    accentBorder: "border-amber-400/40 hover:border-amber-400",
    bundleCardBg: "bg-[#ffcc00]",
    bundleCardText: "text-slate-950",
  },
  {
    key: "telecel",
    name: "Telecel",
    circleBg: "bg-[#e60000]",
    circleText: "text-white",
    circleLabel: "t",
    cardBg: "bg-slate-900",
    cardText: "text-white",
    btnBg: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700",
    btnText: "text-white",
    accentBorder: "border-red-500/40 hover:border-red-500",
    bundleCardBg: "bg-[#e60000]",
    bundleCardText: "text-white",
  },
  {
    key: "at",
    name: "AirtelTigo",
    circleBg: "bg-[#1a73e8]",
    circleText: "text-white",
    circleLabel: "AT",
    cardBg: "bg-slate-900",
    cardText: "text-white",
    btnBg: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
    btnText: "text-white",
    accentBorder: "border-blue-500/40 hover:border-blue-500",
    bundleCardBg: "bg-[#1a73e8]",
    bundleCardText: "text-white",
  },
];

export default function NetworkSelectionSection({ products, settings }: Props) {
  // Start with first network expanded so users see packages immediately, or toggle
  const [expandedNetwork, setExpandedNetwork] = useState<string>("mtn");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectPackage = (pkg: Product) => {
    setSelectedProduct(pkg);
    setIsModalOpen(true);
  };

  const toggleNetwork = (key: string) => {
    setExpandedNetwork((prev) => (prev === key ? "" : key));
  };

  return (
    <section id="networks" className="py-6 sm:py-10 max-w-2xl mx-auto px-4 w-full">
      {/* Vertical Stack: One on top, one in the middle, one down */}
      <div className="space-y-4">
        {NETWORKS.map((net) => {
          const isExpanded = expandedNetwork === net.key;
          const networkProducts = products
            .filter((p) => p.is_active !== false && p.network.toLowerCase() === net.key)
            .sort((a, b) => a.price - b.price);

          return (
            <div
              key={net.key}
              className={`rounded-3xl border-2 transition-all duration-300 overflow-hidden shadow-xl ${
                isExpanded ? "border-amber-400 bg-slate-900" : `${net.accentBorder} bg-slate-900/95`
              }`}
            >
              {/* Main Network Row (Screenshot 1 Style) */}
              <div
                onClick={() => toggleNetwork(net.key)}
                className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                {/* Left: Circle Logo and Name */}
                <div className="flex items-center gap-3.5 sm:gap-4">
                  {/* Circle Logo (Screenshot 1: Yellow MTN, Red t, Blue AT) */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${net.circleBg} ${net.circleText} font-black flex items-center justify-center text-lg sm:text-xl shadow-lg shrink-0 border-2 border-white/20`}
                  >
                    {net.circleLabel}
                  </div>

                  {/* Title and Best Price Badge */}
                  <div className="flex flex-col text-left">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {net.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        ★ Best Price
                      </span>
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        • {networkProducts.length} packages
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Buy Button & Chevron */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNetwork(net.key);
                    }}
                    className={`py-2 px-4 sm:py-2.5 sm:px-5 rounded-2xl font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all transform active:scale-95 ${net.btnBg} ${net.btnText}`}
                  >
                    <span>{isExpanded ? "Hide" : "Buy Now"}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Second Card Package List (Screenshot 2 Style) */}
              {isExpanded && (
                <div className="px-4 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/60 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                    <span className="font-bold text-slate-300">
                      Select {net.name} Bundle Package:
                    </span>
                    <span>Tap any card to purchase</span>
                  </div>

                  {networkProducts.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
                      No active packages available for {net.name} right now.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                      {networkProducts.map((pkg) => (
                        <div
                          key={pkg.id}
                          onClick={() => handleSelectPackage(pkg)}
                          className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl transform hover:-translate-y-0.5 active:scale-98 relative flex flex-col justify-between ${net.bundleCardBg} ${net.bundleCardText}`}
                        >
                          {/* Top Row: Oval network logo + down chevron button */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="border border-current/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                              {net.name}
                            </span>
                            <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Middle Row: Big Bold Capacity + Subtext */}
                          <div className="my-1.5">
                            <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
                              {pkg.size}
                            </div>
                            <div className="text-xs font-semibold opacity-90 mt-1">
                              {net.name} Bundle
                            </div>
                          </div>

                          {/* Bottom Row: Price + No Expiry */}
                          <div className="flex items-baseline justify-between pt-2 border-t border-current/15 mt-2">
                            <span className="text-xl sm:text-2xl font-black tracking-tight">
                              ₵{pkg.price.toFixed(2)}
                            </span>
                            <span className="text-xs font-bold opacity-85">
                              No Expiry
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Checkout Popup Modal */}
      {selectedProduct && (
        <CheckoutModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          settings={settings}
        />
      )}
    </section>
  );
}
