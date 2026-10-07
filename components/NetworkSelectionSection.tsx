"use client";

import React from "react";
import Link from "next/link";
import { Product, Settings } from "@/lib/db";
import { ArrowRight, Sparkles, Zap, ShieldCheck } from "lucide-react";

interface Props {
  products: Product[];
  settings: Settings;
}

interface NetworkConfig {
  key: string;
  name: string;
  tagline: string;
  circleBg: string;
  circleText: string;
  circleLabel: string;
  btnBg: string;
  btnText: string;
  accentBorder: string;
  glowColor: string;
}

const NETWORKS: NetworkConfig[] = [
  {
    key: "mtn",
    name: "MTN Ghana",
    tagline: "Ultra-fast 4G+/5G Turbo Data with 100% network uptime across all 16 regions.",
    circleBg: "bg-[#ffcc00]",
    circleText: "text-black",
    circleLabel: "MTN",
    btnBg: "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600",
    btnText: "text-slate-950",
    accentBorder: "border-amber-400/50 hover:border-amber-400",
    glowColor: "from-amber-500/10",
  },
  {
    key: "telecel",
    name: "Telecel Ghana",
    tagline: "High-speed internet for lightning fast downloads, streaming, and remote work.",
    circleBg: "bg-[#e60000]",
    circleText: "text-white",
    circleLabel: "t",
    btnBg: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700",
    btnText: "text-white",
    accentBorder: "border-red-500/50 hover:border-red-500",
    glowColor: "from-red-500/10",
  },
  {
    key: "at",
    name: "AT (AirtelTigo)",
    tagline: "Maximum gigabytes at unbeatable wholesale discounted prices. Zero expiry guarantee.",
    circleBg: "bg-[#1a73e8]",
    circleText: "text-white",
    circleLabel: "AT",
    btnBg: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
    btnText: "text-white",
    accentBorder: "border-blue-500/50 hover:border-blue-500",
    glowColor: "from-blue-500/10",
  },
];

export default function NetworkSelectionSection({ products }: Props) {
  return (
    <section id="networks" className="py-8 sm:py-12 max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      {/* Section Header on Laptop/Desktop */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Select Telecom Network
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          Choose Your Mobile Network
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600">
          Instant automated line crediting on all networks. Select a network to view available bundle options.
        </p>
      </div>

      {/* Network Cards - Vertically Stacked with Laptop-Optimized Proportions */}
      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        {NETWORKS.map((net) => {
          const networkProducts = products.filter(
            (p) => p.is_active !== false && p.network.toLowerCase() === net.key
          );
          const startingPrice =
            networkProducts.length > 0
              ? Math.min(...networkProducts.map((p) => p.price))
              : null;

          // Preview first 4 bundles for laptop view
          const previewBundles = networkProducts.slice(0, 4);

          return (
            <Link
              key={net.key}
              href={`/buy/${net.key}`}
              className={`group block rounded-3xl border-2 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-2xl ${net.accentBorder} bg-gradient-to-r ${net.glowColor} via-slate-900 to-slate-900/95 p-4 sm:p-6 lg:p-7 hover:scale-[1.01] active:scale-[0.99] relative`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-6">
                {/* Left: Circle Logo and Info */}
                <div className="flex items-center gap-4 sm:gap-5 lg:gap-6">
                  {/* Circle Logo (Yellow MTN, Red t, Blue AT) */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full ${net.circleBg} ${net.circleText} font-black flex items-center justify-center text-lg sm:text-xl lg:text-2xl shadow-xl shrink-0 border-2 border-white/20 group-hover:scale-105 transition-transform`}
                  >
                    {net.circleLabel}
                  </div>

                  {/* Title and Details */}
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight group-hover:text-amber-400 transition-colors">
                        {net.name}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        ★ Best Price
                      </span>
                      {startingPrice !== null && (
                        <span className="text-xs sm:text-sm text-emerald-400 font-extrabold">
                          from ₵{startingPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Subtitle description visible on laptop/tablet */}
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed max-w-xl line-clamp-2 hidden sm:block">
                      {net.tagline}
                    </p>

                    {/* Popular Bundle Preview Pills on Laptop/Desktop */}
                    {previewBundles.length > 0 && (
                      <div className="hidden lg:flex items-center gap-2 mt-2.5">
                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                          Popular:
                        </span>
                        {previewBundles.map((b) => (
                          <span
                            key={b.id}
                            className="px-2.5 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-mono font-bold"
                          >
                            {b.size} • ₵{b.price}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Buy Now Button (Spacious on laptop) */}
                <div className="flex items-center justify-end md:shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                  <span
                    className={`w-full md:w-auto py-2.5 px-5 sm:py-3 sm:px-6 lg:py-3.5 lg:px-8 rounded-2xl font-black text-xs sm:text-sm lg:text-base shadow-md flex items-center justify-center gap-2 transition-all group-hover:shadow-xl group-hover:scale-105 ${net.btnBg} ${net.btnText}`}
                  >
                    <span>View Bundles</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
