"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Settings,
  Bot,
  MessageSquare,
  LogOut,
  Signal,
  Lock,
  Loader2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("bigj_admin_auth");
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid password");
      }

      localStorage.setItem("bigj_admin_auth", data.token || "authenticated");
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err?.message || "Invalid admin password. Default is bigj2026");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bigj_admin_auth");
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Password Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl backdrop-blur-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              BIGJ DATA Admin Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Enter merchant master password to manage bundles and orders
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                Admin Password
              </label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Default password: <span className="font-mono text-emerald-400">bigj2026</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock Dashboard"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Return to Customer Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin Navigation Items
  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "AI Agent Actions", href: "/admin/ai-agent", icon: Bot, badge: "AI Copilot" },
    { label: "Messages", href: "/admin/messages", icon: MessageSquare },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md">
              <Signal className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white tracking-tight block">
                BIGJ DATA
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                Merchant Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Links */}
        <nav className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-extrabold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Store Link & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Open Customer Store
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Admin
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-slate-950 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
