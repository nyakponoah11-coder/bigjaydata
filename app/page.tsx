import Link from "next/link";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import WhatsAppButton from "@/components/WhatsAppButton";
import CommentsMarquee from "@/components/CommentsMarquee";
import {
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Headphones,
  Smartphone,
  Star,
  CheckCircle,
  Award,
  Layers,
} from "lucide-react";

export const revalidate = 0; // Dynamic on every request to reflect admin settings immediately

export default async function HomePage() {
  const settings = await db.getSettings();
  const products = await db.getProducts();

  // Group products by network dynamically
  const networksMap = new Map<string, typeof products>();
  products.forEach((p) => {
    if (!p.is_active) return;
    const net = p.network.toLowerCase();
    if (!networksMap.has(net)) {
      networksMap.set(net, []);
    }
    networksMap.get(net)!.push(p);
  });

  // Network visual themes
  const getNetworkTheme = (network: string) => {
    switch (network.toLowerCase()) {
      case "mtn":
        return {
          title: "MTN Ghana",
          tag: "Most Popular",
          tagColor: "bg-amber-100 text-amber-900",
          gradient: "from-amber-400 via-yellow-400 to-amber-500",
          cardBorder: "border-amber-200 hover:border-amber-400",
          accentColor: "text-amber-600",
          btnGradient: "from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950",
          iconBg: "bg-amber-500 text-slate-950",
          desc: "Superfast 4G+/5G Turbo Data with 100% network uptime across all 16 regions.",
        };
      case "telecel":
        return {
          title: "Telecel Ghana",
          tag: "High Speed",
          tagColor: "bg-red-100 text-red-900",
          gradient: "from-red-500 via-rose-500 to-red-600",
          cardBorder: "border-red-200 hover:border-red-400",
          accentColor: "text-red-600",
          btnGradient: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white",
          iconBg: "bg-red-600 text-white",
          desc: "Lightning fast Telecel internet for streaming, heavy downloads, and remote work.",
        };
      case "at":
        return {
          title: "AT (AirtelTigo)",
          tag: "Best Value",
          tagColor: "bg-blue-100 text-blue-900",
          gradient: "from-blue-600 via-indigo-600 to-blue-700",
          cardBorder: "border-blue-200 hover:border-blue-400",
          accentColor: "text-blue-600",
          btnGradient: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white",
          iconBg: "bg-blue-600 text-white",
          desc: "Maximum gigabytes at unmatched pocket-friendly prices. No expiry guarantee.",
        };
      default:
        return {
          title: network.toUpperCase(),
          tag: "Active Network",
          tagColor: "bg-emerald-100 text-emerald-900",
          gradient: "from-emerald-500 via-teal-500 to-emerald-600",
          cardBorder: "border-emerald-200 hover:border-emerald-400",
          accentColor: "text-emerald-600",
          btnGradient: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white",
          iconBg: "bg-emerald-600 text-white",
          desc: `Premium data bundles for ${network.toUpperCase()} subscribers with instant delivery.`,
        };
    }
  };

  // Ensure MTN, Telecel, AT are always displayed first even if empty initially
  const defaultNetworkKeys = ["mtn", "telecel", "at"];
  const allNetworkKeys = Array.from(
    new Set([...defaultNetworkKeys, ...Array.from(networksMap.keys())])
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Announcement Marquee Banner (shows only if enabled in admin settings) */}
      <AnnouncementBanner
        text={settings.announcement_text}
        isActive={settings.announcement_active}
      />

      {/* Navigation */}
      <Navbar
        storeName={settings.store_name}
        whatsappNumber={settings.whatsapp_number}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 lg:pt-14 lg:pb-16 bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200/60">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-amber-500/10 via-yellow-400/10 to-amber-600/5 blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Yellow Hero Card */}
          <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-amber-100/90 via-yellow-50/85 to-amber-50/90 border-2 border-amber-300 shadow-xl shadow-amber-500/10 p-6 sm:p-10 lg:p-12 text-center relative overflow-hidden backdrop-blur-sm">
            {/* Subtle top glow highlight */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-amber-300/40 to-transparent blur-2xl pointer-events-none" />

            {/* Comments Marquee at the Top of the Card */}
            <CommentsMarquee />

            {/* Dynamic Store Headline */}
            <h1 className="relative text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto leading-tight sm:leading-tight">
              Get High-Speed Data On <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 bg-clip-text text-transparent">
                {settings.store_name}
              </span>
            </h1>

            {/* Subtext */}
            <p className="relative mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed font-medium">
              The fastest, cheapest, and most trusted mobile data portal in Ghana. Buy MTN, Telecel, and AT data packages at discounted rates with automatic delivery.
            </p>

            {/* Quick CTA buttons - opposite each other (side-by-side) on both phone and laptop */}
            <div className="relative mt-7 sm:mt-8 w-full max-w-md sm:max-w-lg mx-auto grid grid-cols-2 gap-2.5 sm:gap-4">
              <a
                href="#networks"
                className="w-full py-3 sm:py-3.5 px-2.5 sm:px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-xs sm:text-base shadow-lg shadow-amber-500/30 flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95"
              >
                <Zap className="w-4 h-4 fill-current text-slate-950 shrink-0" />
                <span className="truncate">Buy Data Bundles Now</span>
              </a>
              <Link
                href="/track"
                className="w-full py-3 sm:py-3.5 px-2.5 sm:px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs sm:text-base shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:border-slate-400 transition-all transform active:scale-95"
              >
                <span className="truncate">Track Existing Order</span>
                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3 BEAUTIFUL NETWORK CARDS (Compact, Sleek & Modern) */}
      <section id="networks" className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            Select Your Telco
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Choose Your Network & Package
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Select any network below to view all available bundles and purchase directly in 2 clicks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {allNetworkKeys.map((networkKey) => {
            const theme = getNetworkTheme(networkKey);
            const networkProducts = networksMap.get(networkKey) || [];
            const hasPackages = networkProducts.length > 0;
            const startingPrice = hasPackages
              ? Math.min(...networkProducts.map((p) => p.price))
              : null;
            const packageCount = networkProducts.length;

            return (
              <div
                key={networkKey}
                className={`group bg-white rounded-2xl p-4 sm:p-5 border ${theme.cardBorder} shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden transform hover:-translate-y-1`}
              >
                {/* Network decorative top gradient line */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.gradient}`} />

                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center font-black text-sm shadow-xs`}>
                      {networkKey.toUpperCase().slice(0, 3)}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${theme.tagColor}`}>
                      {theme.tag}
                    </span>
                  </div>

                  {/* Network Info */}
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {theme.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-snug line-clamp-2">
                    {theme.desc}
                  </p>
                </div>

                <div>
                  {/* Price anchor & package count */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Starting from</span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900">
                        {startingPrice !== null ? `GHS ${startingPrice.toFixed(2)}` : "Best Rates"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {packageCount > 0 ? `${packageCount} Packages` : "Live Setup"}
                      </span>
                    </div>
                  </div>

                  {/* Sleek inline features */}
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Instant auto-delivery • Non-expiry</span>
                  </div>

                  {/* Buy Button */}
                  <div className="mt-3.5">
                    <Link
                      href={`/buy/${networkKey}`}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all bg-gradient-to-r ${theme.btnGradient}`}
                    >
                      <span>Buy {theme.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* WHY CHOOSE BUNDLEMARTGH / FEATURES SECTION */}
      <section className="py-10 sm:py-14 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Why Customers Love Us
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Built for Speed, Reliability & Savings
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              No signups, no complicated steps. Enter your number, pay, and receive your bundle immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Automated Fast Delivery</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct integration with high-speed telecom gateways. As soon as payment completes, your bundle is pushed instantly to your phone.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Unbeatable Cheap Prices</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Save significantly compared to buying standard data on telecom shortcodes. Wholesale rates passed directly to you.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                <Headphones className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">24/7 Live Support</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Have questions or need assistance? Our dedicated team is online around the clock on WhatsApp and Live Chat to assist you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / 3 SIMPLE STEPS */}
      <section className="py-10 sm:py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            Simple 3-Step Process
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            How to Buy Data on {settings.store_name}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative">
          <div className="flex flex-col items-center text-center p-4 sm:p-5 bg-white rounded-2xl border border-slate-200">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center mb-2.5 shadow-sm">
              1
            </div>
            <h4 className="font-bold text-sm text-slate-900 mb-1">Select Network & Package</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pick MTN, Telecel, or AT and choose any data bundle size.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4 sm:p-5 bg-white rounded-2xl border border-slate-200">
            <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center mb-2.5 shadow-sm">
              2
            </div>
            <h4 className="font-bold text-sm text-slate-900 mb-1">Enter Phone & Pay</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter recipient number and pay securely with Paystack MoMo or Card.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4 sm:p-5 bg-white rounded-2xl border border-slate-200">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-extrabold text-sm flex items-center justify-center mb-2.5 shadow-sm">
              3
            </div>
            <h4 className="font-bold text-sm text-slate-900 mb-1">Instant Data Delivery</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Receive telco SMS confirmation and start browsing instantly.
            </p>
          </div>
        </div>
      </section>

      {/* FLOATING WHATSAPP & LIVE CHAT WIDGET */}
      <WhatsAppButton
        whatsappNumber={settings.whatsapp_number}
        storeName={settings.store_name}
      />

      {/* FOOTER */}
      <Footer
        storeName={settings.store_name}
        supportPhone={settings.support_phone}
        whatsappNumber={settings.whatsapp_number}
        email={settings.email}
      />
    </div>
  );
}
