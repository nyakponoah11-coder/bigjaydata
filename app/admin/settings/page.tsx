"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Settings } from "@/lib/db";
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
  const [datamartApiKey, setDatamartApiKey] = useState("");
  const [datamartApiUrl, setDatamartApiUrl] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(true);

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

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        const s: Settings = data.settings;
        setSettings(s);
        setStoreName(s.store_name || "BundleMartGh");
        setSupportPhone(s.support_phone || "");
        setWhatsappNumber(s.whatsapp_number || "");
        setWhatsappChannelUrl(s.whatsapp_channel_url || "");
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
      const updates: Partial<Settings> = {
        store_name: storeName.trim(),
        support_phone: supportPhone.trim(),
        whatsapp_number: whatsappNumber.trim(),
        whatsapp_channel_url: whatsappChannelUrl.trim(),
        email: email.trim(),
        paystack_public_key: paystackPublicKey.trim(),
        datamart_api_key: datamartApiKey.trim(),
        datamart_api_url: datamartApiUrl.trim(),
        announcement_text: announcementText.trim(),
        announcement_active: announcementActive,
      };

      // Only include secret key if entered/changed (don't overwrite with placeholder bullet dots)
      if (paystackSecretKey && !paystackSecretKey.includes("••••")) {
        updates.paystack_secret_key = paystackSecretKey.trim();
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
        if (data.settings.whatsapp_channel_url !== undefined) {
          setWhatsappChannelUrl(data.settings.whatsapp_channel_url);
        }
      }

      setNotice(
        `Settings saved successfully! WhatsApp Channel (${whatsappChannelUrl.trim() ? "Channel URL Active" : "Direct Chat"}) updated.`
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
                      Not Configured (Using wa.me Chat)
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
            <div className="flex items-center gap-2.5 text-white font-bold text-sm border-b border-slate-800 pb-3">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Paystack Payment Configuration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Paystack Public Key (pk_...)
                </label>
                <input
                  type="text"
                  value={paystackPublicKey}
                  onChange={(e) => setPaystackPublicKey(e.target.value)}
                  placeholder="Enter Paystack Public Key"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Paystack Secret Key (sk_...)
                </label>
                <input
                  type="password"
                  value={paystackSecretKey}
                  onChange={(e) => setPaystackSecretKey(e.target.value)}
                  placeholder="Enter Paystack Secret Key"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
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

          {/* SECTION 4: ANNOUNCEMENT BANNER */}
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
