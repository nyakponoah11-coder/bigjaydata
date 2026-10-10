"use client";

import React, { useState, useEffect } from "react";
import {
  Power,
  Store,
  Code,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

interface DeveloperConfig {
  is_enabled: boolean;
  api_key_price: number;
  min_wallet_funding: number;
  notice_message?: string;
}

interface AgentStoreConfig {
  is_enabled: boolean;
  developer_master_enabled?: boolean;
  admin_enabled?: boolean;
  registration_fee: number;
  custom_domain?: string;
}

export default function MasterKeyPortalClient() {
  const [loading, setLoading] = useState(true);
  const [devConfig, setDevConfig] = useState<DeveloperConfig | null>(null);
  const [agentConfig, setAgentConfig] = useState<AgentStoreConfig | null>(null);
  const [togglingDev, setTogglingDev] = useState(false);
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [devRes, agentRes] = await Promise.all([
        fetch("/api/admin/developer", { cache: "no-store" }),
        fetch("/api/admin/agent-store-config", { cache: "no-store" }),
      ]);
      const devData = await devRes.json();
      if (devData.success) setDevConfig(devData.config);
      const agentData = await agentRes.json();
      if (agentData.success) setAgentConfig(agentData.config);
    } catch {
      setNotice({ type: "error", message: "Failed to load configuration." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleDev = async () => {
    if (!devConfig) return;
    const newState = !devConfig.is_enabled;
    const confirmMsg = newState
      ? "Turn ON Developer API? Developers will access the API Portal, generate keys, and make API purchases."
      : "Turn OFF Developer API? Public developer portal shows 'Coming Soon' and API returns 403 Forbidden.";

    if (!window.confirm(confirmMsg)) return;

    setTogglingDev(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_config", is_enabled: newState }),
      });
      const data = await res.json();
      if (data.success) {
        setDevConfig(data.config);
        showNotification("success", newState ? "Developer API is now LIVE!" : "Developer API paused. Portal shows 'Coming Soon'.");
      } else {
        showNotification("error", data.message || "Failed to toggle.");
      }
    } catch {
      showNotification("error", "Server error.");
    } finally {
      setTogglingDev(false);
    }
  };

  const handleToggleAgent = async () => {
    if (!agentConfig) return;
    const newState = !agentConfig.is_enabled;
    const confirmMsg = newState
      ? "Turn ON Agent Store? All agent storefronts become accessible."
      : "Turn OFF Agent Store? All agent storefronts show 'Coming Soon'. Customers cannot purchase.";

    if (!window.confirm(confirmMsg)) return;

    setTogglingAgent(true);
    try {
      const res = await fetch("/api/admin/agent-store-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_config", is_enabled: newState }),
      });
      const data = await res.json();
      if (data.success) {
        setAgentConfig(data.config);
        showNotification("success", newState ? "Agent Store is now LIVE!" : "Agent Store paused. All storefronts show 'Coming Soon'.");
      } else {
        showNotification("error", data.message || "Failed to toggle.");
      }
    } catch {
      showNotification("error", "Server error.");
    } finally {
      setTogglingAgent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0b1021] to-[#050811] text-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0b1021] to-[#050811] text-slate-100 flex flex-col justify-between p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Top Nav */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-4">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-black border border-slate-800 flex items-center justify-center p-0.5 shadow-md">
            <img src="/logo.png" alt="BundleMartGh" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">BundleMartGh</span>
        </a>
        <a href="/" className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
          ← Return to Main Site
        </a>
      </div>

      {/* Master Control Panel */}
      <div className="max-w-2xl mx-auto w-full py-16 sm:py-24 space-y-6 flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 shadow-lg shadow-indigo-950/50">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
            Master Control Panel
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight text-center">
          System Master Switches
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed text-center">
          Control both Agent Store and Developer API from this page. Changes apply to both admin and frontend instantly.
        </p>

        {/* Notifications */}
        {notice && (
          <div className={`w-full max-w-md p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in ${
            notice.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border border-emerald-800"
              : "bg-red-950/90 text-red-300 border border-red-800"
          }`}>
            {notice.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Developer API Switch */}
        {devConfig && (
          <div className={`w-full max-w-md p-6 rounded-3xl border transition-all shadow-xl relative overflow-hidden ${
            devConfig.is_enabled
              ? "bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-800/80 shadow-indigo-950/30"
              : "bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border-amber-900/60 shadow-amber-950/20"
          }`}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${devConfig.is_enabled ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className={`text-xs font-black uppercase tracking-wider ${devConfig.is_enabled ? "text-emerald-400" : "text-amber-400"}`}>
                    {devConfig.is_enabled ? "Developer API Gateway: Active" : "Developer API Gateway: Paused (Coming Soon)"}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white">
                  {devConfig.is_enabled ? "API Gateway is Live for Developers" : "API Access is Paused"}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {devConfig.is_enabled
                    ? "Developers can generate secret API keys, check balances, and automate data fulfillment via REST endpoints."
                    : "The public developer portal at /developer displays 'Coming Soon'. Programmatic API calls return 403 Forbidden."}
                </p>
              </div>

              <button
                onClick={handleToggleDev}
                disabled={togglingDev}
                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-95 ${
                  devConfig.is_enabled
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                {togglingDev ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className={`w-4 h-4 ${devConfig.is_enabled ? "text-white" : "text-amber-400"}`} />}
                <span>{devConfig.is_enabled ? "Developer API: ON" : "Developer API: OFF"}</span>
              </button>

              <p className="text-center text-[11px] text-slate-500">
                Affects: /developer portal, /api/v1/developer/* endpoints
              </p>
            </div>
          </div>
        )}

        {/* Agent Store Switch */}
        {agentConfig && (
          <div className={`w-full max-w-md p-6 rounded-3xl border transition-all shadow-xl relative overflow-hidden ${
            agentConfig.is_enabled
              ? "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-800/80 shadow-emerald-950/30"
              : "bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-900 border-rose-900/60 shadow-rose-950/20"
          }`}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${agentConfig.is_enabled ? "bg-emerald-400" : "bg-rose-400"}`} />
                  <span className={`text-xs font-black uppercase tracking-wider ${agentConfig.is_enabled ? "text-emerald-400" : "text-rose-400"}`}>
                    {agentConfig.is_enabled ? "Agent Storefronts: Active" : "Agent Storefronts: Paused (Coming Soon)"}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white">
                  {agentConfig.is_enabled ? "Agent Stores are Live for Customers" : "Agent Store Access is Paused"}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {agentConfig.is_enabled
                    ? "All agent storefronts are accessible. Customers can browse and purchase data bundles instantly."
                    : "All agent storefronts at /s/[slug] and /d/[token] display 'Coming Soon'. Customers cannot make purchases."}
                </p>
              </div>

              <button
                onClick={handleToggleAgent}
                disabled={togglingAgent}
                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-95 ${
                  agentConfig.is_enabled
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                {togglingAgent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className={`w-4 h-4 ${agentConfig.is_enabled ? "text-white" : "text-rose-400"}`} />}
                <span>{agentConfig.is_enabled ? "Agent Store: ON" : "Agent Store: OFF"}</span>
              </button>

              <p className="text-center text-[11px] text-slate-500">
                Affects: /s/[slug], /d/[token], /[slug] storefronts
              </p>
            </div>
          </div>
        )}

        {/* Reference URL */}
        <div className="pt-4 border-t border-slate-800 w-full max-w-md text-center space-y-2 text-xs text-slate-400">
          <p>This page: <span className="font-mono text-indigo-300">bundlemartgh.com/key</span></p>
          <p>Type this URL directly in browser to access master controls.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full text-center py-6 border-t border-slate-800/60 text-xs text-slate-500">
        BundleMartGh Master Control Panel • System Switches
      </div>
    </div>
  );
}