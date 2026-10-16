"use client";

import React, { useState, useEffect } from "react";
import { Zap } from "lucide-react";

interface Props {
  text?: string;
  isActive?: boolean;
}

export default function AnnouncementBanner({
  text = "",
  isActive = true,
}: Props) {
  const [currentText, setCurrentText] = useState(text || "");
  const [active, setActive] = useState(isActive !== false);

  // Sync immediately when props change from server
  useEffect(() => {
    setCurrentText(text || "");
    setActive(isActive !== false);
  }, [text, isActive]);

  // Real-time synchronization when admin saves settings in another tab or same window
  useEffect(() => {
    let isMounted = true;

    const fetchFresh = async () => {
      try {
        const res = await fetch("/api/settings", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
        });
        const data = await res.json();
        if (isMounted && data?.success && data?.settings) {
          if (data.settings.announcement_text !== undefined) {
            setCurrentText(data.settings.announcement_text || "");
          }
          if (data.settings.announcement_active !== undefined) {
            setActive(data.settings.announcement_active !== false);
          }
        }
      } catch (err) {}
    };

    const handleUpdate = () => fetchFresh();

    window.addEventListener("focus", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("bmgh_settings_updated", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("bmgh_settings_updated", handleUpdate);
    };
  }, []);

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
