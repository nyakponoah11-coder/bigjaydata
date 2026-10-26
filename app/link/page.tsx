"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Bell,
  Send,
  RefreshCw,
  Phone,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  KeyRound,
  ArrowRight,
  Smartphone,
  Lock,
} from "lucide-react";

export default function WhatsAppLinkPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"instant" | "qr">("instant");

  // Form State
  const [phone, setPhone] = useState("");
  const [apikey, setApikey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Baileys Status
  const [baileysInfo, setBaileysInfo] = useState<{
    phone?: string;
    callmebot_configured?: boolean;
    baileys_online?: boolean;
    baileys_connected?: boolean;
    baileys_user?: string | null;
    qr_data_url?: string | null;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/link", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setBaileysInfo(data);
        if (data.phone && !phone) setPhone(data.phone);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", phone, apikey }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: "WhatsApp alerts connected successfully! A test verification alert has been sent to your WhatsApp.",
        });
        fetchStatus();
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to save settings." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", phone }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
      } else {
        setFeedback({ type: "error", message: data.message || data.error || "Test alert failed." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to send test alert." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10">
        {/* Top Header Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-xl shadow-emerald-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Connect WhatsApp Security Alerts
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Get instant real-time WhatsApp notifications on your phone whenever anyone attempts unauthorized PowerShell commands, SQL injection, or payment tampering.
          </p>

          {/* Current Connection Status Badge */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                baileysInfo?.callmebot_configured || baileysInfo?.baileys_connected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  baileysInfo?.callmebot_configured || baileysInfo?.baileys_connected
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-amber-400"
                }`}
              />
              {baileysInfo?.callmebot_configured || baileysInfo?.baileys_connected
                ? `Alerts Active (${baileysInfo?.phone || "Connected"})`
                : "Not Connected — Setup Required"}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("instant")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "instant"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            1-Click WhatsApp Setup (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "qr"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Phone className="w-4 h-4" />
            QR Code Scanner (Baileys)
          </button>
        </div>

        {/* Feedback Alert Notice */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 ${
              feedback.type === "success"
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                : "bg-red-950/60 border-red-800 text-red-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-semibold">{feedback.message}</span>
            </div>
          </div>
        )}

        {/* TAB 1: 1-Click WhatsApp Setup */}
        {activeTab === "instant" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-400" />
                Connect in 2 Easy Steps (No Terminal Required)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                This connects your personal WhatsApp directly via CallMeBot. Works 24/7 on cloud without keeping any computer or terminal running.
              </p>
            </div>

            {/* Step 1 Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  Step 1
                </div>
                <h3 className="text-sm font-bold text-white">Get your Free WhatsApp Authorization Key</h3>
                <p className="text-xs text-slate-400">
                  Tap the button to open WhatsApp and send the pre-filled verification message to CallMeBot. CallMeBot will reply in 2 seconds with your API Key.
                </p>
              </div>

              <a
                href="https://api.whatsapp.com/send?phone=34644598284&text=I+allow+callmebot+to+send+me+messages"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all shrink-0 hover:scale-[1.02]"
              >
                Open WhatsApp <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Step 2 Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-black uppercase tracking-wider">
                Step 2
              </div>
              <h3 className="text-sm font-bold text-white -mt-2">Enter your Phone & Received Key</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                    Your WhatsApp Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0551234567 or 233551234567"
                    required
                    className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">The phone number you used in WhatsApp.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                    CallMeBot API Key
                  </label>
                  <input
                    type="text"
                    value={apikey}
                    onChange={(e) => setApikey(e.target.value)}
                    placeholder="e.g. 123456"
                    required
                    className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Received in WhatsApp after sending Step 1.</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={testing || !phone}
                  className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Test WhatsApp Message
                </button>

                <button
                  type="submit"
                  disabled={saving || !phone || !apikey}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.02]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Save & Connect WhatsApp Alerts
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: QR Code Scanner (Baileys) */}
        {activeTab === "qr" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-emerald-400" />
                  Scan QR Code on WhatsApp
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Point your WhatsApp camera at the QR code to link your phone like WhatsApp Web.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchStatus}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh QR
              </button>
            </div>

            {/* QR Scanner Display */}
            {baileysInfo?.baileys_connected ? (
              <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">WhatsApp Bot is Connected!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Linked as: <strong className="text-emerald-400">+{baileysInfo.baileys_user || "Active"}</strong>. All security alerts are actively routed to your phone in real-time.
                </p>
              </div>
            ) : baileysInfo?.qr_data_url ? (
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700 flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-white rounded-2xl shadow-2xl">
                  <img src={baileysInfo.qr_data_url} alt="WhatsApp QR Code" className="w-56 h-56 block" />
                </div>

                <div className="space-y-1 text-xs text-slate-300 max-w-sm">
                  <p className="font-bold text-white">How to scan with your phone:</p>
                  <ol className="list-decimal list-inside text-left space-y-1 text-slate-300">
                    <li>Open WhatsApp on your mobile phone</li>
                    <li>Tap <b>Menu (⋮)</b> or <b>Settings</b> &gt; <b>Linked Devices</b></li>
                    <li>Tap <b>Link a Device</b> and point camera at the QR code</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Baileys Terminal Bot is not running</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Because this site is hosted on cloud serverless, switch to the <strong>1-Click WhatsApp Setup tab</strong> above to link your phone in 10 seconds without running any terminal!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 font-semibold"
          >
            ← Return to BigJayData Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
