"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  Lock,
  Power,
  Wrench,
  AlertOctagon,
} from "lucide-react";

export default function WhatsAppLinkPage() {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [togglingMaint, setTogglingMaint] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [linkInfo, setLinkInfo] = useState<{
    phone?: string;
    baileys_online?: boolean;
    baileys_connected?: boolean;
    baileys_user?: string | null;
    qr_data_url?: string | null;
    status?: string;
    maintenance_mode?: boolean;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/link", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setLinkInfo(data);
        setMaintenanceMode(Boolean(data.maintenance_mode));
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Fast polling every 3s so the moment they scan the QR code with phone, it immediately turns green!
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMaintenance = async () => {
    const nextState = !maintenanceMode;
    const confirmMsg = nextState
      ? "Are you sure you want to TURN OFF the entire system? All pages (home, store, buy, admin) will show 'UNDER MAINTENANCE' to everyone."
      : "Are you sure you want to TURN ON the system? The site and admin will go back online for all users.";
    
    if (!window.confirm(confirmMsg)) return;

    setTogglingMaint(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_maintenance", enabled: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setMaintenanceMode(Boolean(data.maintenance_mode));
        setFeedback({
          type: "success",
          message: data.message || (nextState ? "System put under maintenance." : "System restored online."),
        });
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to toggle maintenance mode." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Connection error." });
    } finally {
      setTogglingMaint(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to send test alert." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to send test alert." });
    } finally {
      setTesting(false);
    }
  };

  const isConnected = Boolean(linkInfo?.baileys_connected);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-xl shadow-emerald-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Connect WhatsApp Security Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Scan the QR code below on your WhatsApp to link this device. You will receive immediate alerts whenever anyone attempts unauthorized PowerShell commands or attacks.
          </p>

          {/* Connection Status Pill */}
          <div className="mt-4 flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
                }`}
              />
              {isConnected
                ? `Connected (${linkInfo?.baileys_user ? "+" + linkInfo.baileys_user : "Active"})`
                : "Waiting for QR Code Scan"}
            </span>
          </div>
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
            <div className="flex-1 font-semibold">{feedback.message}</div>
          </div>
        )}

        {/* Emergency Kill Switch / Maintenance Mode Control Card */}
        <div
          className={`mb-6 p-6 rounded-3xl border transition-all shadow-2xl relative overflow-hidden ${
            maintenanceMode
              ? "bg-gradient-to-br from-red-950 via-slate-900 to-amber-950/60 border-red-700 shadow-red-950/50"
              : "bg-slate-900/90 border-slate-800 shadow-xl"
          }`}
        >
          {maintenanceMode && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  maintenanceMode
                    ? "bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/40"
                    : "bg-slate-800 text-emerald-400 border border-slate-700"
                }`}
              >
                {maintenanceMode ? <AlertOctagon className="w-6 h-6" /> : <Power className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Emergency System Kill Switch
                  </h2>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      maintenanceMode
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {maintenanceMode ? "🚨 LOCKDOWN ACTIVE" : "🟢 SYSTEM LIVE"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {maintenanceMode
                    ? "The entire platform (storefronts, buyer checkout, and admin pages) is currently SHUT OFF and showing 'UNDER MAINTENANCE' to all visitors."
                    : "System is online. All buyer stores, checkout, and admin dashboards are active."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleMaintenance}
              disabled={togglingMaint}
              className={`w-full sm:w-auto px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shrink-0 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] ${
                maintenanceMode
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                  : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/30"
              }`}
            >
              {togglingMaint ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : maintenanceMode ? (
                <>
                  <Power className="w-4 h-4" />
                  TURN SYSTEM ON (RESTORE LIVE)
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  TURN SYSTEM OFF (LOCKDOWN)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
          {isConnected ? (
            /* Connected State */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">WhatsApp Successfully Linked!</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm mx-auto">
                  Linked to account: <strong className="text-emerald-400">+{linkInfo?.baileys_user || "Active"}</strong>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  The security firewall is active. You will receive instant WhatsApp notifications whenever suspicious activity is detected.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={testing}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 inline-flex items-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.02]"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Test Security Alert to WhatsApp
                </button>
              </div>
            </div>
          ) : (
            /* QR Code Scan State */
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="flex items-center justify-between w-full pb-3 border-b border-slate-800 text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  Point your phone camera here
                </span>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl shadow-2xl relative">
                {linkInfo?.qr_data_url ? (
                  <img
                    src={linkInfo.qr_data_url}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64 sm:w-72 sm:h-72 block object-contain"
                  />
                ) : (
                  <div className="w-64 h-64 sm:w-72 sm:h-72 flex flex-col items-center justify-center text-slate-700 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-600">Generating live QR code...</span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 w-full text-left space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  How to Scan &amp; Link on Your Phone:
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300">
                  <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                  <li>Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings</strong> on iPhone</li>
                  <li>Select <strong>Linked Devices</strong> &gt; tap <strong>Link a Device</strong></li>
                  <li>Scan the QR code above with your phone camera</li>
                </ol>
                <p className="text-[11px] text-emerald-400/90 pt-1">
                  ⚡ As soon as you scan, this page will instantly update and confirm your connection.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6">
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
