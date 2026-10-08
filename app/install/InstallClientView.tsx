"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Smartphone,
  Download,
  Apple,
  Share,
  PlusSquare,
  CheckCircle,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Bell,
  Wifi,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface Props {
  storeName?: string;
  whatsappNumber?: string;
  whatsappChannelUrl?: string;
}

export default function InstallClientView({
  storeName = "Big Jay Data",
  whatsappNumber = "233551234567",
  whatsappChannelUrl = "",
}: Props) {
  const [activeTab, setActiveTab] = useState<"android" | "ios">("android");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Detect OS
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setActiveTab("ios");
      } else {
        setActiveTab("android");
      }

      if (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      ) {
        setIsInstalled(true);
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallAndroid = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setInstallSuccess(true);
        }
      } catch (err) {
        console.warn("Install prompt failed:", err);
      }
    } else {
      alert(
        "To install on Android:\n1. Tap the 3 dots (⋮) in the top-right of Chrome.\n2. Tap 'Install app' or 'Add to Home screen'.\n3. Tap 'Install'."
      );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Official Web App
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/70 border-2 border-emerald-500/30 p-6 sm:p-10 shadow-2xl shadow-emerald-500/10 overflow-hidden text-center backdrop-blur-md">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-emerald-500/20 to-transparent blur-3xl pointer-events-none" />

        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-green-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 mb-4 p-2 border border-emerald-300/40">
          <img src="/logo.png" alt={storeName} className="w-full h-full object-contain" />
        </div>

        <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Instant Mobile Installation
        </span>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          Install {storeName} App
        </h1>

        <p className="mt-3 text-xs sm:text-sm lg:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
          Add {storeName} directly to your phone&apos;s home screen for lightning-fast 1-tap data buying, live delivery tracking, and zero browser hassle.
        </p>

        {isInstalled && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>App is already running as an installed standalone app!</span>
          </div>
        )}
      </div>

      {/* Platform Switcher (Android vs iPhone) */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg max-w-md w-full">
          <button
            onClick={() => setActiveTab("android")}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "android"
                ? "bg-emerald-500 text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (APK / WebApp)</span>
          </button>

          <button
            onClick={() => setActiveTab("ios")}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "ios"
                ? "bg-emerald-500 text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iPhone (iOS Safari)</span>
          </button>
        </div>
      </div>

      {/* Active Tab Instructions Card */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-xl">
        {activeTab === "android" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white">
                    Android Installation Guide
                  </h2>
                  <p className="text-xs text-slate-400">Works on Chrome, Samsung Internet, Edge & Opera</p>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                1-Tap Install
              </span>
            </div>

            {/* Step by Step List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  1
                </div>
                <h3 className="font-extrabold text-sm text-white">Tap Install Button</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tap the green <strong>Install App on Android</strong> button below to open the system prompt.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  2
                </div>
                <h3 className="font-extrabold text-sm text-white">Or Use Chrome Menu</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tap Chrome menu (<strong>⋮ 3 vertical dots</strong> in top right) &rarr; tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  3
                </div>
                <h3 className="font-extrabold text-sm text-white">Instant App Launch</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The {storeName} app icon will appear right on your phone&apos;s home screen and app drawer!
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start">
              <button
                onClick={handleInstallAndroid}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install App on Android</span>
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                <span>Continue on Web</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center">
                  <Apple className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white">
                    iPhone (iOS Safari) Installation Guide
                  </h2>
                  <p className="text-xs text-slate-400">Zero App Store download needed • Works instantly on iOS</p>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Safari
              </span>
            </div>

            {/* Step by step for iOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  1
                </div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <span>Tap Share Icon</span>
                  <span className="text-slate-400 text-xs font-mono bg-slate-800 px-1 py-0.5 rounded">⎋</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Open {storeName} in Safari. Tap the <strong>Share</strong> button at the bottom of your screen (square with arrow pointing up).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  2
                </div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <span>Add to Home Screen</span>
                  <span className="text-slate-400 text-xs font-mono bg-slate-800 px-1 py-0.5 rounded">+</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scroll down the share options and tap <strong className="text-emerald-400">&quot;Add to Home Screen&quot;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  3
                </div>
                <h3 className="font-extrabold text-sm text-white">Tap &quot;Add&quot;</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tap <strong>&quot;Add&quot;</strong> in the top-right corner. The app will immediately appear on your iPhone home screen!
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                <span>Done! Open Home Page</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Why Install Big Jay Data App Benefits */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 space-y-5">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full">
            App Benefits
          </span>
          <h3 className="text-lg sm:text-xl font-black text-white">
            Why You Should Add Big Jay Data to Your Phone
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-white">1-Tap Fast Buying</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              No need to type the URL in your browser every time. Tap once and purchase bundles in seconds.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-2">
              <Bell className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-white">Live Tracking</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Check live gateway dispatch status and track past delivery references effortlessly.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-2">
              <Wifi className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-white">Less Data & Storage</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Takes less than 1MB of phone storage and uses significantly less internet than browser tabs.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-white">100% Secure</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Runs in an isolated high-security sandbox with certified 256-bit SSL encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
