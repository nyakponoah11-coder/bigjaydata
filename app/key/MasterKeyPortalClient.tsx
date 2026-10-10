"use client";

import React from "react";

export default function MasterKeyPortalClient() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0b1021] to-[#050811] text-slate-100 flex flex-col justify-between p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Top Minimal Nav */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-4">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-black border border-slate-800 flex items-center justify-center p-0.5 shadow-md">
            <img src="/logo.png" alt="BundleMartGh" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">BundleMartGh</span>
        </a>

        <a
          href="/"
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          ← Return to Main Site
        </a>
      </div>

      {/* Master Key Portal Hero */}
      <div className="max-w-2xl mx-auto w-full text-center py-16 sm:py-24 space-y-6 flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 shadow-lg shadow-indigo-950/50">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
            Developer Master Key Portal
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Master Key Access <br />
          <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            Portal
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
          This page displays the master key portal URL. Copy the link below and open it manually in your browser.
        </p>

        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 max-w-md mx-auto shadow-2xl space-y-4 w-full">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider text-left">
              Master Key Portal URL
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value="bundlemartgh.com/key"
                className="w-full px-4 py-3 bg-slate-800 border border-indigo-500 rounded-xl text-white text-center text-base font-mono font-bold tracking-wider focus:outline-none cursor-default select-all"
                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Click to select all → Copy manually (Ctrl+C / Cmd+C)
            </p>
          </div>
          
          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <p>This URL is for reference only.</p>
            <p>It does not link to any internal system page.</p>
            <p>Type it directly in your browser address bar to access.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full text-center py-6 border-t border-slate-800/60 text-xs text-slate-500">
        BundleMartGh Master Key Portal • Developer API Access
      </div>
    </div>
  );
}