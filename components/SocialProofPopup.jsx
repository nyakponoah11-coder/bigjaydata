"use client";

import React, { useState, useEffect } from "react";

const REVIEWS = [
  { name: "Kwame A.", package: "10GB MTN", time: "Just now", text: "bought 10GB MTN from BIGJ DATA and received instantly! Legit!", avatar: "https://i.pravatar.cc/100?img=11", color: "bg-amber-500" },
  { name: "Abena M.", package: "5GB Telecel", time: "2 mins ago", text: "purchased 5GB Telecel from DATA1GH in 30 seconds! Highly recommended.", avatar: "https://i.pravatar.cc/100?img=32", color: "bg-red-500" },
  { name: "Kofi B.", package: "20GB MTN", time: "3 mins ago", text: "got 20GB MTN from BIGJ DATA. Fastest data delivery in Ghana!", avatar: "https://i.pravatar.cc/100?img=12", color: "bg-blue-600" },
  { name: "Yaw O.", package: "2GB AT", time: "4 mins ago", text: "received 2GB AT data. Always reliable and cheapest prices on DATA1GH.", avatar: "https://i.pravatar.cc/100?img=13", color: "bg-emerald-600" },
  { name: "Akosua D.", package: "15GB MTN", time: "5 mins ago", text: "loaded 15GB MTN for work. BIGJ DATA delivery is 100% automated!", avatar: "https://i.pravatar.cc/100?img=44", color: "bg-purple-600" },
  { name: "Emmanuel K.", package: "4GB Telecel", time: "6 mins ago", text: "bought 4GB Telecel on DATA1GH. No stress, arrived within 45 seconds.", avatar: "https://i.pravatar.cc/100?img=15", color: "bg-orange-500" },
  { name: "Efua S.", package: "6GB MTN", time: "7 mins ago", text: "got 6GB MTN from BIGJ DATA. Chale, I recommend this store to everyone!", avatar: "https://i.pravatar.cc/100?img=47", color: "bg-pink-600" },
  { name: "Nana Yaw", package: "10GB Telecel", time: "8 mins ago", text: "bought 10GB Telecel from DATA1GH. Very genuine service bossu!", avatar: "https://i.pravatar.cc/100?img=18", color: "bg-indigo-600" },
  { name: "Kojo Mensah", package: "5GB AT", time: "9 mins ago", text: "just ordered 5GB AT data on BIGJ DATA and it dropped immediately.", avatar: "https://i.pravatar.cc/100?img=60", color: "bg-teal-600" },
  { name: "Adwoa F.", package: "1GB MTN", time: "11 mins ago", text: "tested with 1GB MTN from BIGJ DATA. Fast and authentic, will buy 20GB now!", avatar: "https://i.pravatar.cc/100?img=49", color: "bg-yellow-600" },
  { name: "Prince Osei", package: "20GB Telecel", time: "12 mins ago", text: "received 20GB Telecel data from DATA1GH. Smooth Paystack payment!", avatar: "https://i.pravatar.cc/100?img=33", color: "bg-rose-600" },
  { name: "Ama Boateng", package: "3GB MTN", time: "14 mins ago", text: "got 3GB MTN bundle on BIGJ DATA. Thank you for the quick top-up!", avatar: "https://i.pravatar.cc/100?img=26", color: "bg-cyan-600" },
  { name: "Samuel T.", package: "10GB AT", time: "15 mins ago", text: "bought 10GB AT bundle on DATA1GH. Lowest prices anywhere!", avatar: "https://i.pravatar.cc/100?img=52", color: "bg-blue-500" },
  { name: "Gifty A.", package: "5GB MTN", time: "17 mins ago", text: "5GB MTN received within 15 seconds from BIGJ DATA. Real life saver!", avatar: "https://i.pravatar.cc/100?img=20", color: "bg-emerald-500" },
  { name: "Bright N.", package: "2GB Telecel", time: "18 mins ago", text: "bought 2GB Telecel from DATA1GH. No delays, instant notification.", avatar: "https://i.pravatar.cc/100?img=53", color: "bg-violet-600" },
  { name: "Serwaa K.", package: "15GB Telecel", time: "20 mins ago", text: "ordered 15GB Telecel from BIGJ DATA. Excellent customer support!", avatar: "https://i.pravatar.cc/100?img=23", color: "bg-amber-600" },
  { name: "Richmond A.", package: "10GB MTN", time: "22 mins ago", text: "10GB MTN delivered directly to my phone by BIGJ DATA. Legit plug!", avatar: "https://i.pravatar.cc/100?img=54", color: "bg-red-600" },
  { name: "Mercy D.", package: "4GB AT", time: "25 mins ago", text: "got 4GB AT on DATA1GH. Automated system is top notch.", avatar: "https://i.pravatar.cc/100?img=24", color: "bg-lime-600" },
  { name: "Desmond B.", package: "5GB MTN", time: "27 mins ago", text: "bought 5GB MTN from BIGJ DATA. Cheaper than standard telco rates!", avatar: "https://i.pravatar.cc/100?img=56", color: "bg-sky-600" },
  { name: "Priscilla O.", package: "1GB Telecel", time: "30 mins ago", text: "1GB Telecel bought on DATA1GH. Delivery received before receipt loaded!", avatar: "https://i.pravatar.cc/100?img=29", color: "bg-purple-500" },
  { name: "Collins M.", package: "20GB MTN", time: "33 mins ago", text: "loaded 20GB MTN heavy data on BIGJ DATA. Fast, cheap, and safe.", avatar: "https://i.pravatar.cc/100?img=57", color: "bg-blue-700" },
  { name: "Eunice Y.", package: "2GB MTN", time: "35 mins ago", text: "bought 2GB MTN from BIGJ DATA. Legit vendor in Ghana!", avatar: "https://i.pravatar.cc/100?img=41", color: "bg-emerald-700" },
  { name: "Isaac F.", package: "15GB AT", time: "38 mins ago", text: "15GB AT received smoothly on DATA1GH. Great job team!", avatar: "https://i.pravatar.cc/100?img=58", color: "bg-orange-600" },
  { name: "Vida K.", package: "5GB Telecel", time: "40 mins ago", text: "got 5GB Telecel from BIGJ DATA. Smooth transaction with Paystack.", avatar: "https://i.pravatar.cc/100?img=42", color: "bg-fuchsia-600" },
  { name: "Kelvin P.", package: "10GB MTN", time: "43 mins ago", text: "bought 10GB MTN on DATA1GH. Trusted and tested, my daily data dealer.", avatar: "https://i.pravatar.cc/100?img=59", color: "bg-amber-700" },
  { name: "Belinda S.", package: "3GB AT", time: "45 mins ago", text: "received 3GB AT from BIGJ DATA instantly. Always on point!", avatar: "https://i.pravatar.cc/100?img=45", color: "bg-green-600" },
  { name: "Justice E.", package: "6GB MTN", time: "48 mins ago", text: "6GB MTN received within seconds. BIGJ DATA never disappoints.", avatar: "https://i.pravatar.cc/100?img=61", color: "bg-cyan-700" },
  { name: "Rita A.", package: "4GB Telecel", time: "50 mins ago", text: "purchased 4GB Telecel from DATA1GH. Clean interface and super fast.", avatar: "https://i.pravatar.cc/100?img=48", color: "bg-rose-700" },
  { name: "Francis K.", package: "1GB AT", time: "52 mins ago", text: "1GB AT instantly delivered by BIGJ DATA. 5-star service!", avatar: "https://i.pravatar.cc/100?img=62", color: "bg-indigo-700" },
  { name: "Dorothy N.", package: "10GB MTN", time: "55 mins ago", text: "10GB MTN received immediately from BIGJ DATA. Truly legit!", avatar: "https://i.pravatar.cc/100?img=36", color: "bg-blue-600" },
  { name: "Dennis Q.", package: "20GB AT", time: "58 mins ago", text: "bought 20GB AT from DATA1GH. Saved so much money today!", avatar: "https://i.pravatar.cc/100?img=65", color: "bg-emerald-600" },
];

