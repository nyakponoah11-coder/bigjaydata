"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

interface Props {
  whatsappNumber?: string;
  whatsappChannelUrl?: string;
  storeName?: string;
}

export default function WhatsAppButton({
  whatsappNumber = "233551234567",
  whatsappChannelUrl = "",
  storeName = "BundleMartGh",
}: Props) {
  const cleanNumber = (whatsappNumber || "233551234567").replace(/[^0-9]/g, "");
  const defaultText = encodeURIComponent(
    `Hello ${storeName}, I want to make an inquiry about data bundles.`
  );

  const rawChannel = (whatsappChannelUrl || "").trim();
  const formattedChannel = rawChannel
    ? rawChannel.startsWith("http://") || rawChannel.startsWith("https://")
      ? rawChannel
      : `https://${rawChannel}`
    : "";

  // The floating button links directly to the WhatsApp Channel when configured!
  const targetUrl =
    formattedChannel ||
    `https://wa.me/${cleanNumber}?text=${defaultText}`;

  return (
    <div className="fixed bottom-5 right-5 z-40 pointer-events-auto">
      {/* WhatsApp Channel Direct Floating Button */}
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-tr from-emerald-600 to-green-500 text-white rounded-full shadow-2xl shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-emerald-300/40"
        aria-label={formattedChannel ? "Join WhatsApp Channel" : "Chat on WhatsApp"}
        title={formattedChannel ? "Join WhatsApp Channel" : "Chat on WhatsApp"}
      >
        {/* Subtle pulse ring */}
        <span className="absolute -inset-1 rounded-full bg-emerald-400 opacity-40 animate-ping pointer-events-none"></span>

        <MessageCircle className="w-7 h-7 relative z-10 fill-current" />

        {/* Tooltip on hover */}
        <span className="absolute right-full mr-3 whitespace-nowrap bg-slate-950 border border-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl hidden sm:inline-block">
          {formattedChannel ? "Join WhatsApp Channel" : "Chat on WhatsApp"}
        </span>
      </a>
    </div>
  );
}

