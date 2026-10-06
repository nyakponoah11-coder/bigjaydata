"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Signal, Search, ShieldCheck, Menu, X, ExternalLink } from "lucide-react";

interface Props {
  storeName?: string;
  whatsappNumber?: string;
}

export default function Navbar({
  storeName = "BIGJ DATA",
  whatsappNumber = "233551234567",
}: Props) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Store Name */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Signal className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                {storeName}
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  DATA1GH
                </span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                Ghana's #1 Automated Data Hub
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-2 rounded-lg transition-colors"
            >
              Home
            </Link>
            <Link
              href="/buy/mtn"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-500 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              MTN Data
            </Link>
            <Link
              href="/buy/telecel"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-red-500 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Telecel Data
            </Link>
            <Link
              href="/buy/at"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-500 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              AT Data
            </Link>
            <Link
              href="/track"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Track Order
            </Link>
          </div>

          {/* Actions & Status Badge */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Instant Dispatch
              </span>
            </div>

            <Link
              href="/admin"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-all"
            >
              Admin
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/track"
              className="p-2 text-slate-700 dark:text-slate-200 hover:text-emerald-600 rounded-lg"
              title="Track Order"
            >
              <Search className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-2 text-slate-700 dark:text-slate-200 hover:text-emerald-600 rounded-lg"
              aria-label="Toggle menu"
            >
              {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-2">
          <Link
            href="/"
            onClick={() => setIsMobileOpen(false)}
            className="block text-base font-medium text-slate-800 dark:text-slate-200 py-2.5 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Home
          </Link>
          <Link
            href="/buy/mtn"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-2 text-base font-medium text-slate-800 dark:text-slate-200 py-2.5 px-3 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            MTN Data Bundles
          </Link>
          <Link
            href="/buy/telecel"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-2 text-base font-medium text-slate-800 dark:text-slate-200 py-2.5 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            Telecel Data Bundles
          </Link>
          <Link
            href="/buy/at"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-2 text-base font-medium text-slate-800 dark:text-slate-200 py-2.5 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            AT (AirtelTigo) Bundles
          </Link>
          <Link
            href="/track"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-2 text-base font-medium text-slate-800 dark:text-slate-200 py-2.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600"
          >
            <Search className="w-4 h-4" />
            Track Order Status
          </Link>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
            <span>24/7 Automated Dispatch</span>
            <Link href="/admin" className="text-emerald-600 font-semibold underline">
              Admin Portal
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
