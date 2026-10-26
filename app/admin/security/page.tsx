"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  Bell,
  RefreshCw,
  Send,
  Trash2,
  Plus,
  AlertTriangle,
  Globe,
  Phone,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
  Loader2,
  Lock,
  Power,
  AlertOctagon,
} from "lucide-react";

interface BlockedItem {
  id: string;
  target: string;
  type: "ip" | "phone";
  reason: string;
  blocked_at: string;
  attempts: number;
  last_attempt_at: string;
}

interface IncidentItem {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  ip: string;
  phone?: string;
  reference?: string;
  paystack_ref?: string;
  amount_claimed?: number;
  amount_received?: number;
  details: string;
  timestamp: string;
  blocked: boolean;
  alert_sent: boolean;
  alert_error?: string;
}

export default function AdminSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<BlockedItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [filterType, setFilterType] = useState<"all" | "ip" | "phone">("all");

  // Maintenance Mode / Kill Switch State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [togglingMaint, setTogglingMaint] = useState(false);

  // WhatsApp Alert Settings State
  const [adminPhone, setAdminPhone] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [callmebotKey, setCallmebotKey] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [alertNotice, setAlertNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Manual Block State
  const [newTarget, setNewTarget] = useState("");
  const [newTargetType, setNewTargetType] = useState<"ip" | "phone">("ip");
  const [newTargetReason, setNewTargetReason] = useState("");
  const [blockingTarget, setBlockingTarget] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  // Baileys WhatsApp Bot Status
  const [baileysInfo, setBaileysInfo] = useState<{
    online: boolean;
    connected: boolean;
    status: string;
    user?: string | null;
    qr_data_url?: string | null;
  } | null>(null);

  const configLoadedRef = useRef(false);

  const fetchBaileys = async () => {
    try {
      const res = await fetch("/api/admin/whatsapp", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setBaileysInfo(data);
      }
    } catch (_) {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setBlocked(data.blocked || []);
        setIncidents(data.incidents || []);
        if (data.config) {
          setMaintenanceMode(Boolean(data.config.maintenance_mode));
          if (!configLoadedRef.current) {
            setAdminPhone(data.config.whatsapp_security_phone || "");
            setWebhookUrl(data.config.whatsapp_security_webhook || "");
            setCallmebotKey(data.config.whatsapp_callmebot_apikey || "");
            configLoadedRef.current = true;
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch security data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBaileys();
    const interval = setInterval(() => {
      fetchData();
      fetchBaileys();
    }, 10000); // Live poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setAlertNotice(null);
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          whatsapp_security_phone: adminPhone,
          whatsapp_security_webhook: webhookUrl,
          whatsapp_callmebot_apikey: callmebotKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        configLoadedRef.current = true;
        if (data.config?.whatsapp_security_phone) {
          setAdminPhone(data.config.whatsapp_security_phone);
        }
        setAlertNotice({ type: "success", message: "WhatsApp Admin Number saved & updated successfully!" });
      } else {
        setAlertNotice({ type: "error", message: data.message || "Failed to save configuration." });
      }
    } catch (err: any) {
      setAlertNotice({ type: "error", message: err?.message || "Connection error." });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestAlert = async () => {
    setTestingAlert(true);
    setAlertNotice(null);
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_alert", test_phone: adminPhone }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertNotice({
          type: "success",
          message: data.message || "Test alert delivered! Check your WhatsApp / phone.",
        });
      } else {
        setAlertNotice({
          type: "error",
          message: data.message || `Failed to send test alert: ${data.error}`,
        });
      }
    } catch (err: any) {
      setAlertNotice({ type: "error", message: err?.message || "Failed to dispatch test alert." });
    } finally {
      setTestingAlert(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const nextState = !maintenanceMode;
    const confirmMsg = nextState
      ? "Are you sure you want to TURN OFF the entire system? All pages (home, store, buy, admin) will show 'UNDER MAINTENANCE' to everyone."
      : "Are you sure you want to TURN ON the system? The site and admin will go back online for all users.";
    
    if (!window.confirm(confirmMsg)) return;

    setTogglingMaint(true);
    setAlertNotice(null);
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_maintenance", enabled: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setMaintenanceMode(Boolean(data.maintenance_mode));
        setAlertNotice({
          type: "success",
          message: data.message || (nextState ? "System put under maintenance." : "System restored online."),
        });
      } else {
        setAlertNotice({ type: "error", message: data.message || "Failed to toggle maintenance mode." });
      }
    } catch (err: any) {
      setAlertNotice({ type: "error", message: err?.message || "Connection error." });
    } finally {
      setTogglingMaint(false);
    }
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarget.trim()) return;
    setBlockingTarget(true);
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block",
          target: newTarget.trim(),
          type: newTargetType,
          reason: newTargetReason.trim() || "Manual admin block",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTarget("");
        setNewTargetReason("");
        setIsBlockModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to block entity:", err);
    } finally {
      setBlockingTarget(false);
    }
  };

  const handleUnblock = async (target: string, type: "ip" | "phone") => {
    if (!confirm(`Are you sure you want to unblock ${target}? They will be able to access the store again.`)) return;
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock", target, type }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to unblock target:", err);
    }
  };

  const filteredBlocked = blocked.filter((b) => {
    if (filterType === "all") return true;
    return b.type === filterType;
  });

  const blockedIpsCount = blocked.filter((b) => b.type === "ip").length;
  const blockedPhonesCount = blocked.filter((b) => b.type === "phone").length;

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-2xl text-red-400 shadow-lg shadow-red-950/50">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  Security & Intrusion Firewall
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                    Shield Active
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Automated threat detection, immediate IP & phone auto-blocking, and instant WhatsApp security alerts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsBlockModalOpen(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              Blacklist IP / Phone
            </button>
            <button
              onClick={handleToggleMaintenance}
              disabled={togglingMaint}
              className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-colors ${
                maintenanceMode
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                  : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
              }`}
            >
              {togglingMaint ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Power className="w-3.5 h-3.5" />
              )}
              {maintenanceMode ? "Turn System ON" : "Kill Switch (Maintenance)"}
            </button>
          </div>
        </div>

        {/* Maintenance Mode Alert Banner if Active */}
        {maintenanceMode && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/90 via-red-900/70 to-amber-950/90 border-2 border-red-600 text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl shadow-red-950/60">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg animate-pulse shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap">
                  Emergency Maintenance Lockdown Active
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                    All Routes Blocked
                  </span>
                </h3>
                <p className="text-xs text-red-300 mt-1">
                  The entire platform (storefronts, buyer checkout, and admin pages) is currently showing &apos;UNDER MAINTENANCE&apos; to all visitors.
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleMaintenance}
              disabled={togglingMaint}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              {togglingMaint ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
              Restore Platform Online
            </button>
          </div>
        )}

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Attacks Neutralized</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2">{incidents.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">Logged security violations</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Blocked IPs</span>
              <Globe className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-3xl font-black text-red-400 mt-2">{blockedIpsCount}</div>
            <p className="text-[11px] text-slate-500 mt-1">Blacklisted malicious addresses</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Blocked Phones</span>
              <Phone className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-amber-400 mt-2">{blockedPhonesCount}</div>
            <p className="text-[11px] text-slate-500 mt-1">Simulators & fraudulent SIMs</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">WhatsApp Alert Link</span>
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-base font-bold text-white mt-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              {adminPhone ? adminPhone : "Not Configured"}
            </div>
            <p className="text-[11px] text-emerald-400 mt-1">Instant intrusion push notifications</p>
          </div>
        </div>

        {/* WhatsApp Notification Configuration Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 relative shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-400" />
                WhatsApp Security Alert Integration
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your phone number to receive immediate WhatsApp alerts whenever an unauthorized person attempts to tamper with payments, simulate fake references, or run automated scripts.
              </p>
            </div>
            <button
              onClick={handleTestAlert}
              disabled={testingAlert || !adminPhone}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              {testingAlert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test WhatsApp Alert
            </button>
          </div>

          {/* Baileys WhatsApp Bot Status & QR Scanner Card */}
          <div className="mb-6 p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    baileysInfo?.connected
                      ? "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"
                      : "bg-amber-400 animate-pulse"
                  }`}
                />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                    WhatsApp Scanner & Push Alert Status
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        baileysInfo?.connected
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {baileysInfo?.connected
                        ? `Connected (${baileysInfo.user ? "+" + baileysInfo.user : "Active"})`
                        : "Ready to Scan / Link"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {baileysInfo?.connected
                      ? `Your WhatsApp (+${baileysInfo.user}) is linked! Any attack attempt will instantly trigger a WhatsApp push alert.`
                      : "Scan the QR code below or open the dedicated scanner page to link your WhatsApp."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchBaileys}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh QR
                </button>
                <a
                  href="/link"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Scanner (/link)
                </a>
              </div>
            </div>

            {/* QR Code Display if available */}
            {baileysInfo?.qr_data_url && !baileysInfo?.connected && (
              <div className="mt-5 flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-900/80 rounded-xl border border-slate-700">
                <div className="p-3 bg-white rounded-xl shadow-lg shrink-0">
                  <img src={baileysInfo.qr_data_url} alt="WhatsApp QR Code" className="w-48 h-48 block" />
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    How to Link your WhatsApp:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-xs">
                    <li>Open WhatsApp on your phone</li>
                    <li>Tap <b>Menu (⋮)</b> or <b>Settings</b> &gt; <b>Linked Devices</b></li>
                    <li>Tap <b>Link a Device</b> and point camera at this screen</li>
                  </ol>
                  <p className="text-[11px] text-emerald-400 pt-1 font-medium">
                    ✓ Once scanned, your phone will automatically link and intrusion alerts will be pushed to your WhatsApp instantly.
                  </p>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                Admin WhatsApp Phone Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="e.g. 0547100951 or 233547100951"
                  required
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors shrink-0 disabled:opacity-50"
                >
                  {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </button>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Your personal number where alerts will be sent.</span>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                WhatsApp Bot Webhook (Optional)
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="http://127.0.0.1:3001/send"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Only needed if running a persistent VPS bot.</span>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                CallMeBot API Key (Optional)
              </label>
              <input
                type="password"
                value={callmebotKey}
                onChange={(e) => setCallmebotKey(e.target.value)}
                placeholder="Optional backup key"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Optional fallback provider.</span>
            </div>

            <div className="sm:col-span-3 flex justify-end pt-2 border-t border-slate-800/50">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg"
              >
                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save All Security Preferences"}
              </button>
            </div>
          </form>
        </div>

        {/* Live Attack Feed & Blocked Entities Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section 1: Active Blacklist / Blocked Entities */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-400" />
                  Active Firewall Blacklist ({blocked.length})
                </h2>
                <p className="text-[11px] text-slate-400">All blocked IPs and phone numbers are rejected immediately.</p>
              </div>

              <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === "all" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({blocked.length})
                </button>
                <button
                  onClick={() => setFilterType("ip")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === "ip" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  IPs ({blockedIpsCount})
                </button>
                <button
                  onClick={() => setFilterType("phone")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === "phone" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Phones ({blockedPhonesCount})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] space-y-2.5 pr-1">
              {filteredBlocked.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500/40 mb-2" />
                  No entities currently blacklisted. Your platform is clean.
                </div>
              ) : (
                filteredBlocked.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            item.type === "ip"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="font-mono text-xs font-bold text-white truncate">{item.target}</span>
                        {item.attempts > 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
                            {item.attempts} attempts
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">{item.reason}</p>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Blocked on {new Date(item.blocked_at).toLocaleString("en-GB")}
                      </span>
                    </div>

                    <button
                      onClick={() => handleUnblock(item.target, item.type)}
                      className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold rounded-lg border border-slate-600 transition-colors shrink-0"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: Real-time Incident Audit Stream */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <div className="border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                Live Intrusion & Block Log ({incidents.length})
              </h2>
              <p className="text-[11px] text-slate-400">
                Audited stream of every unauthorized attempt stopped by the system.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] space-y-3 pr-1">
              {incidents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500/40 mb-2" />
                  No security incidents logged yet.
                </div>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3.5 bg-slate-800/40 border border-slate-800/80 rounded-2xl space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          inc.severity === "critical"
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {inc.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(inc.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium">{inc.details}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="flex items-center gap-1 font-mono">
                        <Globe className="w-3 h-3 text-slate-500" />
                        {inc.ip}
                      </span>
                      {inc.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {inc.phone}
                        </span>
                      )}
                      <span
                        className={`ml-auto text-[10px] font-bold ${
                          inc.alert_sent ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {inc.alert_sent ? "✓ WhatsApp Alert Sent" : "Alert Logged"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Manual Blacklist Modal */}
        {isBlockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-400" />
                  Manually Blacklist Target
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add an IP address or phone number to permanently block it from placing orders on BigJay Data.
                </p>
              </div>

              <form onSubmit={handleManualBlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                    Target Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewTargetType("ip")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                        newTargetType === "ip"
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      IP Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTargetType("phone")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                        newTargetType === "phone"
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      Phone Number
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                    {newTargetType === "ip" ? "IP Address" : "Phone Number"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder={newTargetType === "ip" ? "e.g. 192.168.1.1" : "e.g. 0551234567"}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                    Reason for Blacklist
                  </label>
                  <input
                    type="text"
                    value={newTargetReason}
                    onChange={(e) => setNewTargetReason(e.target.value)}
                    placeholder="e.g. Suspicious automated PowerShell calls"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBlockModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={blockingTarget}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {blockingTarget ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Blacklist"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
