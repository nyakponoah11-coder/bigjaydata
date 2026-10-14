"use client";

import React, { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { getCachedSettings, saveSettingsSession } from "@/lib/device-session";

interface Props {
  text?: string;
  isActive?: boolean;
}

export default function AnnouncementBanner({
  text = "",
  isActive = true,
}: Props) {
  const [currentText, setCurrentText] = useState(() => {
    if (text) return text;
    const cached = getCachedSettings();
    return cached?.announcement_text || "";
  });
  const [active, setActive] = useState(() => {
    if (isActive !== undefined) return isActive;
    const cached = getCachedSettings();
    return cached?.announcement_active !== false;
  });

  // Sync when props change from server
  useEffect(() => {
    if (text) {
      setCurrentText(text);
    }
    if (isActive !== undefined) {
      setActive(isActive);
    }
  }, [text, isActive]);

  // Only fetch from /api/settings if no initial text was provided
  useEffect(() => {
    if (text && text.trim()) return;

    let isMounted = true;
    const fetchLiveBanner = async (forceFresh = false) => {
      try {
        const { cachedAsync } = await import("@/lib/localCache");
        const data = await cachedAsync(
          "public_settings",
          async () => {
            const res = await fetch("/api/settings", {
              cache: "no-store",
              headers: { "Cache-Control": "no-cache" },
            });
            return await res.json();
          },
          60 * 1000,
          forceFresh
        );
        if (isMounted && data?.success && data?.settings) {
          if (data.settings.announcement_text !== undefined) {
            setCurrentText(data.settings.announcement_text);
          }
          if (data.settings.announcement_active !== undefined) {
            setActive(data.settings.announcement_active !== false);
          }
          saveSettingsSession(data.settings);
        }
      } catch (err) {}
    };

    fetchLiveBanner();

    // Listen for focus events to auto-refresh when admin saves settings in another tab
    const handleFocus = () => fetchLiveBanner(false);
    window.addEventListener("focus", handleFocus);
    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [text]);

  if (!active || !currentText?.trim()) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-xs sm:text-sm font-medium py-2 px-4 shadow-sm overflow-hidden relative border-b border-emerald-500/30">
      <div className="flex items-center gap-3">
        <span className="shrink-0 flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase">
          <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          Alert
        </span>

        {/* Rolling Marquee text */}
        <div className="relative w-full overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee pl-4">
            <span className="font-medium tracking-wide">{currentText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
