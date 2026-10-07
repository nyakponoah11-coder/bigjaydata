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
} from "lucide-react";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

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
      fetchMessages();
    } catch (e) {
      console.error(e);
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
              Messages submitted from storefront live chat widget and support forms
            </p>
          </div>

          <button
            onClick={fetchMessages}
            className="self-start sm:self-auto py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2"
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
                  )},%20regarding%20your%20message%20to%20BundleMartGh:`
                : null;

              return (
                <div
                  key={m.id}
                  className={`bg-slate-900 border ${
                    m.is_read ? "border-slate-800" : "border-emerald-600/60 bg-emerald-950/10"
                  } rounded-3xl p-5 sm:p-6 shadow-lg space-y-3 transition-colors`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {m.name ? m.name[0] : "C"}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{m.name || "Customer"}</h4>
                        <span className="text-xs text-slate-400 font-mono">
                          {m.phone || "No phone provided"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                      {!m.is_read && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800">
                          New
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {m.message}
                  </p>

                  <div className="pt-2 flex items-center justify-between gap-3 text-xs">
                    <div>
                      {!m.is_read ? (
                        <button
                          onClick={() => handleMarkRead(m.id)}
                          className="text-xs text-slate-400 hover:text-emerald-400 font-medium flex items-center gap-1"
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
    </AdminLayout>
  );
}