export default function SocialProofPopup() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [lastIndex, setLastIndex] = useState(-1);

  useEffect(() => {
    let timeoutId;
    let isMounted = true;

    const cycle = () => {
      // Pick random index that is not the same as lastIndex
      let nextIdx = Math.floor(Math.random() * REVIEWS.length);
      while (nextIdx === lastIndex && REVIEWS.length > 1) {
        nextIdx = Math.floor(Math.random() * REVIEWS.length);
      }

      setCurrentIndex(nextIdx);
      setLastIndex(nextIdx);
      setIsVisible(true);

      // Stay visible for 5 seconds
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        setIsVisible(false);

        // Wait 4 seconds before triggering the next review
        timeoutId = setTimeout(() => {
          if (!isMounted) return;
          cycle();
        }, 4000);
      }, 5000);
    };

    // Initial delay before first popup shows
    timeoutId = setTimeout(cycle, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const current = REVIEWS[currentIndex];

  if (!current) return null;

  const initials = current.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <aside
      aria-label="Recent Customer Activity"
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        zIndex: 50,
      }}
      className={`transition-all duration-700 ease-out transform pointer-events-auto max-w-[340px] sm:max-w-sm ${
        isVisible
          ? "translate-x-0 opacity-100 scale-100"
          : "-translate-x-24 opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xl shadow-emerald-500/10 flex items-start gap-3 relative overflow-hidden group">
        {/* Subtle accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-amber-400 to-emerald-600 rounded-l" />

        {/* Avatar / Initials */}
        <div className="relative shrink-0 mt-0.5">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500/30 flex items-center justify-center font-bold text-white text-xs shadow-inner">
            <img
              src={current.avatar}
              alt={current.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to colorful initials if external image fails
                e.currentTarget.style.display = "none";
              }}
            />
            <div className={`w-full h-full ${current.color} flex items-center justify-center -z-10 absolute inset-0`}>
              {initials}
            </div>
          </div>
          {/* Verified pulse badge */}
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {current.name}
            </h4>
            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
              {current.time}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
            {current.text}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full">
              ✓ Verified Buyer
            </span>
            <span className="text-[9px] text-slate-400">
              BIGJ DATA Instant Delivery
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-0.5 rounded"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
