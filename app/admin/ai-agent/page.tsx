"use client";

import React, { useState, useRef, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Bot,
  Send,
  Sparkles,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
  Eye,
  EyeOff,
  Terminal,
  Save,
  MessageSquare,
  Zap,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  provider?: string;
  modelUsed?: string;
  actionTaken?: string;
  timestamp: string;
}

export default function AdminAIAgentPage() {
  const [activeTab, setActiveTab] = useState<"keys" | "chat">("keys");

  // AI Provider Keys and Models State
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.8-flash");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [grokKey, setGrokKey] = useState("");
  const [grokModel, setGrokModel] = useState("grok-2-latest");
  const [showGrokKey, setShowGrokKey] = useState(false);
  const [testingGrok, setTestingGrok] = useState(false);
  const [grokTestStatus, setGrokTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [testingOpenai, setTestingOpenai] = useState(false);
  const [openaiTestStatus, setOpenaiTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Chat testing state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro-1",
      sender: "ai",
      text: `Hello bossu! I am your 24/7 AI Customer Support Specialist & Action Copilot for your store.\n\nYou can test customer questions here (e.g., "what are MTN rates?", "track order BMGH-98234120", "how does delivery work?"), or issue admin execution commands ("mark order BMGH-xxxx as delivered").`,
      provider: "system",
      modelUsed: "Ready",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAISettings();
  }, []);

  useEffect(() => {
    if (activeTab === "chat") {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const fetchAISettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/ai-settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setGeminiKey(data.settings.gemini_api_key || "");
        setGeminiModel(data.settings.gemini_model || "gemini-3.8-flash");
        setGrokKey(data.settings.grok_api_key || "");
        setGrokModel(data.settings.grok_model || "grok-2-latest");
        setOpenaiKey(data.settings.openai_api_key || "");
        setOpenaiModel(data.settings.openai_model || "gpt-4o-mini");
      }
    } catch {
      setError("Failed to load AI credentials.");
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setNotice("");
    setError("");

    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          gemini_api_key: geminiKey.trim(),
          gemini_model: geminiModel.trim(),
          grok_api_key: grokKey.trim(),
          grok_model: grokModel.trim(),
          openai_api_key: openaiKey.trim(),
          openai_model: openaiModel.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save AI settings");
      }

      if (data.settings) {
        if (data.settings.gemini_api_key !== undefined) setGeminiKey(data.settings.gemini_api_key);
        if (data.settings.gemini_model !== undefined) setGeminiModel(data.settings.gemini_model);
        if (data.settings.grok_api_key !== undefined) setGrokKey(data.settings.grok_api_key);
        if (data.settings.grok_model !== undefined) setGrokModel(data.settings.grok_model);
        if (data.settings.openai_api_key !== undefined) setOpenaiKey(data.settings.openai_api_key);
        if (data.settings.openai_model !== undefined) setOpenaiModel(data.settings.openai_model);
      }

      setNotice("AI API keys and model rotation configuration successfully saved in database!");
      setTimeout(() => setNotice(""), 5000);
    } catch (err: any) {
      setError(err?.message || "Error saving AI settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestProvider = async (provider: "gemini" | "grok" | "openai") => {
    let key = "";
    let model = "";

    if (provider === "gemini") {
      key = geminiKey;
      model = geminiModel;
      setTestingGemini(true);
      setGeminiTestStatus(null);
    } else if (provider === "grok") {
      key = grokKey;
      model = grokModel;
      setTestingGrok(true);
      setGrokTestStatus(null);
    } else if (provider === "openai") {
      key = openaiKey;
      model = openaiModel;
      setTestingOpenai(true);
      setOpenaiTestStatus(null);
    }

    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          provider,
          api_key: key.trim(),
          model: model.trim(),
        }),
      });

      const data = await res.json();
      const statusObj = {
        success: data.success,
        message: data.message || (data.success ? "Connection verified!" : "Connection failed"),
      };

      if (provider === "gemini") setGeminiTestStatus(statusObj);
      if (provider === "grok") setGrokTestStatus(statusObj);
      if (provider === "openai") setOpenaiTestStatus(statusObj);
    } catch (err: any) {
      const statusObj = { success: false, message: err?.message || "Network test error" };
      if (provider === "gemini") setGeminiTestStatus(statusObj);
      if (provider === "grok") setGrokTestStatus(statusObj);
      if (provider === "openai") setOpenaiTestStatus(statusObj);
    } finally {
      if (provider === "gemini") setTestingGemini(false);
      if (provider === "grok") setTestingGrok(false);
      if (provider === "openai") setTestingOpenai(false);
    }
  };

  const handleSendChat = async (promptText: string) => {
    const text = promptText.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setChatLoading(true);

    try {
      // Test customer AI endpoint
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data = await res.json();
      const aiReply: ChatMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: data.reply || "Done bossu!",
        provider: data.provider,
        modelUsed: data.modelUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "ai",
          text: "Error executing chat query. Please verify server connection.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Bot className="w-7 h-7 text-emerald-400" />
              <span>AI Customer Support & Model Rotation</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure multi-model customer service (Gemini ➔ Grok ➔ OpenAI rotation) and test live replies.
            </p>
          </div>

          {/* TABS SELECTOR */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveTab("keys")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "keys"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>AI Keys & Models</span>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "chat"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Test Playground</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {notice && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-2xl flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-2xl flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: AI KEYS & MODEL ROTATION SETTINGS */}
        {activeTab === "keys" && (
          <form onSubmit={handleSaveAISettings} className="space-y-6">
            {/* ROTATION PIPELINE INFO CARD */}
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5 sm:p-6 shadow-xl">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Intelligent Multi-Model Rotation Engine
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Customer queries at the <strong>Help</strong> desk are prioritized through your AI models in sequence:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mt-3 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-[10px]">1</span>
                      <span>Google Gemini (Primary)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-blue-500/40 text-blue-300 font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-400/20 text-blue-300 flex items-center justify-center text-[10px]">2</span>
                      <span>xAI Grok (Fallback)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center text-[10px]">3</span>
                      <span>OpenAI (Fallback)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]">4</span>
                      <span>Local Engine (Zero Fail)</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    💡 If Gemini hits a rate-limit/quota, the system automatically falls over to Grok, then OpenAI. Customers never get stuck or see an error.
                  </p>
                </div>
              </div>
            </div>

            {/* PROVIDER 1: GOOGLE GEMINI */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                      <span>Google Gemini</span>
                      <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-950/80 border border-amber-400/40 px-2 py-0.5 rounded-full">
                        Primary Model
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Fastest response times and high rate-limits.
                    </p>
                  </div>
                </div>

                {/* Direct Link to Google AI Studio */}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-amber-400/30 hover:border-amber-400 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Get Gemini API Key ↗</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-bold">
                      Gemini API Key
                    </label>
                    {geminiKey ? (
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Saved in Database
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400">Not configured</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                      title={showGeminiKey ? "Hide key" : "Show key"}
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {geminiKey && (
                    <div className="mt-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-mono">
                        🔒 Key Stored:{" "}
                        <strong className="text-amber-300">
                          {geminiKey.length > 8
                            ? geminiKey.slice(0, 4) + "••••••••" + geminiKey.slice(-4)
                            : "••••••••"}
                        </strong>
                      </span>
                      <span className="text-emerald-400 font-bold">Active in Rotator</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Gemini Model
                  </label>
                  <select
                    value={[
                      "gemini-3.8-flash",
                      "gemini-3.8-lite",
                      "gemini-3.7-flash",
                      "gemini-3.6-flash",
                      "gemini-3.1-pro",
                      "gemini-3.0-flash",
                      "gemini-2.5-flash",
                      "gemini-2.5-pro",
                      "gemini-2.0-flash",
                      "gemini-2.0-flash-lite",
                      "gemini-1.5-flash",
                      "gemini-1.5-flash-8b",
                      "gemini-1.5-pro",
                    ].includes(geminiModel) ? geminiModel : "custom"}
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setGeminiModel(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended • Ultra Fast)</option>
                    <option value="gemini-3.8-lite">gemini-3.8-lite (Flash Lite • High Quota)</option>
                    <option value="gemini-3.7-flash">gemini-3.7-flash (Hybrid Reasoning)</option>
                    <option value="gemini-3.6-flash">gemini-3.6-flash</option>
                    <option value="gemini-3.1-pro">gemini-3.1-pro (Deep Reasoning Pro)</option>
                    <option value="gemini-3.0-flash">gemini-3.0-flash</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Preview)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (Preview)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                    <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    <option value="custom">✏️ Enter Custom Model Name...</option>
                  </select>

                  {/* Custom Model Input if typed or chosen */}
                  <input
                    type="text"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    placeholder="e.g. gemini-2.0-flash-lite or gemini-1.5-flash-8b"
                    className="mt-2 w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-amber-300 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400"
                    title="Active model string sent to Google API"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Active API Model: <span className="text-amber-400 font-mono font-bold">{geminiModel}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleTestProvider("gemini")}
                  disabled={testingGemini || !geminiKey.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  {testingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                  <span>Test Gemini Connection</span>
                </button>

                {geminiTestStatus && (
                  <span
                    className={`text-xs font-semibold ${
                      geminiTestStatus.success ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {geminiTestStatus.message}
                  </span>
                )}
              </div>
            </div>

            {/* PROVIDER 2: xAI GROK */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/30 text-blue-400 flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                      <span>xAI Grok</span>
                      <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-950/80 border border-blue-400/40 px-2 py-0.5 rounded-full">
                        Secondary / Fallback 1
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Engaging, natural customer service conversational model.
                    </p>
                  </div>
                </div>

                {/* Direct Link to xAI Console */}
                <a
                  href="https://console.x.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold border border-blue-400/30 hover:border-blue-400 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Get Grok API Key ↗</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-bold">
                      xAI Grok API Key
                    </label>
                    {grokKey ? (
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Saved in Database
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Not configured</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showGrokKey ? "text" : "password"}
                      value={grokKey}
                      onChange={(e) => setGrokKey(e.target.value)}
                      placeholder="xai-..."
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGrokKey(!showGrokKey)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                      title={showGrokKey ? "Hide key" : "Show key"}
                    >
                      {showGrokKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {grokKey && (
                    <div className="mt-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-mono">
                        🔒 Key Stored:{" "}
                        <strong className="text-blue-300">
                          {grokKey.length > 8
                            ? grokKey.slice(0, 4) + "••••••••" + grokKey.slice(-4)
                            : "••••••••"}
                        </strong>
                      </span>
                      <span className="text-emerald-400 font-bold">Active in Rotator</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Grok Model
                  </label>
                  <select
                    value={["grok-2-latest", "grok-2", "grok-beta", "grok-vision-beta"].includes(grokModel) ? grokModel : "custom"}
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setGrokModel(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="grok-2-latest">grok-2-latest (Recommended)</option>
                    <option value="grok-2">grok-2</option>
                    <option value="grok-beta">grok-beta</option>
                    <option value="grok-vision-beta">grok-vision-beta</option>
                    <option value="custom">✏️ Enter Custom Model Name...</option>
                  </select>

                  <input
                    type="text"
                    value={grokModel}
                    onChange={(e) => setGrokModel(e.target.value)}
                    placeholder="e.g. grok-2-latest"
                    className="mt-2 w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-blue-300 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                    title="Active model string sent to xAI API"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Active API Model: <span className="text-blue-400 font-mono font-bold">{grokModel}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleTestProvider("grok")}
                  disabled={testingGrok || !grokKey.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  {testingGrok ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-blue-400" />}
                  <span>Test Grok Connection</span>
                </button>

                {grokTestStatus && (
                  <span
                    className={`text-xs font-semibold ${
                      grokTestStatus.success ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {grokTestStatus.message}
                  </span>
                )}
              </div>
            </div>

            {/* PROVIDER 3: OPENAI */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                      <span>OpenAI</span>
                      <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                        Tertiary / Fallback 2
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Standard industry benchmark model.
                    </p>
                  </div>
                </div>

                {/* Direct Link to OpenAI Platform */}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-emerald-400/30 hover:border-emerald-400 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Get OpenAI API Key ↗</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-bold">
                      OpenAI API Key
                    </label>
                    {openaiKey ? (
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Saved in Database
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Not configured</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showOpenaiKey ? "text" : "password"}
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-proj-..."
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                      title={showOpenaiKey ? "Hide key" : "Show key"}
                    >
                      {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {openaiKey && (
                    <div className="mt-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-mono">
                        🔒 Key Stored:{" "}
                        <strong className="text-emerald-300">
                          {openaiKey.length > 8
                            ? openaiKey.slice(0, 4) + "••••••••" + openaiKey.slice(-4)
                            : "••••••••"}
                        </strong>
                      </span>
                      <span className="text-emerald-400 font-bold">Active in Rotator</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    OpenAI Model
                  </label>
                  <select
                    value={["gpt-4o-mini", "gpt-4o", "o3-mini", "o1-mini", "gpt-3.5-turbo"].includes(openaiModel) ? openaiModel : "custom"}
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setOpenaiModel(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Cost-effective & High Speed)</option>
                    <option value="gpt-4o">gpt-4o (Most Intelligent)</option>
                    <option value="o3-mini">o3-mini (Advanced Reasoning)</option>
                    <option value="o1-mini">o1-mini</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                    <option value="custom">✏️ Enter Custom Model Name...</option>
                  </select>

                  <input
                    type="text"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    placeholder="e.g. gpt-4o-mini or gpt-4o"
                    className="mt-2 w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-emerald-300 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    title="Active model string sent to OpenAI API"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Active API Model: <span className="text-emerald-400 font-mono font-bold">{openaiModel}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleTestProvider("openai")}
                  disabled={testingOpenai || !openaiKey.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  {testingOpenai ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Test OpenAI Connection</span>
                </button>

                {openaiTestStatus && (
                  <span
                    className={`text-xs font-semibold ${
                      openaiTestStatus.success ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {openaiTestStatus.message}
                  </span>
                )}
              </div>
            </div>

            {/* SAVE ALL BUTTON */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={savingSettings}
                className="py-3 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save AI Configuration</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: LIVE TEST PLAYGROUND */}
        {activeTab === "chat" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col h-[650px] overflow-hidden">
            {/* PLAYGROUND HEADER */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-sm">Customer Care AI Live Simulator</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Active Priority: Gemini ➔ Grok ➔ OpenAI
              </span>
            </div>

            {/* MESSAGE LIST */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs sm:text-sm font-sans">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 leading-relaxed whitespace-pre-wrap shadow-md ${
                      m.sender === "user"
                        ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-semibold rounded-br-none"
                        : "bg-slate-950 border border-slate-800 text-slate-100 rounded-bl-none"
                    }`}
                  >
                    {m.text}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-500 font-mono">
                    <span>{m.timestamp}</span>
                    {m.provider && (
                      <span className="text-emerald-400 font-bold uppercase">
                        • Answered by: {m.provider} ({m.modelUsed})
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-3 bg-slate-950 rounded-xl w-fit border border-slate-800 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>AI is thinking & formatting reply...</span>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* TEST PROMPT CHIPS */}
            <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleSendChat("What are your MTN data bundle rates?")}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 whitespace-nowrap"
              >
                📱 MTN Rates
              </button>
              <button
                onClick={() => handleSendChat("How long does delivery take?")}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 whitespace-nowrap"
              >
                ⚡ Delivery Time
              </button>
              <button
                onClick={() => handleSendChat("Track order BMGH-98234120")}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 whitespace-nowrap"
              >
                🔍 Track BMGH-98234120
              </button>
              <button
                onClick={() => handleSendChat("Can I get a refund if I enter wrong number?")}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 whitespace-nowrap"
              >
                ⚠️ Wrong Number Policy
              </button>
            </div>

            {/* INPUT FORM */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question or enter customer test prompt..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chatLoading}
                  className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-40 flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
