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
  ExternalLink,
  ShieldAlert,
  Loader2,
  Menu,
  X,
  Sparkles,
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("bundlemart_admin_auth") || localStorage.getItem("bigj_admin_auth");
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

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

      localStorage.setItem("bundlemart_admin_auth", data.token || "authenticated");
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err?.message || "Invalid admin password. Default is bundlemart2026");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bundlemart_admin_auth");
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
            <div className="w-16 h-16 rounded-2xl bg-black border border-slate-800 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-emerald-500/20 overflow-hidden p-1">
              <img src="/logo.png" alt="BundleMartGh" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              BundleMartGh Admin Portal
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
                Default password: <span className="font-mono text-emerald-400">bundlemart2026</span>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar with Right-Side Menu Toggle */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo & Brand (Left) */}
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center p-0.5 shadow-md group-hover:scale-105 transition-transform">
                <img src="/logo.png" alt="BundleMartGh" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-extrabold text-base sm:text-lg text-white tracking-tight block">
                  BundleMartGh
                </span>
                <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase">
                  Merchant Admin
                </span>
              </div>
            </Link>

            {/* Right Side: Menu Button (Tap to Open / Close) */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                Store
              </Link>

              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md group"
                aria-label="Toggle admin menu"
              >
                {isDrawerOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                )}
                <span className="text-xs font-black tracking-wider uppercase">
                  {isDrawerOpen ? "Close" : "Admin Menu"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area (Full Width) */}
      <main className="flex-1 min-w-0 bg-slate-950 p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Slide-out Admin Drawer from the Right Side */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop (Tap to close) */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Side Drawer Panel */}
          <aside className="relative w-80 sm:w-96 max-w-[85vw] h-full bg-[#0b1320] border-l border-slate-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-right duration-300 text-white">
            <div>
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-black border border-slate-800 p-0.5">
                    <img src="/logo.png" alt="BundleMartGh" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white tracking-tight leading-none">
                      Admin Portal
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      Management Menu
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="py-6 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                          : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-emerald-400" />
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
            </div>

            {/* Bottom Actions: Open Store & Logout */}
            <div className="pt-6 border-t border-slate-800 space-y-2.5">
              <Link
                href="/"
                target="_blank"
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-emerald-400" />
                  View Customer Store
                </span>
                <span className="text-[10px] text-slate-500">Live ↗</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold bg-red-950/40 hover:bg-red-950/70 text-red-400 border border-red-900/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Admin
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
