"use client";

import React, { useState, useRef, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Bot,
  Send,
  Terminal,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  actionTaken?: string;
  toolParams?: any;
  timestamp: string;
}

export default function AdminAIAgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro-1",
      sender: "ai",
      text: 'Done bossu, I am your BundleMartGh AI Action Agent. You can give me direct instructions and I will execute them immediately on the database and send SMS notifications.\n\nTry commands like:\n• "mark order BMGH-98234120 as delivered"\n• "send SMS to 0554128901 saying your 5GB MTN data is ready"\n• "check order BMGH-98234120"\n• "refund order BMGH-77123984"\n• "how many orders today?"',
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendCommand = async (commandText: string) => {
    const prompt = commandText.trim();
    if (!prompt) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      const aiReply: ChatMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: data.reply || "Done bossu, command processed.",
        actionTaken: data.actionTaken,
        toolParams: data.toolParams,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "ai",
          text: "Sorry bossu, error occurred executing that command. Please check server logs.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendCommand(input);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto flex flex-col h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                AI Agent Action Terminal
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Natural Language Action Executor: Takes actions, updates DB status, sends SMS, and confirms with "Done bossu"
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
              Tools: updateOrderStatus • sendSMS • getOrderDetails • refundOrder
            </span>
          </div>
        </div>

        {/* Quick Prompt Suggestions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider shrink-0">
            Presets:
          </span>
          <button
            onClick={() => handleSendCommand("mark order BMGH-98234120 as delivered")}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs whitespace-nowrap transition-colors"
          >
            "mark order BMGH-98234120 as delivered"
          </button>
          <button
            onClick={() => handleSendCommand("send SMS to 0554128901 saying your 5GB data has arrived")}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs whitespace-nowrap transition-colors"
          >
            "send SMS to 0554128901..."
          </button>
          <button
            onClick={() => handleSendCommand("details of BMGH-98234120")}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs whitespace-nowrap transition-colors"
          >
            "details of BMGH-98234120"
          </button>
          <button
            onClick={() => handleSendCommand("how many orders today?")}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs whitespace-nowrap transition-colors"
          >
            "how many orders today?"
          </button>
        </div>

        {/* Chat / Terminal Window */}
        <div className="flex-1 min-h-0 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden">
          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((m) => {
              const isAi = m.sender === "ai";

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs ${
                    isAi ? "items-start" : "items-start flex-row-reverse"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isAi
                        ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/20"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {isAi ? <Bot className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-xl rounded-2xl p-4 space-y-2 ${
                      isAi
                        ? "bg-slate-800/80 border border-slate-700/80 text-slate-100"
                        : "bg-emerald-600 text-white font-medium shadow-md shadow-emerald-600/20"
                    }`}
                  >
                    {/* Tool Execution Tag */}
                    {m.actionTaken && m.actionTaken !== "help" && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md w-fit">
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>Action Executed: {m.actionTaken}()</span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap leading-relaxed font-sans">
                      {m.text}
                    </div>

                    <div
                      className={`text-[9px] ${
                        isAi ? "text-slate-400" : "text-emerald-100"
                      } text-right`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-slate-800/40 p-3 rounded-2xl w-fit">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing action on BundleMartGh database...</span>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={handleFormSubmit}
            className="mt-4 pt-3 border-t border-slate-800 flex gap-2 shrink-0"
          >
            <input
              type="text"
              required
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Type action command (e.g. "mark order BMGH-98234120 as delivered")...'
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Execute</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
