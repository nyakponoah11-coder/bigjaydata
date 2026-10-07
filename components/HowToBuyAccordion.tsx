"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, CheckCircle2, Zap, Smartphone, ShieldCheck } from "lucide-react";

interface Props {
  storeName?: string;
}

export default function HowToBuyAccordion({ storeName = "BundleMartGh" }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      num: "1",
      title: "Select Network & Data Bundle",
      desc: "Tap your mobile network (MTN, Telecel, or AT) and choose the data package size you need at wholesale discounted rates.",
      icon: Smartphone,
      accent: "bg-amber-400 text-slate-950",
    },
    {
      num: "2",
      title: "Enter Phone Number & Pay",
      desc: "Type the recipient phone number. Complete payment securely via Paystack using MTN Mobile Money, Telecel Cash, AT Money, or Bank Card.",
      icon: ShieldCheck,
      accent: "bg-teal-500 text-slate-950",
    },
    {
      num: "3",
      title: "Instant Automated Delivery",
      desc: "Your data is dispatched automatically within 60 seconds directly to your telecom line. You will receive an official SMS confirmation.",
      icon: Zap,
      accent: "bg-emerald-500 text-slate-950",
    },
  ];

  return (
    <section className="py-6 sm:py-8 max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 shadow-xl transition-all overflow-hidden text-white">
        {/* Drop List Header Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left group transition-colors hover:bg-slate-800/60"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <HelpCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/90 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Guide
                </span>
                <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                  • 3 Simple Steps
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-extrabold text-white tracking-tight mt-0.5">
                How to Buy Data on {storeName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {isOpen ? "Click to close step-by-step instructions" : "Click to view easy step-by-step instructions"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400 hidden md:inline">
              {isOpen ? "Hide Steps" : "Show Steps"}
            </span>
            <div
              className={`w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 transition-transform duration-300 ${
                isOpen ? "rotate-180 bg-emerald-950 text-emerald-400 border border-emerald-500/30" : ""
              }`}
            >
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </button>

        {/* Dropdown Content Form */}
        {isOpen && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-slate-800 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.num}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-xs ${step.accent}`}>
                        {step.num}
                      </div>
                      <Icon className="w-5 h-5 text-slate-500" />
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-white">
                        {step.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Instant automated process</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between gap-3">
              <span>
                💡 <strong>Tip:</strong> New SIM lines should be verified before checkout to ensure instant telecom processing.
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-amber-400 font-bold hover:underline shrink-0 text-xs"
              >
                Close list ▲
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
