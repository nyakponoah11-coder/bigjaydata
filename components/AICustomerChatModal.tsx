"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Send,
  X,
  Loader2,
  Sparkles,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  Search,
  Zap,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
  whatsappNumber?: string;
  whatsappChannelUrl?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  provider?: string;
  modelUsed?: string;
  timestamp: string;
}

export default function AICustomerChatModal({
  isOpen,
  onClose,
  storeName = "BundleMartGh",
  whatsappNumber = "233551234567",
  whatsappChannelUrl = "",
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: `Hello bossu! 👋 Welcome to ${storeName}.\n\nI am your 24/7 AI Customer Support Specialist. How can I help you today? You can ask me:\n• "What are the prices for MTN 5GB or 10GB?"\n• "Track my order BMGH-xxxxxxxx or 055xxxxxxx"\n• "How long does delivery take?"\n• "Can I buy Telecel or AT bundles?"`,
      provider: "gemini",
      modelUsed: "AI Assistant",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        if (chatAreaRef.current) {
          chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const userText = (textToSend || input).trim();
    if (!userText || loading) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      const aiReply: ChatMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: data.reply || "Done bossu! How else may I assist you?",
        provider: data.provider,
        modelUsed: data.modelUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "ai",
          text: `Sorry bossu, I had a brief network glitch. You can also chat directly with our human team on WhatsApp at +${whatsappNumber}!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const channelLink = whatsappChannelUrl || `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`;

  const quickPrompts = [
    { label: "💰 MTN Prices", prompt: "What are the prices for MTN data bundles?" },
    { label: "⚡ Telecel Prices", prompt: "What are the rates for Telecel data?" },
    { label: "🔍 Track Order", prompt: "I want to track my data order status" },
    { label: "⏱️ Delivery Speed", prompt: "How long does automated data delivery take?" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b1320] border border-slate-800 text-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[88vh] sm:h-[650px] shadow-2xl flex flex-col overflow-hidden relative">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 p-4 sm:p-5 flex items-center justify-between border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black/40 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Bot className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#0b1320] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  {storeName} AI Support
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  Live AI
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                <span>Instant help • Model rotating engine</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close Help Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MESSAGES SCROLL AREA */}
        <div ref={chatAreaRef} className="flex-1 p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 text-xs sm:text-sm font-sans">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 sm:p-4 leading-relaxed whitespace-pre-wrap shadow-md ${
                  m.sender === "user"
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-semibold rounded-br-none"
                    : "bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none"
                }`}
              >
                {m.text}
              </div>

              <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-500 font-mono">
                <span>{m.timestamp}</span>
                {m.sender === "ai" && m.provider && (
                  <span className="text-emerald-400/80 font-bold uppercase">
                    • {m.provider}
                  </span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-3 bg-slate-900/60 rounded-xl w-fit border border-slate-800 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>AI assistant is typing...</span>
            </div>
          )}
        </div>

        {/* QUICK SUGGESTIONS CAROUSEL */}
        <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q.prompt)}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* INPUT BOX & WHATSAPP CHANNEL LINK */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask anything (e.g. MTN prices, track order)..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-40 flex items-center justify-center shrink-0"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Bottom WhatsApp Channel Direct Link */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="truncate">Need human agent takeover?</span>
            <a
              href={channelLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold ml-2 underline shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Channel ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
