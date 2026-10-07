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
  const [email, setEmail] = useState("");
  const [paystackPublicKey, setPaystackPublicKey] = useState("");
  const [paystackSecretKey, setPaystackSecretKey] = useState("");
  const [datamartApiKey, setDatamartApiKey] = useState("");
  const [datamartApiUrl, setDatamartApiUrl] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(true);

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
        setEmail(s.email || "");
        setPaystackPublicKey(s.paystack_public_key || "");
        setPaystackSecretKey(s.paystack_secret_key || "");
        setDatamartApiKey(s.datamart_api_key || "");
        const rawDmUrl = s.datamart_api_url || "";
        const cleanDmUrl = !rawDmUrl || rawDmUrl.includes("datamartgh.com") ? "https://api.datamartgh.shop/api" : rawDmUrl;
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

      setNotice("Settings saved successfully! Frontend updated in realtime.");
      setTimeout(() => setNotice(""), 4000);
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
                  placeholder="https://api.datamartgh.shop/api"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
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
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="py-3 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Settings
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
