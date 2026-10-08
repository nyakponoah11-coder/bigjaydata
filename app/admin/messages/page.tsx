"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Message } from "@/lib/db";
import {
  MessageSquare,
  CheckCircle,
  Phone,
  User,
  Clock,
  RefreshCw,
  MessageCircle,
  Send,
  Image as ImageIcon,
  X,
  ShieldCheck,
  Bot,
  Search,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface ConversationThread {
  id: string; // session_id or phone or single id
  sessionId?: string;
  customerName: string;
  phone: string;
  messages: Message[];
  latestMessageAt: string;
  unreadCount: number;
  hasAiReply: boolean;
  hasAdminReply: boolean;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 12000);
    return () => clearInterval(interval);
  }, []);

  // Format timestamp helper in 12-hour AM/PM format
  const formatTime12 = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime12 = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("en-US", {
        dateStyle: "short",
        timeStyle: "short",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Group messages into distinct customer conversations
  const conversations = useMemo<ConversationThread[]>(() => {
    const map = new Map<string, Message[]>();

    messages.forEach((m) => {
      const key = m.session_id
        ? `sess_${m.session_id}`
        : m.phone
        ? `phone_${m.phone.replace(/\D/g, "")}`
        : `msg_${m.id}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(m);
    });

    const threads: ConversationThread[] = [];

    map.forEach((threadMsgs, key) => {
      // Sort messages ascending chronologically for natural chat conversation reading
      const sorted = [...threadMsgs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Find best available name & phone
      let customerName = "Customer";
      let phone = "";
      let unreadCount = 0;
      let hasAiReply = false;
      let hasAdminReply = false;
      let sessionId: string | undefined = undefined;

      sorted.forEach((m) => {
        if (m.name && m.name !== "Customer" && customerName === "Customer") {
          customerName = m.name;
        }
        if (m.phone && !phone) {
          phone = m.phone;
        }
        if (m.session_id && !sessionId) {
          sessionId = m.session_id;
        }
        if (!m.is_read) unreadCount++;
        if (m.ai_reply) hasAiReply = true;
        if (m.reply) hasAdminReply = true;
      });

      const lastMsg = sorted[sorted.length - 1];

      threads.push({
        id: key,
        sessionId,
        customerName,
        phone,
        messages: sorted,
        latestMessageAt: lastMsg?.created_at || new Date().toISOString(),
        unreadCount,
        hasAiReply,
        hasAdminReply,
      });
    });

    // Sort conversations descending by latest activity
    threads.sort(
      (a, b) => new Date(b.latestMessageAt).getTime() - new Date(a.latestMessageAt).getTime()
    );

    return threads;
  }, [messages]);

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.messages.some(
          (m) =>
            m.message?.toLowerCase().includes(q) ||
            m.ai_reply?.toLowerCase().includes(q) ||
            m.reply?.toLowerCase().includes(q)
        )
    );
  }, [conversations, searchQuery]);

  // Currently active conversation
  const activeConversation = useMemo(() => {
    if (!selectedConvId) {
      return filteredConversations.length > 0 ? filteredConversations[0] : null;
    }
    return conversations.find((c) => c.id === selectedConvId) || filteredConversations[0] || null;
  }, [conversations, filteredConversations, selectedConvId]);

  const chatThreadContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottomChat = () => {
    if (chatThreadContainerRef.current) {
      chatThreadContainerRef.current.scrollTo({
        top: chatThreadContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Scroll to bottom only when selecting a conversation
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeConversation && activeConversation.id !== prevSelectedRef.current) {
      prevSelectedRef.current = activeConversation.id;
      setTimeout(scrollToBottomChat, 60);
    }
  }, [activeConversation?.id]);

  // Mark all unread messages in a conversation as read
  const handleMarkThreadRead = async (thread: ConversationThread) => {
    const unread = thread.messages.filter((m) => !m.is_read);
    if (unread.length === 0) return;

    for (const m of unread) {
      fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id }),
      }).catch(console.error);
    }

    setMessages((prev) =>
      prev.map((m) =>
        thread.messages.some((tm) => tm.id === m.id) ? { ...m, is_read: true } : m
      )
    );
  };

  // Select conversation and mark as read
  const handleSelectConversation = (thread: ConversationThread) => {
    setSelectedConvId(thread.id);
    if (thread.unreadCount > 0) {
      handleMarkThreadRead(thread);
    }
    setTimeout(scrollToBottomChat, 60);
  };

  // Send admin reply inside active conversation
  const handleSendReply = async () => {
    if (!activeConversation || !replyText.trim() || isReplying) return;

    // Pick latest message without an admin reply, or fallback to the latest message
    const targetMsg =
      [...activeConversation.messages].reverse().find((m) => !m.reply) ||
      activeConversation.messages[activeConversation.messages.length - 1];

    if (!targetMsg) return;

    const text = replyText.trim();
    setIsReplying(true);

    try {
      const res = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetMsg.id,
          action: "reply",
          reply: text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetMsg.id
              ? {
                  ...m,
                  reply: text,
                  replied_at: new Date().toISOString(),
                  is_read: true,
                }
              : m
          )
        );
        setReplyText("");
        setTimeout(scrollToBottomChat, 60);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsReplying(false);
    }
  };

  const totalUnreadMessages = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Customer Conversations</span>
              {totalUnreadMessages > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                  {totalUnreadMessages} new
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live threaded conversations between customers, Big J Support, and admin staff
            </p>
          </div>

          <button
            onClick={fetchMessages}
            className="self-start sm:self-auto py-2 px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* INBOX SPLIT-PANE CONTAINER */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[680px] h-[80vh] max-h-[860px]">
          {/* LEFT PANE: CONVERSATION LIST */}
          <div
            className={`lg:w-80 xl:w-96 border-r border-slate-800 flex flex-col bg-[#0b1320] ${
              selectedConvId ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Search and Filter */}
            <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats, phones, names..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1 font-medium">
                <span>{filteredConversations.length} Conversations</span>
                <span>Sorted by latest</span>
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs">No conversations found.</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = activeConversation?.id === conv.id;
                  const lastMsg = conv.messages[conv.messages.length - 1];

                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-3.5 sm:p-4 cursor-pointer transition-all flex items-start gap-3 relative ${
                        isSelected
                          ? "bg-slate-800/90 border-l-4 border-l-amber-400"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700/70 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0 shadow-inner">
                        {conv.customerName ? conv.customerName[0]?.toUpperCase() : "C"}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1 mb-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {conv.customerName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatTime12(conv.latestMessageAt)}
                          </span>
                        </div>

                        {conv.phone && (
                          <div className="text-[11px] text-slate-400 font-mono mb-1 truncate">
                            {conv.phone}
                          </div>
                        )}

                        <p className="text-xs text-slate-400 truncate leading-snug">
                          {lastMsg?.message || "No messages"}
                        </p>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {conv.unreadCount > 0 && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                              {conv.unreadCount} new
                            </span>
                          )}
                          {conv.hasAiReply && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-800/40 flex items-center gap-1">
                              <Bot className="w-2.5 h-2.5" />
                              Big J Replied
                            </span>
                          )}
                          {conv.hasAdminReply && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-950/80 text-sky-400 border border-sky-800/40 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              Admin Replied
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 font-mono ml-auto">
                            {conv.messages.length} msg{conv.messages.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE: ACTIVE CONVERSATION THREAD */}
          <div
            className={`flex-1 flex flex-col bg-[#080d16] ${
              !selectedConvId ? "hidden lg:flex" : "flex"
            }`}
          >
            {activeConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-3.5 sm:p-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Back Button on Mobile */}
                    <button
                      onClick={() => setSelectedConvId(null)}
                      className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                      title="Back to conversation list"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-sm flex items-center justify-center shrink-0">
                      {activeConversation.customerName[0]?.toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                          {activeConversation.customerName}
                        </h3>
                        {activeConversation.unreadCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            Unread
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono truncate">
                        <span>{activeConversation.phone || "No phone provided"}</span>
                        {activeConversation.sessionId && (
                          <span className="text-[10px] text-slate-400">
                            • Session: {activeConversation.sessionId.slice(0, 12)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activeConversation.unreadCount > 0 && (
                      <button
                        onClick={() => handleMarkThreadRead(activeConversation)}
                        className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Mark Read
                      </button>
                    )}

                    {activeConversation.phone && (
                      <a
                        href={`https://wa.me/${
                          activeConversation.phone.replace(/\D/g, "").startsWith("0")
                            ? "233" + activeConversation.phone.replace(/\D/g, "").slice(1)
                            : activeConversation.phone.replace(/\D/g, "")
                        }?text=Hello%20${encodeURIComponent(
                          activeConversation.customerName
                        )},%20regarding%20your%20inquiry%20to%20support:`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* THREAD MESSAGES CHAT CONTAINER */}
                <div ref={chatThreadContainerRef} className="flex-1 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4">
                  <div className="text-center my-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
                      Conversation started on {formatDateTime12(activeConversation.messages[0]?.created_at || "")}
                    </span>
                  </div>

                  {activeConversation.messages.map((m) => (
                    <div key={m.id} className="space-y-3">
                      {/* 1. CUSTOMER MESSAGE BUBBLE */}
                      <div className="flex flex-col items-start max-w-[88%] sm:max-w-[80%]">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                          <span className="font-bold text-slate-300">
                            {activeConversation.customerName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            • {formatTime12(m.created_at)}
                          </span>
                        </div>

                        <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-white shadow-md leading-relaxed whitespace-pre-wrap rounded-tl-xs">
                          {m.message}

                          {/* Customer Image Attachment */}
                          {m.image_url && (
                            <div className="mt-3 pt-2 border-t border-slate-700/60">
                              <div className="text-[10px] text-amber-300 font-semibold mb-1 flex items-center gap-1">
                                <ImageIcon className="w-3 h-3 text-amber-400" />
                                Customer Attached Screenshot:
                              </div>
                              <div
                                onClick={() => setPreviewImage(m.image_url!)}
                                className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-xl overflow-hidden border border-slate-600 bg-black cursor-pointer hover:border-amber-400 transition-all group shadow-md"
                              >
                                <img
                                  src={m.image_url}
                                  alt="Attachment"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                  Click to Enlarge
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. BIG J SUPPORT INSTANT REPLY (IF AI RESPONDED) */}
                      {m.ai_reply && (
                        <div className="flex flex-col items-end max-w-[88%] sm:max-w-[80%] ml-auto">
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold mb-1 px-1">
                            <Bot className="w-3 h-3 text-amber-400" />
                            <span>Big J Support</span>
                            <span className="font-mono text-[10px] text-slate-400 font-normal">
                              • {formatTime12(m.ai_replied_at || m.created_at)}
                            </span>
                          </div>

                          <div className="bg-[#1b190f] border border-amber-600/40 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-amber-100 shadow-md leading-relaxed whitespace-pre-wrap rounded-tr-xs">
                            {m.ai_reply}
                          </div>
                        </div>
                      )}

                      {/* 3. ADMIN HUMAN REPLY (IF SENT) */}
                      {m.reply && (
                        <div className="flex flex-col items-end max-w-[88%] sm:max-w-[80%] ml-auto">
                          <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-bold mb-1 px-1">
                            <ShieldCheck className="w-3 h-3 text-sky-400" />
                            <span>Admin Reply</span>
                            <span className="font-mono text-[10px] text-slate-400 font-normal">
                              • {formatTime12(m.replied_at || m.created_at)}
                            </span>
                          </div>

                          <div className="bg-[#0b1d28] border border-sky-500/40 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-sky-100 shadow-md leading-relaxed whitespace-pre-wrap rounded-tr-xs">
                            {m.reply}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* BOTTOM ADMIN REPLY INPUT BAR */}
                <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-950/80 shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder={`Reply to ${activeConversation.customerName} (they will see it in the Help room)...`}
                      className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700/80 focus:border-amber-400 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none transition-colors shadow-inner"
                    />

                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || isReplying}
                      className="px-4 sm:px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95"
                    >
                      <Send className="w-4 h-4 text-slate-950" />
                      <span className="hidden sm:inline">
                        {isReplying ? "Sending..." : "Send Reply"}
                      </span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 px-1">
                    Replies appear live on the customer's `/help` screen automatically.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-white">No Conversation Selected</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Select a conversation from the left to view the complete customer chat history and send replies.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULL IMAGE LIGHTBOX MODAL */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-3 shadow-2xl overflow-hidden flex flex-col items-center"
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/90 text-white hover:bg-slate-700 flex items-center justify-center z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Attachment Full View"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
