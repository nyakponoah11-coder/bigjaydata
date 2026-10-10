"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Code,
  ShieldCheck,
  Power,
  Lock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Sparkles,
  RefreshCw,
  LogOut,
  Sliders,
  Users,
  Store,
} from "lucide-react";

export default function DeveloperPage() {
  const [passkey, setPasskey] = useState("");
  const [inputPass, setInputPass] = useState("");
  const [isAuth, setIsAuth] = useState(false);
  const [authError, setAuthError] = useState("");

  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [stats, setStats] = useState<{ total_agents: number; total_orders: number } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Check stored passkey
  useEffect(() => {
    const saved = localStorage.getItem("stony_dev_passkey");
    if (saved) {
      setPasskey(saved);
      verifyAndLoad(saved);
    }
  }, []);

  const verifyAndLoad = async (key: string) => {
    setLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/developer/agent-store");
      const data = await res.json();
      if (data.success) {
        setIsAuth(true);
        setPasskey(key);
        localStorage.setItem("stony_dev_passkey", key);
        setIsEnabled(data.is_enabled);
        setStats(data.stats);
      }
    } catch (err: any) {
      setAuthError("Failed to connect to developer service");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPass.trim()) return;

    setLoading(true);
    setAuthError("");

    try {
      // Test passkey against toggle endpoint with current state
      const checkRes = await fetch("/api/developer/agent-store");
      const checkData = await checkRes.json();
      const current = checkData.is_enabled ?? true;

      const testRes = await fetch("/api/developer/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: inputPass.trim(), is_enabled: current }),
      });

      const testData = await testRes.json();
      if (!testRes.ok || !testData.success) {
        throw new Error(testData.message || "Invalid Developer Passkey");
      }

      setPasskey(inputPass.trim());
      localStorage.setItem("stony_dev_passkey", inputPass.trim());
      setIsAuth(true);
      setIsEnabled(testData.is_enabled);
    } catch (err: any) {
      setAuthError(err.message || "Access denied. Incorrect passkey.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (targetState: boolean) => {
    setToggling(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/developer/agent-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey, is_enabled: targetState }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to toggle state");
      }

      setIsEnabled(data.is_enabled);
      setMessage(data.message);
      setTimeout(() => setMessage(""), 5000);
    } catch (err: any) {
      setError(err.message || "Toggle failed");
    } finally {
      setToggling(false);
    }
  };

  const handleLock = () => {
    localStorage.removeItem("stony_dev_passkey");
    setPasskey("");
    setIsAuth(false);
    setInputPass("");
  };

  // 1. Password Protection Gate
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/20">
              <Code className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Developer Gate</h1>
            <p className="text-xs text-slate-400">
              Authorized developer console for Stony. Please enter your secret passkey.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Passkey
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter developer passkey..."
                  value={inputPass}
                  onChange={(e) => setInputPass(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock Developer Console"}
            </button>
          </form>

          <p className="text-[11px] text-center text-slate-500">
            Passkeys: <code>stony2026</code> • <code>developer2026</code>
          </p>
        </div>
      </div>
    );
  }

  // 2. Developer Console Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
              <Code className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-sm text-white">Stony Developer Hub</h2>
              <span className="text-[10px] text-cyan-400 font-mono">Master Feature Control</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
            >
              <span>Main Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleLock}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Console</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-8">
        {message && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Master Switch Hero Card */}
        <div
          className={`rounded-3xl p-6 sm:p-10 border-2 transition-all shadow-2xl relative overflow-hidden ${
            isEnabled
              ? "bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/50 shadow-emerald-500/10"
              : "bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/50 shadow-amber-500/10"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3 max-w-lg">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full animate-ping ${
                    isEnabled ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                    isEnabled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-400/40"
                  }`}
                >
                  {isEnabled ? "STATUS: LIVE (ENABLED)" : "STATUS: COMING SOON (LOCKED)"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Agent Store Master License Switch
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isEnabled ? (
                  <>
                    The <strong>Agent Store is currently ON</strong>. The navbar badge shows &quot;Reseller&quot;, public storefronts are functioning, and users can register &amp; login.
                  </>
                ) : (
                  <>
                    The <strong>Agent Store is currently OFF (&apos;Coming Soon&apos;)</strong>. The main navbar says &quot;Coming Soon&quot;, <code>/agent-store</code> shows the pre-launch waitlist, and direct storefront links are locked.
                  </>
                )}
              </p>
            </div>

            {/* Giant Toggle Button */}
            <div className="shrink-0">
              <button
                onClick={() => handleToggle(!isEnabled)}
                disabled={toggling}
                className={`px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-2xl transition-all flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 ${
                  isEnabled
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30"
                }`}
              >
                {toggling ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Power className="w-5 h-5" />
                )}
                <span>{isEnabled ? "Turn OFF (Set to Coming Soon)" : "Turn ON (Enable Live Store)"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Store className="w-4 h-4 text-cyan-400" />
                <span>Test Public View (`/agent-store`)</span>
              </div>
              <Link
                href="/agent-store"
                target="_blank"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-bold"
              >
                <span>Open in Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              See exactly what visitors see on the main site right now based on your toggle state.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Admin Hub (`/admin/agent-store`)</span>
              </div>
              <Link
                href="/admin/agent-store"
                target="_blank"
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-bold"
              >
                <span>Open in Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Full admin dashboard for base bundle costs, registered agents, and payouts.
            </p>
          </div>
        </div>

        {/* Developer Notes / Payment Guard */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Developer License Protection Protocol</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            When you deploy to Vercel and GitHub, you can keep the switch in <strong>&quot;Coming Soon&quot;</strong> mode until your payment has been settled. When ready, navigate to <code>/developer</code> on your live domain, enter your passkey, and click <strong>&quot;Turn ON (Enable Live Store)&quot;</strong> to activate the entire system instantly without touching the code.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <p>Built by Stony • Developer Master Control System</p>
      </footer>
    </div>
  );
}
