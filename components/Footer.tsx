"use client";

import React from "react";
import Link from "next/link";
import { Signal, Phone, MessageCircle, Mail, ShieldCheck, Heart } from "lucide-react";

interface Props {
  storeName?: string;
  supportPhone?: string;
  whatsappNumber?: string;
  email?: string;
}

export default function Footer({
  storeName = "BundleMartGh",
  supportPhone = "+233 55 123 4567",
  whatsappNumber = "233551234567",
  email = "support@bundlemartgh.com",
}: Props) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md bg-black flex items-center justify-center p-0.5 border border-slate-800">
                <img
                  src="/logo.png"
                  alt={storeName}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                {storeName}
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ghana's premier automated mobile data platform. Get instant, affordable MTN, Telecel, and AT data packages delivered directly to your line in seconds.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Guaranteed Telco Delivery</span>
            </div>
          </div>

          {/* Quick Networks */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Data Networks
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/buy/mtn" className="hover:text-amber-400 flex items-center gap-2 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  MTN Ghana Bundles
                </Link>
              </li>
              <li>
                <Link href="/buy/telecel" className="hover:text-red-400 flex items-center gap-2 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  Telecel Ghana Bundles
                </Link>
              </li>
              <li>
                <Link href="/buy/at" className="hover:text-blue-400 flex items-center gap-2 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  AT (AirtelTigo) Bundles
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-emerald-400 flex items-center gap-2 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Track Any Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Help */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/track" className="hover:text-white transition-colors">
                  Check Delivery Status
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Hello%20${encodeURIComponent(storeName)},%20I%20have%20an%20inquiry`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Live WhatsApp Chat
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info Column */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              24/7 Support Desk
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{supportPhone}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-white truncate">
                  {email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 font-medium"
                >
                  Chat with Support on WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {currentYear} {storeName}. All rights reserved. Automated Telco Gateway.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              Secured with <span className="font-semibold text-emerald-400">Paystack</span>
            </span>
            <span>•</span>
            <span className="text-slate-300 font-medium">Built by Stony</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
