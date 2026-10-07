"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Home,
  Package,
  Search,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface Props {
  storeName?: string;
  whatsappNumber?: string;
}

export default function Navbar({
  storeName = "BundleMartGh",
  whatsappNumber = "233551234567",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const navLinks = [
    { label: "Home", href: "/", icon: Home, badge: null },
    { label: "MTN Data Bundles", href: "/buy/mtn", icon: null, dot: "bg-amber-400", badge: "Popular" },
    { label: "Telecel Data Bundles", href: "/buy/telecel", icon: null, dot: "bg-red-500", badge: "Fast" },
    { label: "AT (AirtelTigo) Bundles", href: "/buy/at", icon: null, dot: "bg-blue-500", badge: null },
    { label: "Track Order Status", href: "/track", icon: Search, badge: "Live" },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo & Store Name (Left) */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform bg-black flex items-center justify-center p-0.5 border border-slate-200/50 dark:border-slate-800">
                <img
                  src="/logo.png"
                  alt={storeName}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                {storeName}
              </span>
            </Link>

            {/* Right Side: Menu Toggle Button (Tap to Open / Close) */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-md group border border-slate-800 dark:border-slate-700"
                aria-label="Toggle menu"
              >
                {isOpen ? (
                  <X className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Menu className="w-5 h-5 text-emerald-400 group-hover:rotate-90 transition-transform duration-200" />
                )}
                <span className="text-xs font-black tracking-wider uppercase">
                  {isOpen ? "Close" : "Menu"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Slide-out Menu Drawer from the Right Side */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop (tap to close) */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Side Drawer Panel */}
          <div className="relative w-80 sm:w-96 max-w-[85vw] h-full bg-[#0b1320] border-l border-slate-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-right duration-300 text-white">
            <div>
              {/* Drawer Top: Header & Close Button */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-black border border-slate-800 p-0.5">
                    <img src="/logo.png" alt={storeName} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white tracking-tight leading-none">
                      {storeName}
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      Navigation
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="py-6 space-y-2">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                          : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.dot && (
                          <span className={`w-2.5 h-2.5 rounded-full ${item.dot} shadow-xs`} />
                        )}
                        {Icon && <Icon className="w-4 h-4 text-emerald-400" />}
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-emerald-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions & Support */}
            <div className="pt-6 border-t border-slate-800 space-y-3">
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=Hello%20${encodeURIComponent(storeName)}%2C%20I%20need%20assistance.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs tracking-wide transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat on WhatsApp Support
                </a>
              )}

              <div className="text-center text-[10px] text-slate-500">
                © {new Date().getFullYear()} {storeName} • Instant Automated Data
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
