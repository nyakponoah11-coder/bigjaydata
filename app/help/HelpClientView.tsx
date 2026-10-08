"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bot,
  Send,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  User,
  Phone,
  ArrowLeft,
  Paperclip,
} from "lucide-react";

interface Props {
  storeName?: string;
  whatsappNumber?: string;
  whatsappChannelUrl?: string;
  supportPhone?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "admin";
  text: string;
  imageUrl?: string;
  timestamp: string;
  repliedAt?: string;
}

export default function HelpClientView({
  storeName = "BundleMartGh",
  whatsappNumber = "233551234567",
  whatsappChannelUrl = "",
  supportPhone = "+233 55 123 4567",
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showProfileInputs, setShowProfileInputs] = useState(false);
  const [fullImageModal, setFullImageModal] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const prevMessagesSig = useRef("");

  // Helper to scroll internal chat container only - NEVER scrolls the outer page or window!
  const scrollToBottom = (smooth = true) => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  // Monitor chat container scroll so manual user scrolling is preserved
  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If user is more than 70px above bottom, they have deliberately scrolled up to read past history
    isUserScrolledUpRef.current = distanceToBottom > 70;
  };

  // Initialize or restore session ID & details
  const HELP_CHAT_KEY = "bmgh_help_chat_history";

  useEffect(() => {
    if (typeof window !== "undefined") {
      let sId = localStorage.getItem("bmgh_help_session_id");
      if (!sId) {
        sId = "sess_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("bmgh_help_session_id", sId);
      }
      setSessionId(sId);

      const savedName = localStorage.getItem("bmgh_help_customer_name") || "";
      const savedPhone = localStorage.getItem("bmgh_help_customer_phone") || "";
      setCustomerName(savedName);
      setCustomerPhone(savedPhone);

      // Load cached chat history from unified key or session key
      const cachedChat =
        localStorage.getItem(HELP_CHAT_KEY) ||
        localStorage.getItem("bmgh_help_chat_" + sId);
      let initialLoaded = false;
      if (cachedChat) {
        try {
          const parsed = JSON.parse(cachedChat);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            initialLoaded = true;
          }
        } catch {
          // ignore parsing error
        }
      }

      if (!initialLoaded) {
        const initialWelcome: ChatMessage = {
          id: "welcome-1",
          sender: "ai",
          text: `Hello bossu! 👋 Welcome to ${storeName} Help & Live Support Room.\n\nHow can we help you today? You can:\n• Type your message or questions below\n• Attach screenshots (MoMo debit SMS, receipts, or errors)\n• Ask about bundle prices or track an order reference\n\nBig J Support responds instantly, and our support team monitors all messages right here!`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        };
        setMessages([initialWelcome]);
      }

      // Fetch existing messages for this session
      fetchExistingMessages(sId, true);
    }
  }, [storeName]);

  const fetchExistingMessages = async (sId: string, isInitial = false) => {
    try {
      const res = await fetch(`/api/messages?sessionId=${encodeURIComponent(sId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        // Transform fetched messages into chat bubble format
        const loaded: ChatMessage[] = [];
        const ascMessages = [...data.messages].reverse();

        ascMessages.forEach((m: any) => {
          // User message
          loaded.push({
            id: m.id,
            sender: "user",
            text: m.message,
            imageUrl: m.image_url,
            timestamp: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
          });

          // If Big J Support has replied to this message
          if (m.ai_reply) {
            loaded.push({
              id: `ai-reply-${m.id}`,
              sender: "ai",
              text: m.ai_reply,
              timestamp: m.ai_replied_at
                ? new Date(m.ai_replied_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                : "Just now",
            });
          }

          // If admin has replied to this message, add admin bubble right after it
          if (m.reply) {
            loaded.push({
              id: `admin-reply-${m.id}`,
              sender: "admin",
              text: m.reply,
              timestamp: m.replied_at
                ? new Date(m.replied_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                : "Just now",
            });
          }
        });

        // Compute signature to check if anything actually changed on server
        const signature = loaded.map((m) => `${m.id}_${m.text}`).join("|");
        if (signature === prevMessagesSig.current && !isInitial) {
          return;
        }
        prevMessagesSig.current = signature;

        setMessages((prev) => {
          const welcome = prev.find((x) => x.id === "welcome-1");

          // Keep all messages in state that are not yet in loaded
          const uncommitted = prev.filter(
            (p) =>
              p.id !== "welcome-1" &&
              !loaded.some(
                (l) => l.id === p.id || (l.sender === p.sender && l.text.trim() === p.text.trim())
              )
          );

          const combined = welcome ? [welcome, ...loaded, ...uncommitted] : [...loaded, ...uncommitted];

          if (typeof window !== "undefined") {
            localStorage.setItem(HELP_CHAT_KEY, JSON.stringify(combined));
            if (sId) localStorage.setItem("bmgh_help_chat_" + sId, JSON.stringify(combined));
          }
          return combined;
        });

        if (!isUserScrolledUpRef.current || isInitial) {
          setTimeout(() => scrollToBottom(!isInitial), 60);
        }
      }
    } catch (err) {
      console.warn("Failed to load past session messages", err);
    }
  };

  // Poll for admin replies every 6 seconds without disrupting scroll
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      fetchExistingMessages(sessionId, false);
    }, 6000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Handle Image File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image file is too large. Please select an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const userText = (textToSend || input).trim();
    const attachedImage = imagePreview;

    if ((!userText && !attachedImage) || loading) return;

    // Save name/phone to localStorage if entered
    if (customerName) localStorage.setItem("bmgh_help_customer_name", customerName);
    if (customerPhone) localStorage.setItem("bmgh_help_customer_phone", customerPhone);

    const userMsgId = "u-" + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: userText || "Attached image",
      imageUrl: attachedImage || undefined,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    };

    let activeSessionId = sessionId;
    if (!activeSessionId && typeof window !== "undefined") {
      activeSessionId = localStorage.getItem("bmgh_help_session_id") || "";
      if (!activeSessionId) {
        activeSessionId = "sess_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("bmgh_help_session_id", activeSessionId);
      }
      setSessionId(activeSessionId);
    }

    setMessages((prev) => {
      const next = [...prev, userMsg];
      if (typeof window !== "undefined") {
        localStorage.setItem(HELP_CHAT_KEY, JSON.stringify(next));
        if (activeSessionId) localStorage.setItem("bmgh_help_chat_" + activeSessionId, JSON.stringify(next));
      }
      return next;
    });
    setInput("");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    isUserScrolledUpRef.current = false;
    setTimeout(() => scrollToBottom(true), 40);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        sender: m.sender === "admin" ? "assistant" : m.sender,
        text: m.text,
      }));

      // Atomic call: saves customer message and attaches AI reply in one transaction
      const aiRes = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText || "Attached screenshot/image",
          sessionId: activeSessionId,
          customerName: customerName.trim() || "Customer",
          customerPhone: customerPhone.trim() || "",
          imageUrl: attachedImage || undefined,
          history: historyPayload,
        }),
      });

      const aiData = await aiRes.json().catch(() => ({}));
      if (aiData.reply) {
        const aiMsg: ChatMessage = {
          id: "ai-" + (aiData.messageId || Date.now()),
          sender: "ai",
          text: aiData.reply,
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        };

        setMessages((prev) => {
          const next = [...prev, aiMsg];
          if (typeof window !== "undefined") {
            localStorage.setItem(HELP_CHAT_KEY, JSON.stringify(next));
            if (activeSessionId) localStorage.setItem("bmgh_help_chat_" + activeSessionId, JSON.stringify(next));
          }
          return next;
        });

        if (!isUserScrolledUpRef.current) {
          setTimeout(() => scrollToBottom(true), 50);
        }
      }
    } catch (err: any) {
      console.error("AI Chat call error:", err);
      setMessages((prev) => {
        const next: ChatMessage[] = [
          ...prev,
          {
            id: "err-" + Date.now(),
            sender: "ai",
            text: "Your message has been sent to our desk bossu! If urgent, you can also reach us directly on WhatsApp.",
            timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
          },
        ];
        if (typeof window !== "undefined") {
          localStorage.setItem(HELP_CHAT_KEY, JSON.stringify(next));
          if (activeSessionId) localStorage.setItem("bmgh_help_chat_" + activeSessionId, JSON.stringify(next));
        }
        return next;
      });
      if (!isUserScrolledUpRef.current) {
        setTimeout(() => scrollToBottom(true), 50);
      }
    } finally {
      setLoading(false);
    }
  };

  const cleanNumber = (whatsappNumber || "233551234567").replace(/[^0-9]/g, "");
  const rawChannel = (whatsappChannelUrl || "").trim();
  const formattedChannel = rawChannel
    ? rawChannel.startsWith("http://") || rawChannel.startsWith("https://")
      ? rawChannel
      : `https://${rawChannel}`
    : "";
  const channelLink = formattedChannel || `https://wa.me/${cleanNumber}`;

  const quickPrompts = [
    { label: "💰 MTN Prices", prompt: "What are the rates for MTN data bundles?" },
    { label: "⚡ Telecel Rates", prompt: "What are the bundle options for Telecel?" },
    { label: "🔍 Track Order", prompt: "I would like to track my order delivery status" },
    { label: "⏱️ Delivery Speed", prompt: "How fast do bundles get delivered to my phone?" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={channelLink}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-900/30"
            title={formattedChannel ? "Join WhatsApp Channel" : "WhatsApp Care"}
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>{formattedChannel ? "WhatsApp Channel" : "WhatsApp Care"}</span>
          </a>

          <Link
            href="/track"
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            Track Order
          </Link>
        </div>
      </div>

      {/* Main Help Card Container */}
      <div className="bg-[#0b1320] border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[78vh] sm:h-[680px]">
        {/* ROOM HEADER */}
        <div className="bg-gradient-to-r from-emerald-800/90 via-teal-900/90 to-slate-900 p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-extrabold text-sm sm:text-base leading-tight">
                  {storeName} Help & Live Support Room
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-400/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  Big J Support
                </span>
              </div>
              <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Upload screenshots, chat with Big J Support, or message store staff
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowProfileInputs(!showProfileInputs)}
            className="py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            title="Edit contact name & phone"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {customerName ? customerName : "My Info"}
            </span>
          </button>
        </div>

        {/* CUSTOMER CONTACT INFO DROPDOWN BAR */}
        {showProfileInputs && (
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center gap-3 text-xs shrink-0 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Your Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Your Phone Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowProfileInputs(false)}
              className="py-1 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500"
            >
              Done
            </button>
          </div>
        )}

        {/* CHAT MESSAGES SCROLL AREA */}
        <div
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 bg-gradient-to-b from-slate-950 via-[#0a111e] to-slate-950"
        >
          {messages.map((m) => {
            const isUser = m.sender === "user";
            const isAdmin = m.sender === "admin";

            return (
              <div
                key={m.id}
                className={`flex flex-col ${
                  isUser ? "items-end" : "items-start"
                } space-y-1.5 max-w-[88%] sm:max-w-[78%] ${
                  isUser ? "ml-auto" : "mr-auto"
                }`}
              >
                {/* Sender badge */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                  {isAdmin ? (
                    <span className="font-bold text-sky-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-sky-400" />
                      Admin Support Team
                    </span>
                  ) : !isUser ? (
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Bot className="w-3 h-3 text-emerald-400" />
                      Big J Support
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-300">You</span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono">
                    • {m.timestamp}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                    isUser
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-xs"
                      : isAdmin
                      ? "bg-slate-900 border-2 border-sky-500 text-white font-medium rounded-tl-xs shadow-sky-950/40"
                      : "bg-slate-900/90 border border-slate-700/80 text-slate-100 rounded-tl-xs"
                  }`}
                >
                  {/* Uploaded Image inside message */}
                  {m.imageUrl && (
                    <div className="mb-2.5">
                      <img
                        src={m.imageUrl}
                        alt="Uploaded Attachment"
                        onClick={() => setFullImageModal(m.imageUrl!)}
                        className="max-h-48 sm:max-h-60 rounded-xl object-contain border border-black/20 cursor-pointer hover:opacity-95 transition-opacity bg-black/20"
                      />
                      <span className="text-[10px] opacity-75 mt-1 block">
                        (Click image to enlarge)
                      </span>
                    </div>
                  )}

                  {m.text}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-center gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Thinking & saving message...</span>
            </div>
          )}
        </div>

        {/* QUICK SUGGESTIONS CHIPS */}
        <div className="p-2 sm:px-4 bg-slate-950/90 border-t border-slate-800/80 overflow-x-auto flex items-center gap-1.5 shrink-0 no-scrollbar">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={loading}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-semibold transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* IMAGE PREVIEW BEFORE SENDING */}
        {imagePreview && (
          <div className="px-4 py-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-400 bg-black shrink-0">
                <img
                  src={imagePreview}
                  alt="Upload Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Attached Screenshot</p>
                <p className="text-[10px] text-slate-400">
                  Ready to send to support
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MESSAGE INPUT & ATTACHMENT CONTROLS */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Upload Image Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 sm:px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 rounded-2xl text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Upload image / screenshot"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">
                Photo
              </span>
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message, ask a question, or attach screenshot..."
              className="flex-1 px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!input.trim() && !imagePreview) || loading}
              className="p-2.5 sm:px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:hover:from-emerald-500 disabled:hover:to-teal-500 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Send</span>
            </button>
          </form>

          {/* Privacy & Guarantee footer */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>🔒 Messages & payment screenshots are transmitted securely</span>
            <span>Telco Care: {supportPhone}</span>
          </div>
        </div>
      </div>

      {/* FULL IMAGE MODAL */}
      {fullImageModal && (
        <div
          onClick={() => setFullImageModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-3 shadow-2xl overflow-hidden flex flex-col items-center"
          >
            <button
              onClick={() => setFullImageModal(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/90 text-white hover:bg-slate-700 flex items-center justify-center z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={fullImageModal}
              alt="Enlarged Attachment"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
