"use client";

import React from "react";

const COMMENTS = [
  {
    name: "Afia Danso",
    package: "Telecel 2GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    time: "2 mins ago",
  },
  {
    name: "Kwame Mensah",
    package: "MTN 10GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    time: "5 mins ago",
  },
  {
    name: "Kofi Boateng",
    package: "MTN 20GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
    time: "8 mins ago",
  },
  {
    name: "Abena Mansa",
    package: "Telecel 5GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    time: "12 mins ago",
  },
  {
    name: "Yaw Owusu",
    package: "AT 2GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=faces",
    time: "15 mins ago",
  },
  {
    name: "Akosua Darko",
    package: "MTN 15GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces",
    time: "19 mins ago",
  },
  {
    name: "Emmanuel Kojo",
    package: "Telecel 4GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=faces",
    time: "22 mins ago",
  },
  {
    name: "Efua Serwaa",
    package: "MTN 6GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
    time: "25 mins ago",
  },
  {
    name: "Prince Osei",
    package: "Telecel 20GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces",
    time: "29 mins ago",
  },
  {
    name: "Ama Boateng",
    package: "MTN 3GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces",
    time: "34 mins ago",
  },
  {
    name: "Samuel Tetteh",
    package: "AT 10GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces",
    time: "38 mins ago",
  },
  {
    name: "Belinda Sarpong",
    package: "AT 3GB from BundleMartGh",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=faces",
    time: "42 mins ago",
  },
];

export default function CommentsMarquee() {
  return (
    <div className="w-full bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 py-2 sm:py-2.5 overflow-hidden relative backdrop-blur-xs">
      <div className="relative w-full overflow-hidden">
        <div className="animate-marquee-slow flex items-center gap-3 sm:gap-4 pl-3">
          {/* First loop of cards */}
          {COMMENTS.map((c, i) => (
            <div
              key={`a-${i}`}
              className="flex items-center gap-2.5 sm:gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl py-1.5 sm:py-2 px-3 sm:px-3.5 shadow-xs hover:shadow-md transition-shadow shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to avatar placeholder
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {c.name}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium leading-tight mt-0.5">
                  {c.package}
                </span>
              </div>
            </div>
          ))}

          {/* Cloned loop of cards for continuous circular non-stop animation */}
          {COMMENTS.map((c, i) => (
            <div
              key={`b-${i}`}
              aria-hidden="true"
              className="flex items-center gap-2.5 sm:gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl py-1.5 sm:py-2 px-3 sm:px-3.5 shadow-xs hover:shadow-md transition-shadow shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {c.name}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium leading-tight mt-0.5">
                  {c.package}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
