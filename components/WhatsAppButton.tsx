"use client";

import React, { useState } from "react";
import { MessageCircle, MessageSquare } from "lucide-react";
import LiveChatModal from "./LiveChatModal";

interface Props {
  whatsappNumber?: string;
  storeName?: string;
}

export default function WhatsAppButton({
  whatsappNumber = "233551234567",
  storeName = "BundleMartGh",
}: Props) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
  const defaultText = encodeURIComponent(
    `Hello ${storeName}, I want to buy data bundle / inquire about my order.`
  );

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 pointer-events-auto">
        {/* Live Chat Trigger Button */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="group flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:text-emerald-600 px-3.5 py-2 rounded-full shadow-lg hover:shadow-xl transition-all text-xs font-semibold"
          title="Open Live Chat"
        >
          <MessageSquare className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Live Chat</span>
        </button>

        {/* WhatsApp Direct Floating Button */}
        <a
          href={`https://wa.me/${cleanNumber}?text=${defaultText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-tr from-emerald-600 to-green-500 text-white rounded-full shadow-xl shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all duration-300"
          aria-label="Chat on WhatsApp"
        >
          {/* Subtle pulse ring */}
          <span className="absolute -inset-1 rounded-full bg-emerald-400 opacity-40 animate-ping pointer-events-none"></span>

          <MessageCircle className="w-7 h-7 relative z-10 fill-current" />

          {/* Tooltip on hover */}
          <span className="absolute right-full mr-3 whitespace-nowrap bg-slate-900 text-white text-xs font-medium py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md hidden sm:inline-block">
            Chat on WhatsApp
          </span>
        </a>
      </div>

      {/* Live Chat Support Modal */}
      <LiveChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        storeName={storeName}
        whatsappNumber={cleanNumber}
      />
    </>
  );
}
