"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Download,
  CheckCircle,
  Share,
  PlusSquare,
  Sparkles,
  X,
  Apple,
  ExternalLink,
  Info,
} from "lucide-react";

interface Props {
  storeName?: string;
}

export default function DownloadAppBanner({ storeName = "Big Jay Data" }: Props) {
  const [isDismissed, setIsDismissed] = useState(true); // start true to prevent flash before checking localStorage
  const [activeTab, setActiveTab] = useState<"android" | "ios">("android");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showDoneToast, setShowDoneToast] = useState(false);

  useEffect(() => {
    // Check if user has already downloaded or tapped Done
    try {
      const alreadyDone = localStorage.getItem("bigjay_app_downloaded_done");
      if (!alreadyDone) {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }

    // Auto-detect iOS vs Android
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setActiveTab("ios");
      } else {
        setActiveTab("android");
      }
    }

    // Listen for PWA install prompt event (Android / Chromium)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Detect if already running in standalone mode (PWA installed)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

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
        }
      } catch (err) {
        console.warn("Install prompt error:", err);
      }
    } else {
      // Alert/instruction for in-app browser or when prompt is deferred
      alert(
        "To install on Android:\n1. Tap the 3 dots (⋮) in the top-right of Chrome.\n2. Tap 'Install app' or 'Add to Home screen'.\n3. Tap 'Install'."
      );
    }
  };

  const handleMarkAsDone = () => {
    try {
      localStorage.setItem("bigjay_app_downloaded_done", "true");
    } catch {}
    setShowDoneToast(true);
    setTimeout(() => {
      setIsDismissed(true);
    }, 1200);
  };

  if (isDismissed) return null;

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-4 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/80 border-2 border-emerald-500/40 p-5 sm:p-7 shadow-2xl shadow-emerald-500/10 overflow-hidden backdrop-blur-md">
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> Mobile App Available
                </span>
                <span className="text-[10px] font-bold text-slate-400">Android & iPhone</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1 tracking-tight">
                Download {storeName} App on Your Phone
              </h2>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleMarkAsDone}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            aria-label="Dismiss banner"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
          Install the fast mobile app on your phone screen for instant 1-tap bundle purchases without opening your browser every time!
        </p>

        {/* Tab switcher: Android vs iPhone */}
        <div className="mt-4 flex items-center gap-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 max-w-sm">
          <button
            onClick={() => setActiveTab("android")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "android"
                ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (APK)</span>
          </button>
          <button
            onClick={() => setActiveTab("ios")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "ios"
                ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iPhone (iOS)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-3.5 p-4 rounded-2xl bg-black/40 border border-slate-800/90 text-xs text-slate-200">
          {activeTab === "android" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Download className="w-4 h-4" />
                <span>How to Install on Android:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] sm:text-xs">
                <li>
                  Tap the <strong className="text-white">Install App (Android)</strong> button below.
                </li>
                <li>
                  Or open Chrome menu (<strong className="text-white">⋮ 3 dots</strong>) in the top-right corner.
                </li>
                <li>
                  Select <strong className="text-emerald-400">&quot;Install app&quot;</strong> or <strong className="text-emerald-400">&quot;Add to Home screen&quot;</strong>.
                </li>
              </ol>

              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleInstallAndroid}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App on Android</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Share className="w-4 h-4" />
                <span>How to Add to iPhone (iOS Safari):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] sm:text-xs">
                <li>
                  Tap the Safari <strong className="text-white">Share button</strong> (the square with arrow pointing up <span className="inline-block px-1 py-0.5 rounded bg-slate-800 text-[10px] font-mono">⎋</span> at bottom).
                </li>
                <li>
                  Scroll down the share menu and tap <strong className="text-emerald-400">&quot;Add to Home Screen&quot;</strong> (<span className="inline-block px-1 py-0.5 rounded bg-slate-800 text-[10px] font-mono">+</span>).
                </li>
                <li>
                  Tap <strong className="text-white">&quot;Add&quot;</strong> in the top-right corner to place {storeName} on your home screen.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Completion Action Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Once added to your phone, tap &quot;Done&quot; to hide this card:</span>
          </div>

          {/* I HAVE DOWNLOADED / DONE BUTTON */}
          <button
            onClick={handleMarkAsDone}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white font-black text-xs transition-all border border-slate-700 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-95 group cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 group-hover:text-white transition-colors" />
            <span>I Have Downloaded / Done</span>
          </button>
        </div>

        {/* Done Toast Notification */}
        {showDoneToast && (
          <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-center p-4 z-20 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-white">App Saved on Your Phone!</h3>
              <p className="text-xs text-slate-400">Thank you! This message will not show again.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
