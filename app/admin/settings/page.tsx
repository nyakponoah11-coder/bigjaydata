"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import type { Settings } from "@/lib/db";
import { isMaskedSecret, isValidPaystackSecret } from "@/lib/secrets";
import {
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Store,
  CreditCard,
  Server,
  Bell,
  RefreshCw,
  ExternalLink,
  Bot,
  Eye,
  EyeOff,
  Sparkles,
  Key,
  Zap,
  Mail,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Form Fields
  const [storeName, setStoreName] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState("");
  const [email, setEmail] = useState("");
  const [paystackPublicKey, setPaystackPublicKey] = useState("");
  const [paystackSecretKey, setPaystackSecretKey] = useState("");
  const [showPaystackSecret, setShowPaystackSecret] = useState(false);
  const [testingPaystack, setTestingPaystack] = useState(false);
  const [paystackTestResult, setPaystackTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [datamartApiKey, setDatamartApiKey] = useState("");
  const [datamartApiUrl, setDatamartApiUrl] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(true);

  // Email Gateway Configuration State (Resend & SMTP)
  const [resendApiKey, setResendApiKey] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(465);
  const [showEmailKeys, setShowEmailKeys] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Gemini AI Agent State
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.8-flash");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Groq AI Agent State
  const [groqApiKey, setGroqApiKey] = useState("");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // DataMart Connection Testing
  const [testingDataMart, setTestingDataMart] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestDataMart = async () => {
    if (!datamartApiKey.trim()) {
      setTestResult({ success: false, message: "Please enter your DataMart API key first." });
      return;
    }
    setTestingDataMart(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/datamart/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: datamartApiKey.trim(),
          api_url: datamartApiUrl.trim(),
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "Connection successful!" : "Connection failed"),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Failed to contact diagnostic server",
      });
    } finally {
      setTestingDataMart(false);
    }
  };

  const handleTestGemini = async () => {
    if (!geminiApiKey.trim()) {
      setGeminiTestResult({ success: false, message: "Please enter your Gemini API key first." });
      return;
    }
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          provider: "gemini",
          api_key: geminiApiKey.trim(),
          model: geminiModel.trim(),
        }),
      });
      const data = await res.json();
      setGeminiTestResult({
        success: data.success,
        message: data.message || (data.success ? "Connected to Google Gemini!" : "Connection failed"),
      });
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        message: err?.message || "Failed to contact Gemini API",
      });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestGroq = async () => {
    if (!groqApiKey.trim()) {
      setGroqTestResult({ success: false, message: "Please enter your Groq API key first." });
      return;
    }
    setTestingGroq(true);
    setGroqTestResult(null);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          provider: "groq",
          api_key: groqApiKey.trim(),
          model: groqModel.trim(),
        }),
      });
      const data = await res.json();
      setGroqTestResult({
        success: data.success,
        message: data.message || (data.success ? "Connected to Groq Cloud!" : "Connection failed"),
      });
    } catch (err: any) {
      setGroqTestResult({
        success: false,
        message: err?.message || "Failed to contact Groq API",
      });
    } finally {
      setTestingGroq(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      setEmailTestResult({ success: false, message: "Please enter a recipient email address to test." });
      return;
    }
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_email: testEmail.trim(),
          targetEmail: testEmail.trim(),
          resend_api_key: !isMaskedSecret(resendApiKey) ? resendApiKey.trim() : undefined,
          email_from: emailFrom ? emailFrom.trim() : undefined,
          smtp_user: smtpUser ? smtpUser.trim() : undefined,
          smtp_pass: !isMaskedSecret(smtpPass) ? smtpPass.trim() : undefined,
          smtp_host: smtpHost ? smtpHost.trim() : undefined,
          smtp_port: smtpPort ? Number(smtpPort) : undefined,
        }),
      });
      const data = await res.json();
      setEmailTestResult({
        success: data.success,
        message: data.message || (data.success ? `Test email sent successfully via ${data.provider}!` : "Failed to send test email."),
      });
    } catch (err: any) {
      setEmailTestResult({
        success: false,
        message: err?.message || "Failed to trigger email test.",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestPaystack = async () => {
    if (!paystackPublicKey.trim() && !paystackSecretKey.trim()) {
      setPaystackTestResult({
        success: false,
        message: "Please enter your Paystack Public Key and Secret Key first.",
      });
      return;
    }

    setTestingPaystack(true);
    setPaystackTestResult(null);

    try {
      const res = await fetch("/api/admin/paystack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_key: paystackPublicKey.trim(),
          secret_key: isValidPaystackSecret(paystackSecretKey) ? paystackSecretKey.trim() : "",
        }),
      });
      const data = await res.json();
      setPaystackTestResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? "Paystack API keys are authentic and verified!" : "Verification failed"),
        details: data.details,
      });
    } catch (err: any) {
      setPaystackTestResult({
        success: false,
        message: err?.message || "Failed to contact Paystack diagnostic server",
      });
    } finally {
      setTestingPaystack(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      });
      const data = await res.json();
      if (data.success && data.settings) {
        const s: Settings = data.settings;
        setSettings(s);
        setStoreName(s.store_name || "BundleMartGh");
        setSupportPhone(s.support_phone || "");
        setWhatsappNumber(s.whatsapp_number || "");
        let chanUrl = s.whatsapp_channel_url || "";
        if (!chanUrl) {
          try {
            chanUrl = localStorage.getItem("bigjay_whatsapp_channel_url") || "";
          } catch {}
        } else {
          try {
            localStorage.setItem("bigjay_whatsapp_channel_url", chanUrl);
          } catch {}
        }
        setWhatsappChannelUrl(chanUrl);
        setEmail(s.email || "");
        setPaystackPublicKey(s.paystack_public_key || "");
        setPaystackSecretKey(s.paystack_secret_key || "");
        setDatamartApiKey(s.datamart_api_key || "");
        const rawDmUrl = s.datamart_api_url || "";
        const cleanDmUrl = !rawDmUrl || rawDmUrl.includes("datamartgh.com") || rawDmUrl === "https://api.datamartgh.shop/api" || rawDmUrl === "https://api.datamartgh.shop"
          ? "https://api.datamartgh.shop/api/developer"
          : rawDmUrl;
        setDatamartApiUrl(cleanDmUrl);
        setAnnouncementText(s.announcement_text || "");
        setAnnouncementActive(s.announcement_active !== false);
        setGeminiApiKey(s.gemini_api_key || "");
        setGeminiModel(s.gemini_model || "gemini-3.8-flash");
        setGroqApiKey(s.groq_api_key || s.grok_api_key || "");
        setGroqModel(s.groq_model || s.grok_model || "llama-3.3-70b-versatile");
        setResendApiKey(s.resend_api_key || "");
        setEmailFrom(s.email_from || "");
        setSmtpUser(s.smtp_user || "");
        setSmtpPass(s.smtp_pass || "");
        setSmtpHost(s.smtp_host || "smtp.gmail.com");
        setSmtpPort(Number(s.smtp_port) || 465);
      }
    } catch (e: any) {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const cleanPaystackPublic = paystackPublicKey.trim().replace(/['"]/g, "");
      const updates: Partial<Settings> = {
        store_name: storeName.trim(),
        support_phone: supportPhone.trim(),
        whatsapp_number: whatsappNumber.trim(),
        whatsapp_channel_url: whatsappChannelUrl.trim(),
        email: email.trim(),
        paystack_public_key: cleanPaystackPublic,
        datamart_api_key: datamartApiKey.trim(),
        datamart_api_url: datamartApiUrl.trim(),
        announcement_text: announcementText.trim(),
        announcement_active: announcementActive,
      };

      // Only include secret key if entered/changed (don't overwrite with placeholder bullet dots)
      if (paystackSecretKey && isValidPaystackSecret(paystackSecretKey)) {
        const cleanSecret = paystackSecretKey
          .trim()
          .replace(/['"]/g, "")
          .replace(/^Bearer\s+/i, "")
          .replace(/\s+/g, "");
        updates.paystack_secret_key = cleanSecret;
      }

      // Gemini AI Key & Model
      if (geminiApiKey !== undefined && !isMaskedSecret(geminiApiKey)) {
        updates.gemini_api_key = geminiApiKey.trim();
      }
      if (geminiModel) {
        updates.gemini_model = geminiModel.trim();
      }

      // Groq AI Key & Model
      if (groqApiKey !== undefined && !isMaskedSecret(groqApiKey)) {
        updates.groq_api_key = groqApiKey.trim();
        updates.grok_api_key = groqApiKey.trim();
      }
      if (groqModel) {
        updates.groq_model = groqModel.trim();
        updates.grok_model = groqModel.trim();
      }

      // Email Gateway (Resend & SMTP)
      if (resendApiKey !== undefined && !isMaskedSecret(resendApiKey)) {
        updates.resend_api_key = resendApiKey.trim();
      }
      if (emailFrom !== undefined) {
        updates.email_from = emailFrom.trim();
      }
      if (smtpUser !== undefined) {
        updates.smtp_user = smtpUser.trim();
      }
      if (smtpPass !== undefined && !isMaskedSecret(smtpPass)) {
        const cleanPass = smtpPass.trim().replace(/['"]/g, "");
        const hostStr = (smtpHost || "").toLowerCase();
        const userStr = (smtpUser || "").toLowerCase();
        if (hostStr.includes("gmail") || userStr.includes("gmail") || cleanPass.replace(/\s+/g, "").length === 16) {
          updates.smtp_pass = cleanPass.replace(/\s+/g, "");
        } else {
          updates.smtp_pass = cleanPass;
        }
      }
      if (smtpHost !== undefined) {
        updates.smtp_host = smtpHost.trim();
      }
      if (smtpPort !== undefined) {
        updates.smtp_port = Number(smtpPort) || 465;
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update settings");
      }

      if (data.settings) {
        setSettings(data.settings);
        if (data.settings.announcement_text !== undefined) {
          setAnnouncementText(data.settings.announcement_text);
        }
        if (data.settings.announcement_active !== undefined) {
          setAnnouncementActive(data.settings.announcement_active !== false);
        }
        if (data.settings.whatsapp_channel_url !== undefined) {
          setWhatsappChannelUrl(data.settings.whatsapp_channel_url);
          try {
            if (data.settings.whatsapp_channel_url) {
              localStorage.setItem("bigjay_whatsapp_channel_url", data.settings.whatsapp_channel_url);
            }
          } catch {}
        }
        if (data.settings.gemini_api_key !== undefined) {
          setGeminiApiKey(data.settings.gemini_api_key);
        }
        if (data.settings.gemini_model !== undefined) {
          setGeminiModel(data.settings.gemini_model);
        }
        if (data.settings.groq_api_key !== undefined || data.settings.grok_api_key !== undefined) {
          setGroqApiKey(data.settings.groq_api_key || data.settings.grok_api_key || "");
        }
        if (data.settings.groq_model !== undefined || data.settings.grok_model !== undefined) {
          setGroqModel(data.settings.groq_model || data.settings.grok_model || "llama-3.3-70b-versatile");
        }
        if (data.settings.resend_api_key !== undefined) {
          setResendApiKey(data.settings.resend_api_key);
        }
        if (data.settings.email_from !== undefined) {
          setEmailFrom(data.settings.email_from);
        }
        if (data.settings.smtp_user !== undefined) {
          setSmtpUser(data.settings.smtp_user);
        }
        if (data.settings.smtp_pass !== undefined) {
          setSmtpPass(data.settings.smtp_pass);
        }
        if (data.settings.smtp_host !== undefined) {
          setSmtpHost(data.settings.smtp_host);
        }
        if (data.settings.smtp_port !== undefined) {
          setSmtpPort(Number(data.settings.smtp_port) || 465);
        }

        // Immediately purge client caches and broadcast update to all open tabs
        try {
          localStorage.removeItem("bmgh_sess_settings");
          localStorage.removeItem("cache_public_settings");
          localStorage.setItem("bmgh_settings_updated_at", String(Date.now()));
          window.dispatchEvent(new CustomEvent("bmgh_settings_updated", { detail: data.settings }));
        } catch {}
      }

      setNotice(
        `Settings saved successfully! Marquee banner and store settings updated.`
      );
      setTimeout(() => setNotice(""), 6000);
    } catch (err: any) {
      setError(err?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Store & API Settings
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure store branding, contact desk, Paystack keys, and DataMart delivery API
            </p>
          </div>

          <button
            onClick={fetchSettings}
            className="self-start sm:self-auto p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {notice && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-2xl flex items-center gap-2.5 animate-fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 1: STORE BRANDING & CONTACT */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-sm border-b border-slate-800 pb-3">
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Store Information & Customer Desk</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Store Display Name
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="BundleMartGh"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Reflected in Hero, Navbar, Footer, and Receipts
                </span>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Support Phone Number
                </label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="+233 55 123 4567"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  WhatsApp Support Number (without '+' symbol)
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="233551234567"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    WhatsApp Channel URL (Direct Channel Link)
                  </label>
                  {whatsappChannelUrl.trim() ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      Channel Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      Not Configured (Optional)
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="url"
                    value={whatsappChannelUrl}
                    onChange={(e) => setWhatsappChannelUrl(e.target.value)}
                    placeholder="https://whatsapp.com/channel/..."
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {whatsappChannelUrl.trim() ? (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Channel link is active & saved
                      </p>
                      <p className="text-[11px] text-slate-300 font-mono truncate max-w-md">
                        {whatsappChannelUrl.trim()}
                      </p>
                      <p className="text-[10px] text-emerald-400/80">
                        The floating WhatsApp button on the frontend links directly to this WhatsApp Channel.
                      </p>
                    </div>

                    <a
                      href={
                        whatsappChannelUrl.trim().startsWith("http")
                          ? whatsappChannelUrl.trim()
                          : `https://${whatsappChannelUrl.trim()}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 rounded-lg text-xs font-bold transition-all shrink-0 self-start sm:self-center"
                    >
                      <span>Open / Test Channel Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    Paste your WhatsApp Channel URL (e.g. from WhatsApp Channel invite link) and click &quot;Save All Settings&quot; below.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Support Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="support@bundlemartgh.com"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PAYSTACK PAYMENT GATEWAY */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Paystack Payment Configuration</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Required for both Main Store and Agent Store checkouts
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Paystack requires both a <strong className="text-slate-200">Public Key</strong> (opens checkout modal for customers) and a <strong className="text-slate-200">Secret Key</strong> (authorizes the backend to verify payment and dispatch data bundles via DataMart).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Paystack Public Key (starts with pk_live_ or pk_test_)
                </label>
                <input
                  type="text"
                  value={paystackPublicKey}
                  onChange={(e) => setPaystackPublicKey(e.target.value)}
                  placeholder="Enter Paystack Public Key (pk_...)"
                  className={`w-full px-3.5 py-2.5 bg-slate-800 border rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 ${
                    paystackPublicKey.trim().startsWith("sk_")
                      ? "border-amber-500/80 focus:ring-amber-500"
                      : "border-slate-700 focus:ring-emerald-500"
                  }`}
                />
                {paystackPublicKey.trim().startsWith("sk_") && (
                  <p className="text-[10px] text-amber-400 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Notice: This looks like a Secret Key (sk_). Please paste your Public Key (pk_...) here.
                  </p>
                )}
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Found in Paystack Dashboard &rarr; Settings &rarr; API Keys & Webhooks.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">
                    Paystack Secret Key (starts with sk_live_ or sk_test_)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPaystackSecret(!showPaystackSecret)}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                  >
                    {showPaystackSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPaystackSecret ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <input
                  type={showPaystackSecret ? "text" : "password"}
                  value={paystackSecretKey}
                  onChange={(e) => setPaystackSecretKey(e.target.value)}
                  placeholder="Enter Paystack Secret Key (sk_...)"
                  className={`w-full px-3.5 py-2.5 bg-slate-800 border rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 ${
                    paystackSecretKey.trim().startsWith("pk_")
                      ? "border-amber-500/80 focus:ring-amber-500"
                      : "border-slate-700 focus:ring-emerald-500"
                  }`}
                />
                {paystackSecretKey.trim().startsWith("pk_") && (
                  <p className="text-[10px] text-amber-400 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Notice: This is a Public Key (pk_). Paystack requires your Secret Key (sk_...) here to verify payments!
                  </p>
                )}
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Keep secret. Used by server to verify transactions before sending to DataMart.
                </span>
              </div>
            </div>

            {/* Paystack Test Tool */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-300">
                    Paystack Diagnostic Test
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Test your keys against Paystack API to verify payment verification will succeed without errors.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestPaystack}
                  disabled={testingPaystack || (!paystackPublicKey.trim() && !paystackSecretKey.trim())}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  {testingPaystack ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying with Paystack...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Test Paystack Keys</span>
                    </>
                  )}
                </button>
              </div>

              {paystackTestResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                    paystackTestResult.success
                      ? "bg-emerald-950/70 border-emerald-800 text-emerald-300"
                      : "bg-red-950/70 border-red-800 text-red-300"
                  }`}
                >
                  {paystackTestResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{paystackTestResult.message}</p>
                    {paystackTestResult.details?.mode && (
                      <p className="text-[11px] text-slate-300">
                        Environment Mode: <strong className="uppercase text-emerald-400">{paystackTestResult.details.mode}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: DATAMART API CONFIGURATION */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-sm border-b border-slate-800 pb-3">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>DataMart Delivery API Configuration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  DataMart API Key
                </label>
                <input
                  type="text"
                  value={datamartApiKey}
                  onChange={(e) => setDatamartApiKey(e.target.value)}
                  placeholder="dm_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  DataMart API Base URL
                </label>
                <input
                  type="text"
                  value={datamartApiUrl}
                  onChange={(e) => setDatamartApiUrl(e.target.value)}
                  placeholder="https://api.datamartgh.shop/api/developer"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestDataMart}
                disabled={testingDataMart}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {testingDataMart ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying DataMart Key...</span>
                  </>
                ) : (
                  <>
                    <Server className="w-3.5 h-3.5" />
                    <span>Test DataMart API Connection</span>
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    testResult.success
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-red-950 text-red-300 border border-red-800"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: OUTBOUND EMAIL GATEWAY & VERIFICATION CODES (RESEND & SMTP) */}
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-lg space-y-5 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span className="text-white font-bold text-sm">Outbound Email Gateway & Verification OTPs</span>
                {resendApiKey || smtpUser ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Active Provider
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" /> Instant Fallback Mode
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowEmailKeys(!showEmailKeys)}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 font-bold bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-800/60 transition-colors self-start sm:self-auto"
              >
                {showEmailKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showEmailKeys ? "Hide Credentials" : "Show Credentials"}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Configure how customer verification OTPs, login codes, withdrawal security codes, and email confirmations are delivered directly to registered email addresses. You can use <strong>Resend API</strong> (fastest) or <strong>Gmail / Custom SMTP Relay</strong>. All verification codes are dispatched strictly to registered emails and are never displayed on the website.
            </p>

            {/* Option 1: Resend HTTP API */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Option 1: Resend HTTP API (Recommended)
                </span>
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                >
                  <span>Get Resend Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Resend API Key
                  </label>
                  <input
                    type={showEmailKeys ? "text" : "password"}
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Starts with &quot;re_&quot; from resend.com
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Sender Email (&quot;From&quot; address)
                  </label>
                  <input
                    type="text"
                    value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)}
                    placeholder="onboarding@resend.dev or verify@yourdomain.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Note: <code className="text-slate-400">onboarding@resend.dev</code> only sends to your own email. For public signups, use your verified domain or SMTP below.
                  </span>
                </div>
              </div>
            </div>

            {/* Option 2: SMTP Relay */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span> Option 2: SMTP Relay (Gmail App Password or Custom Mail Host)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="465"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    465 (SSL) or 587 (TLS)
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    SMTP Username / Email
                  </label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="yourstore@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-slate-300 font-bold mb-1">
                    SMTP Password / App Password
                  </label>
                  <input
                    type={showEmailKeys ? "text" : "password"}
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="16-character Google App Password (e.g. abcd efgh ijkl mnop)"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    For Gmail, generate an <strong>App Password</strong> in Google Account Security &gt; 2-Step Verification &gt; App Passwords.
                  </span>
                </div>
              </div>
            </div>

            {/* Test Email Section */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter recipient email to test (e.g. you@gmail.com)"
                  className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                >
                  {testingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Test Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Test Verification Email</span>
                    </>
                  )}
                </button>
              </div>

              {emailTestResult && (
                <div
                  className={`w-full p-3 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-fade-in ${
                    emailTestResult.success
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                      : "bg-red-950/80 text-red-300 border border-red-800"
                  }`}
                >
                  {emailTestResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed break-words flex-1">{emailTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: GOOGLE GEMINI AI ASSISTANT CONFIGURATION */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-lg space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-amber-400" />
                <span className="text-white font-bold text-sm">Google Gemini AI Customer Support</span>
                {geminiApiKey ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Active & Saved
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" /> Key Required
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/admin/ai-agent"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-xl border border-amber-400/30 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Multi-Model Rotator & Playground ↗</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-bold mb-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {geminiApiKey && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-mono">
                      🔒 Saved in Database:{" "}
                      <strong className="text-amber-300">
                        {geminiApiKey.length > 8
                          ? geminiApiKey.slice(0, 4) + "••••••••" + geminiApiKey.slice(-4)
                          : "••••••••"}
                      </strong>
                    </span>
                    <span className="text-emerald-400 font-bold">Encrypted & Stored</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Gemini Model
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended • Ultra Fast)</option>
                  <option value="gemini-3.8-lite">gemini-3.8-lite (High Quota)</option>
                  <option value="gemini-3.7-flash">gemini-3.7-flash (Hybrid Reasoning)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Preview)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Get free API keys at{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 underline font-bold"
                  >
                    Google AI Studio ↗
                  </a>
                </span>
              </div>
            </div>

            {/* Test Gemini Connection Button */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={testingGemini}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800 text-amber-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {testingGemini ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing Gemini Connection...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    <span>Test Gemini API Key</span>
                  </>
                )}
              </button>

              {geminiTestResult && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    geminiTestResult.success
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-red-950 text-red-300 border border-red-800"
                  }`}
                >
                  {geminiTestResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{geminiTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4B: GROQ CLOUD (FREE ULTRA-FAST LPU) */}
          <div className="bg-slate-900 border border-sky-500/30 rounded-3xl p-6 shadow-lg space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-sky-400" />
                <span className="text-white font-bold text-sm">Groq Cloud AI (Ultra-Fast LPU • Free)</span>
                {groqApiKey ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Active & Saved
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-950/80 text-sky-400 border border-sky-800 flex items-center gap-1">
                    Free API Key Available
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-bold bg-sky-400/10 hover:bg-sky-400/20 px-3 py-1.5 rounded-xl border border-sky-400/30 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Get Free Groq Key ↗</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-bold mb-1">
                  Groq API Key (gsk_...)
                </label>
                <div className="relative">
                  <input
                    type={showGroqKey ? "text" : "password"}
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {groqApiKey && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-mono">
                      🔒 Saved in Database:{" "}
                      <strong className="text-sky-300">
                        {groqApiKey.length > 8
                          ? groqApiKey.slice(0, 4) + "••••••••" + groqApiKey.slice(-4)
                          : "••••••••"}
                      </strong>
                    </span>
                    <span className="text-emerald-400 font-bold">Encrypted & Stored</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Groq Model
                </label>
                <select
                  value={groqModel}
                  onChange={(e) => setGroqModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recommended • Smartest)</option>
                  <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest LPU)</option>
                  <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                  <option value="gemma2-9b-it">gemma2-9b-it</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  100% Free on Groq LPU with zero latency
                </span>
              </div>
            </div>

            {/* Test Groq Connection Button */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestGroq}
                disabled={testingGroq}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800 text-sky-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {testingGroq ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing Groq Connection...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Test Groq API Key</span>
                  </>
                )}
              </button>

              {groqTestResult && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    groqTestResult.success
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-red-950 text-red-300 border border-red-800"
                  }`}
                >
                  {groqTestResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{groqTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: ANNOUNCEMENT BANNER */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Rolling Announcement Marquee Banner</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="announcementActive"
                  checked={announcementActive}
                  onChange={(e) => setAnnouncementActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700"
                />
                <label htmlFor="announcementActive" className="text-xs text-slate-300 font-medium">
                  Show Banner on Storefront
                </label>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold text-xs mb-1">
                Banner Announcement Text
              </label>
              <textarea
                rows={3}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="⚡ Fast automated delivery active! MTN, Telecel & AT packages delivered in under 60 seconds."
                className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-slate-800/80 pt-4">
            {notice && (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-4 py-2 rounded-xl text-xs font-bold animate-in fade-in">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{notice}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto py-3 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Settings
            </button>
          </div>
        </form>

        {/* Floating Toast Notification for Immediate Feedback on any scroll position */}
        {notice && (
          <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-950/95 border-2 border-emerald-500 text-emerald-200 text-xs sm:text-sm font-bold rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-bottom-5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-white font-black">{notice}</p>
              <p className="text-[11px] text-emerald-300/80 font-normal">
                Frontend floating WhatsApp button is updated in real time.
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
