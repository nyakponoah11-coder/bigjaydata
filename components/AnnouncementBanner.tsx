"use client";

import React from "react";
import { Sparkles, Zap } from "lucide-react";

interface Props {
  text?: string;
  isActive?: boolean;
}

export default function AnnouncementBanner({
  text = "⚡ Instant Delivery Guarantee: MTN, Telecel & AT packages delivered in under 60 seconds! 24/7 Automated.",
  isActive = true,
}: Props) {
  if (!isActive || !text) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-xs sm:text-sm font-medium py-2 px-4 shadow-sm overflow-hidden relative border-b border-emerald-500/30">
      <div className="flex items-center gap-3">
        <span className="shrink-0 flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase">
          <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          Alert
        </span>

        {/* Rolling Marquee text */}
        <div className="relative w-full overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee pl-4">
            <span className="inline-flex items-center gap-2">
              {text}
              <Sparkles className="w-3.5 h-3.5 text-amber-300 inline" />
              <span className="opacity-75">|</span>
              <span className="text-emerald-100 font-normal">Need assistance? Tap the floating WhatsApp button anytime!</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
