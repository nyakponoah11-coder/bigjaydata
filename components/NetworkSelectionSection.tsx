"use client";

import React from "react";
import Link from "next/link";
import { Product, Settings } from "@/lib/db";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";

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
  btnBg: string;
  btnText: string;
  accentBorder: string;
}

const NETWORKS: NetworkConfig[] = [
  {
    key: "mtn",
    name: "MTN",
    circleBg: "bg-[#ffcc00]",
    circleText: "text-black",
    circleLabel: "MTN",
    btnBg: "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600",
    btnText: "text-slate-950",
    accentBorder: "border-amber-400/40 hover:border-amber-400",
  },
  {
    key: "telecel",
    name: "Telecel",
    circleBg: "bg-[#e60000]",
    circleText: "text-white",
    circleLabel: "t",
    btnBg: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700",
    btnText: "text-white",
    accentBorder: "border-red-500/40 hover:border-red-500",
  },
  {
    key: "at",
    name: "AirtelTigo",
    circleBg: "bg-[#1a73e8]",
    circleText: "text-white",
    circleLabel: "AT",
    btnBg: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
    btnText: "text-white",
    accentBorder: "border-blue-500/40 hover:border-blue-500",
  },
];

export default function NetworkSelectionSection({ products }: Props) {
  return (
    <section id="networks" className="py-6 sm:py-10 max-w-xl mx-auto px-4 w-full">
      {/* 3 Separate Cards Stacked Vertically: One on top, one in the middle, one down */}
      <div className="space-y-3.5 sm:space-y-4">
        {NETWORKS.map((net) => {
          const networkProducts = products.filter(
            (p) => p.is_active !== false && p.network.toLowerCase() === net.key
          );
          const startingPrice =
            networkProducts.length > 0
              ? Math.min(...networkProducts.map((p) => p.price))
              : null;

          return (
            <Link
              key={net.key}
              href={`/buy/${net.key}`}
              className={`group block rounded-3xl border-2 transition-all duration-300 overflow-hidden shadow-lg ${net.accentBorder} bg-slate-900/95 hover:bg-slate-900 p-4 sm:p-5 hover:scale-[1.01] active:scale-[0.99]`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: Circle Logo and Name */}
                <div className="flex items-center gap-3.5 sm:gap-4">
                  {/* Circle Logo (Yellow MTN, Red t, Blue AT) */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${net.circleBg} ${net.circleText} font-black flex items-center justify-center text-lg sm:text-xl shadow-lg shrink-0 border-2 border-white/20 group-hover:scale-105 transition-transform`}
                  >
                    {net.circleLabel}
                  </div>

                  {/* Title and Best Price Badge */}
                  <div className="flex flex-col text-left">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-amber-400 transition-colors">
                      {net.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        ★ Best Price
                      </span>
                      {startingPrice !== null && (
                        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                          • from ₵{startingPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Buy Now Button */}
                <div>
                  <span
                    className={`py-2 px-4 sm:py-2.5 sm:px-5 rounded-2xl font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all group-hover:shadow-lg ${net.btnBg} ${net.btnText}`}
                  >
                    <span>Buy Now</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
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
