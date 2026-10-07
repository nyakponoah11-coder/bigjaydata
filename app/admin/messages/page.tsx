"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Message } from "@/lib/db";
import {
  MessageSquare,
  CheckCircle,
  Phone,
  User,
  Clock,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Send,
  Image as ImageIcon,
  X,
  CornerDownRight,
  ShieldCheck,
} from "lucide-react";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
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
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async (id: string) => {
    const text = replyTextMap[id]?.trim();
    if (!text || replyingId) return;

    setReplyingId(id);
    try {
      const res = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "reply",
          reply: text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  reply: text,
                  replied_at: new Date().toISOString(),
                  is_read: true,
                }
              : m
          )
        );
        setReplyTextMap((prev) => ({ ...prev, [id]: "" }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReplyingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Customer Inquiries & Live Chat
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live customer messages, screenshots, and direct admin replies from the storefront help room
            </p>
          </div>

          <button
            onClick={fetchMessages}
            className="self-start sm:self-auto py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Messages List */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-sm">No customer messages received yet.</p>
            </div>
          ) : (
            messages.map((m) => {
              const cleanPhone = m.phone ? m.phone.replace(/[^0-9]/g, "") : "";
              const waUrl = cleanPhone
                ? `https://wa.me/${cleanPhone.startsWith("0") ? "233" + cleanPhone.slice(1) : cleanPhone}?text=Hello%20${encodeURIComponent(
                    m.name || "Customer"
                  )},%20regarding%20your%20message%20to%20support:`
                : null;

              return (
                <div
                  key={m.id}
                  className={`bg-slate-900 border ${
                    !m.is_read
                      ? "border-emerald-500/60 bg-emerald-950/15"
                      : "border-slate-800"
                  } rounded-3xl p-5 sm:p-6 shadow-lg space-y-4 transition-colors`}
                >
                  {/* Message Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {m.name ? m.name[0]?.toUpperCase() : "C"}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {m.name || "Customer"}
                        </h4>
                        <span className="text-xs text-slate-400 font-mono">
                          {m.phone || "No phone provided"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                      {!m.is_read && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800">
                          New
                        </span>
                      )}
                      {m.reply ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-950 text-sky-400 px-2 py-0.5 rounded-full border border-sky-800">
                          Replied
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-400 px-2 py-0.5 rounded-full border border-amber-800">
                          Awaiting Reply
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Body */}
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {m.message}
                  </p>

                  {/* Customer Attached Image (e.g. MoMo screenshot or delivery proof) */}
                  {m.image_url && (
                    <div className="pt-1">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        Customer Attached Screenshot / Image:
                      </div>
                      <div
                        onClick={() => setPreviewImage(m.image_url!)}
                        className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 group cursor-pointer hover:border-amber-400 transition-all shadow-md"
                      >
                        <img
                          src={m.image_url}
                          alt="Customer Attachment"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                          Click to Enlarge
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing Admin Reply */}
                  {m.reply && (
                    <div className="p-3.5 bg-slate-950/80 border border-emerald-800/50 rounded-2xl space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Admin Reply Sent:
                        </span>
                        {m.replied_at && (
                          <span className="text-slate-500 font-normal">
                            {new Date(m.replied_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {m.reply}
                      </p>
                    </div>
                  )}

                  {/* Inline Admin Reply Form */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <CornerDownRight className="w-3.5 h-3.5 text-sky-400" />
                      {m.reply ? "Send Another / Update Reply:" : "Reply to Customer:"}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={replyTextMap[m.id] || ""}
                        onChange={(e) =>
                          setReplyTextMap((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSendReply(m.id);
                          }
                        }}
                        placeholder="Type reply to customer (they will see it in the Help room)..."
                        className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendReply(m.id)}
                        disabled={!replyTextMap[m.id]?.trim() || replyingId === m.id}
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{replyingId === m.id ? "Sending..." : "Send Reply"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      {!m.is_read ? (
                        <button
                          onClick={() => handleMarkRead(m.id)}
                          className="text-xs text-slate-400 hover:text-emerald-400 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark as Read
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                          Read
                        </span>
                      )}
                    </div>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Reply on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FULL IMAGE PREVIEW MODAL */}
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
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/90 text-white hover:bg-slate-700 flex items-center justify-center z-10"
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
