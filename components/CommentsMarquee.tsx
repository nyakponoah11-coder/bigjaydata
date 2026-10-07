"use client";

import React from "react";
import { MessageSquare, CheckCircle2 } from "lucide-react";

const COMMENTS = [
  { name: "Kwame A.", package: "10GB MTN", text: "bought 10GB MTN from BundleMartGh and received instantly! Legit!" },
  { name: "Abena M.", package: "5GB Telecel", text: "purchased 5GB Telecel from BundleMartGh in 30 seconds! Highly recommended." },
  { name: "Kofi B.", package: "20GB MTN", text: "got 20GB MTN from BundleMartGh. Fastest data delivery in Ghana!" },
  { name: "Yaw O.", package: "2GB AT", text: "received 2GB AT data. Always reliable and cheapest prices on BundleMartGh." },
  { name: "Akosua D.", package: "15GB MTN", text: "loaded 15GB MTN for work. BundleMartGh delivery is 100% automated!" },
  { name: "Emmanuel K.", package: "4GB Telecel", text: "bought 4GB Telecel on BundleMartGh. Arrived within 45 seconds." },
  { name: "Efua S.", package: "6GB MTN", text: "got 6GB MTN from BundleMartGh. Chale, I recommend this store to everyone!" },
  { name: "Nana Yaw", package: "10GB Telecel", text: "bought 10GB Telecel from BundleMartGh. Very genuine service bossu!" },
  { name: "Kojo Mensah", package: "5GB AT", text: "just ordered 5GB AT data on BundleMartGh and it dropped immediately." },
  { name: "Prince Osei", package: "20GB Telecel", text: "received 20GB Telecel data from BundleMartGh. Smooth Paystack payment!" },
  { name: "Ama Boateng", package: "3GB MTN", text: "got 3GB MTN bundle on BundleMartGh. Thank you for the quick top-up!" },
  { name: "Samuel T.", package: "10GB AT", text: "bought 10GB AT bundle on BundleMartGh. Lowest prices anywhere!" },
  { name: "Gifty A.", package: "5GB MTN", text: "5GB MTN received within 15 seconds from BundleMartGh. Real life saver!" },
  { name: "Serwaa K.", package: "15GB Telecel", text: "ordered 15GB Telecel from BundleMartGh. Excellent customer support!" },
  { name: "Richmond A.", package: "10GB MTN", text: "10GB MTN delivered directly to my phone by BundleMartGh. Legit plug!" },
  { name: "Belinda S.", package: "3GB AT", text: "received 3GB AT from BundleMartGh instantly. Always on point!" },
];

export default function CommentsMarquee() {
  return (
    <div className="w-full bg-amber-50/90 dark:bg-slate-900/90 border-b border-amber-200/80 dark:border-slate-800 py-1.5 sm:py-2 px-3 sm:px-4 overflow-hidden relative shadow-xs backdrop-blur-xs">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Tag Pill */}
        <span className="shrink-0 flex items-center gap-1.5 bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-xs">
          <MessageSquare className="w-3 h-3 fill-slate-950 shrink-0" />
          <span>Reviews</span>
        </span>

        {/* Circular Non-Stop Seamless Rolling Marquee */}
        <div className="relative w-full overflow-hidden whitespace-nowrap">
          <div className="animate-marquee-seamless flex items-center">
            {/* First Loop */}
            <div className="flex shrink-0 items-center gap-6 sm:gap-8 pr-6 sm:pr-8">
              {COMMENTS.map((c, i) => (
                <span key={`a-${i}`} className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                  <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
                    {c.package}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 font-normal">"{c.text}"</span>
                  <span className="text-amber-500 font-bold ml-2">•</span>
                </span>
              ))}
            </div>

            {/* Cloned Loop for continuous circular animation that never stops */}
            <div className="flex shrink-0 items-center gap-6 sm:gap-8 pr-6 sm:pr-8" aria-hidden="true">
              {COMMENTS.map((c, i) => (
                <span key={`b-${i}`} className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                  <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
                    {c.package}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 font-normal">"{c.text}"</span>
                  <span className="text-amber-500 font-bold ml-2">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
