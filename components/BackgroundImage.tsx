"use client";

import React from "react";

export default function BackgroundImage() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      <img
        src="/bg-image.jpg"
        alt="Abstract Blue Galaxy Network Wallpaper"
        className="w-full h-full object-cover object-center filter brightness-85 contrast-110"
      />
      {/* Dark gradient overlay to guarantee text and card readability while showcasing the constellation network wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/85 pointer-events-none" />
    </div>
  );
}
