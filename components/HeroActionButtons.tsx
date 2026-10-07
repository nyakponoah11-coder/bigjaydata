"use client";

import React from "react";
import Link from "next/link";
import { Zap, Search, Bot } from "lucide-react";

interface Props {
  storeName?: string;
  whatsappNumber?: string;
  whatsappChannelUrl?: string;
}

export default function HeroActionButtons({
  storeName = "BundleMartGh",
  whatsappNumber = "233551234567",
  whatsappChannelUrl = "",
}: Props) {
  return (
    <div className="relative mt-7 sm:mt-8 w-full max-w-xl mx-auto grid grid-cols-3 gap-2 sm:gap-3.5">
      {/* 1. BUY */}
      <a
        href="#networks"
        className="w-full py-3 sm:py-3.5 px-2 sm:px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-xs sm:text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95"
      >
        <Zap className="w-4 h-4 fill-current text-slate-950 shrink-0" />
        <span>Buy</span>
      </a>

      {/* 2. TRACK */}
      <Link
        href="/track"
        className="w-full py-3 sm:py-3.5 px-2 sm:px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-white font-black text-xs sm:text-base shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95"
      >
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <span>Track</span>
      </Link>

      {/* 3. HELP (DEDICATED SUPPORT ROOM) */}
      <Link
        href="/help"
        className="w-full py-3 sm:py-3.5 px-2 sm:px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 border border-emerald-400/30"
      >
        <Bot className="w-4 h-4 text-emerald-300 shrink-0" />
        <span>Help</span>
      </Link>
    </div>
  );
}
