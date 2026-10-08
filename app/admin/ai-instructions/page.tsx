"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import {
  BrainCircuit,
  Save,
  Sparkles,
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldAlert,
  Sliders,
  MessageSquare,
} from "lucide-react";

export default function AdminAIInstructionsPage() {
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Connected providers overview
  const [aiStatus, setAiStatus] = useState<{
    gemini: boolean;
    groq: boolean;
    openai: boolean;
  }>({ gemini: false, groq: false, openai: false });

  // Live Test Sandbox State
  const [testQuestion, setTestQuestion] = useState("how is delivery on your site?");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [testProvider, setTestProvider] = useState<string | null>(null);
  const [testingAI, setTestingAI] = useState(false);

  useEffect(() => {
    fetchInstructions();
  }, []);

  const fetchInstructions = async () => {
    setLoading(true);
    setError("");

    // Read client cache first for instant render
    try {
      const cached = localStorage.getItem("bigjay_ai_instructions");
      if (cached) setInstructions(cached);
    } catch {}

    try {
      const res = await fetch("/api/admin/ai-settings");
      const data = await res.json();
      if (data?.success && data?.settings) {
        if (data.settings.ai_system_instructions !== undefined) {
          setInstructions(data.settings.ai_system_instructions || "");
          try {
            localStorage.setItem("bigjay_ai_instructions", data.settings.ai_system_instructions || "");
          } catch {}
        }
        setAiStatus({
          gemini: Boolean(data.settings.gemini_configured),
          groq: Boolean(data.settings.groq_configured || data.settings.grok_configured),
          openai: Boolean(data.settings.openai_configured),
        });
      }
    } catch {
      setError("Failed to load instructions from server. Showing local cache.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      // Save to localStorage immediately
      try {
        localStorage.setItem("bigjay_ai_instructions", instructions);
      } catch {}

      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          ai_system_instructions: instructions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save AI instructions");
      }

      setNotice("AI Instructions successfully saved! Your AI assistant is now trained and live for all customer chats.");
      setTimeout(() => setNotice(""), 6000);
    } catch (err: any) {
      setError(err?.message || "Failed to save instructions.");
    } finally {
      setSaving(false);
    }
  };

  const handleInsertTemplate = (templateText: string) => {
    setInstructions((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return templateText;
      return `${trimmed}\n\n${templateText}`;
    });
  };

  const handleTestPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuestion.trim()) return;

    setTestingAI(true);
    setTestReply(null);
    setTestProvider(null);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: testQuestion.trim(),
          history: [],
        }),
      });

      const data = await res.json();
      if (data?.reply) {
        setTestReply(data.reply);
        setTestProvider(data.provider || "AI Engine");
      } else {
        setTestReply("No reply returned from AI engine.");
      }
    } catch (err: any) {
      setTestReply(`Error testing AI: ${err?.message || "Request failed"}`);
    } finally {
      setTestingAI(false);
    }
  };

  const examplePlaceholder = `HOW TO TRAIN YOUR AI (EXAMPLE INSTRUCTIONS):

1. WHAT TO DO (BEHAVIOR & TONE):
- Always greet customers warmly like a genuine Ghanaian care person ("Hello bossu!", "Good day chief!").
- Always be reassuring, patient, and polite.
- When customers ask about delivery speed, explain that our automated telecom gateway credits lines in 15 to 60 seconds (up to 5 mins if network is congested).
- Guide customers on telecom balance check shortcodes:
  • MTN: *138# or *124#
  • Telecel: *126# or *124#
  • AT: *124#

2. WHAT NOT TO DO (STRICT RULES):
- Never give away free data bundles unless the customer enters an official promo voucher code.
- Never argue or sound defensive if a customer is upset. Apologize warmly and reassure them their money is 100% safe.
- Never share administrative credentials, passwords, or internal API keys.

3. SPECIAL STORE POLICIES & FAQS:
- If a customer needs manual assistance or MoMo payment help, tell them to chat our WhatsApp Support or call our desk.
- All data packages are 100% non-expiry.`;

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        {/* Header Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/50 border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="absolute -top-24 right-0 w-80 h-48 bg-gradient-to-b from-emerald-500/15 to-transparent blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <BrainCircuit className="w-6 h-6" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Custom AI Knowledge & Guardrails
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                AI Instructions & Training
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Teach your AI assistant exactly how to speak, what to do, what <strong>never</strong> to do, and your custom store rules. All instructions here take highest priority across customer chats!
              </p>
            </div>

            {/* AI Provider Status Card */}
            <div className="shrink-0 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 space-y-2.5 text-xs min-w-[240px]">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pb-1 border-b border-slate-800">
                <span>AI Engines Connected</span>
                <Link
                  href="/admin/ai-agent"
                  className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
                >
                  <span>Keys</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Google Gemini:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${aiStatus.gemini ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-500"}`}>
                  {aiStatus.gemini ? "Active" : "Not Set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Groq LPU (Llama):</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${aiStatus.groq ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-500"}`}>
                  {aiStatus.groq ? "Active" : "Not Set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">OpenAI (ChatGPT):</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${aiStatus.openai ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-500"}`}>
                  {aiStatus.openai ? "Active" : "Not Set"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Notices */}
        {notice && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-semibold">{notice}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs sm:text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Quick Training Templates / Click-to-insert */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Quick Training Presets (Click to Add to Instructions)</span>
            </div>
            <span className="text-[11px] text-slate-500">Tap any block to append</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() =>
                handleInsertTemplate(
                  `• TONE & GREETINGS: Always greet customers warmly like a real Ghanaian customer support lead ("Hello bossu!", "Good day chief!"). Be respectful, enthusiastic, and polite at all times.`
                )
              }
              className="text-left p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                  🇬🇭 Ghanaian Warmth
                </span>
                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Calls customers &quot;bossu&quot;, warm and patient, polite human tone.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                handleInsertTemplate(
                  `• DELIVERY TIME POLICY: Inform customers that all bundle deliveries are automated and arrive directly on their SIM in 15 to 60 seconds (up to 5 minutes during network maintenance). Reassure them that their money is 100% safe.`
                )
              }
              className="text-left p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                  ⚡ 60-Sec Delivery
                </span>
                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Assures fast 15-60s automated SIM crediting and safety.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                handleInsertTemplate(
                  `• STRICT GUARDRAILS (WHAT NOT TO DO):\n- NEVER promise free data bundles without an official promo voucher code.\n- NEVER share administrator passwords, system keys, or sensitive backend info.\n- Do not argue with customers; be calming and professional.`
                )
              }
              className="text-left p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                  🛡️ Strict Guardrails
                </span>
                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                No free data promises, no admin secret leaks, no arguments.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                handleInsertTemplate(
                  `• TELECOM SHORTCODES:\nWhen customers want to check their remaining data, tell them to dial:\n- MTN: *138# or *124#\n- Telecel: *126# or *124#\n- AT: *124#\nRemind them that telco SMS alerts often lag, but shortcodes show real-time balance immediately.`
                )
              }
              className="text-left p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                  📶 Balance Shortcodes
                </span>
                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Teaches the AI exact shortcodes (*138#, *126#, *124#).
              </p>
            </button>
          </div>
        </div>

        {/* Main Form: Training Instructions Textarea */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <label className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>Custom AI Training Instructions & Rules</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Highest Priority
                  </span>
                </label>
                <p className="text-xs text-slate-400">
                  Write in plain English. The AI will strictly follow these directives whenever answering customers.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{instructions.length} characters</span>
                {instructions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setInstructions("")}
                    className="text-[11px] text-red-400 hover:text-red-300 font-bold ml-2 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={examplePlaceholder}
                rows={16}
                className="w-full p-4 sm:p-5 bg-slate-950/80 border border-slate-800 rounded-2xl text-white font-mono text-xs sm:text-sm leading-relaxed placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Tip: Changes take effect immediately after saving. No server reboot or redeploy needed!
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={fetchInstructions}
                  disabled={loading}
                  className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Reload</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Instructions...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save AI Instructions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Interactive Live AI Test Sandbox */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Bot className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Live Test Simulator
                </h2>
                <p className="text-xs text-slate-400">
                  Ask a customer question right here to verify that the AI speaks and performs according to your training!
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleTestPrompt} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              placeholder="Type a test question (e.g. how fast is delivery? or how much is MTN 5GB?)"
              className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            <button
              type="submit"
              disabled={testingAI || !testQuestion.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {testingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Test Response</span>
                </>
              )}
            </button>
          </form>

          {/* Test AI Output Display */}
          {testReply && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px] font-bold pb-2 border-b border-slate-800">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  AI Live Output
                </span>
                {testProvider && (
                  <span className="text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                    Engine: {testProvider}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans pt-1">
                {testReply}
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
