import Link from "next/link";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
  Zap,
  ShieldCheck,
  Clock,
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
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200/60">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-emerald-500/10 via-teal-500/5 to-amber-500/10 blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm font-semibold mb-6 shadow-xs animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wide">Direct Telco Gateway • Instant 60-Sec Delivery</span>
          </div>

          {/* Dynamic Store Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Get High-Speed Data On <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              {settings.store_name}
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The fastest, cheapest, and most trusted mobile data portal in Ghana. Buy MTN, Telecel, and AT data packages at discounted rates with automatic delivery.
          </p>

          {/* Quick CTA buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href="#networks"
              className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-600/20 flex items-center gap-2 transform hover:-translate-y-0.5 transition-all"
            >
              <Zap className="w-4 h-4 fill-current text-amber-300" />
              Buy Data Bundles Now
            </a>
            <Link
              href="/track"
              className="px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-sm sm:text-base shadow-xs flex items-center gap-2 hover:border-slate-400 transition-all"
            >
              Track Existing Order
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>

          {/* Key Metric Badges */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-base sm:text-lg">&lt; 60s</div>
                <div className="text-xs text-slate-500">Average Delivery</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-base sm:text-lg">Up to 40%</div>
                <div className="text-xs text-slate-500">Cheaper than Telcos</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-base sm:text-lg">100% Safe</div>
                <div className="text-xs text-slate-500">Paystack Protected</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-base sm:text-lg">24/7 Desk</div>
                <div className="text-xs text-slate-500">WhatsApp & Live Chat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 BEAUTIFUL NETWORK CARDS (Dynamic & Expandable) */}
      <section id="networks" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            Select Your Telco
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Choose Your Network & Package
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Select any network below to view all available bundles and purchase directly in 2 clicks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {allNetworkKeys.map((networkKey) => {
            const theme = getNetworkTheme(networkKey);
            const hasPackages = networkProducts.length > 0;
            const startingPrice = hasPackages
              ? Math.min(...networkProducts.map((p) => p.price))
              : null;
            const packageCount = networkProducts.length;

            return (
              <div
                key={networkKey}
                className={`group bg-white rounded-3xl p-7 border-2 ${theme.cardBorder} shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col relative overflow-hidden transform hover:-translate-y-1.5`}
              >
                {/* Network decorative top gradient line */}
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${theme.gradient}`} />

                {/* Top Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl ${theme.iconBg} flex items-center justify-center font-extrabold text-xl shadow-md`}>
                    {networkKey.toUpperCase().slice(0, 3)}
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${theme.tagColor}`}>
                    {theme.tag}
                  </span>
                </div>

                {/* Network Info */}
                <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {theme.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed min-h-[40px]">
                  {theme.desc}
                </p>

                {/* Price anchor & package count */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Starting from</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {startingPrice !== null ? `GHS ${startingPrice.toFixed(2)}` : "Best Rates"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {packageCount > 0 ? `${packageCount} Packages` : "Live Setup"}
                    </span>
                  </div>
                </div>

                {/* Network features preview */}
                <ul className="mt-5 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Instant automatic line crediting</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Non-expiry bundles supported</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Secure checkout with Paystack</span>
                  </li>
                </ul>

                {/* Buy Button */}
                <div className="mt-7 pt-2">
                  <Link
                    href={`/buy/${networkKey}`}
                    className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all bg-gradient-to-r ${theme.btnGradient}`}
                  >
                    <span>Buy {theme.title} Data</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* WHY CHOOSE BIGJ DATA / FEATURES SECTION */}
      <section className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Why Customers Love Us
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Built for Speed, Reliability & Savings
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              No signups, no complicated steps. Enter your number, pay, and receive your bundle immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Automated Fast Delivery</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Our server integrates directly with high-speed telco gateways via DataMart API. As soon as your Paystack payment clears, your data is pushed instantly to your phone.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-6">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Unbeatable Cheap Prices</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Save significantly compared to buying standard data on telecom shortcodes. We offer wholesale rates passed directly on to you so you can browse more for less.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-6">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">24/7 Human & Live Support</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Have questions or need manual confirmation? Our dedicated team is online around the clock on WhatsApp and Live Chat to assist you with any inquiries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / 3 SIMPLE STEPS */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            Simple 3-Step Process
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            How to Buy Data on {settings.store_name}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-3xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center mb-4 shadow-md shadow-emerald-500/20">
              1
            </div>
            <h4 className="font-bold text-base text-slate-900 mb-1">Select Network & Package</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pick MTN, Telecel, or AT and choose any data bundle size from 1GB up to 20GB+.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-white rounded-3xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-teal-600 text-white font-extrabold text-lg flex items-center justify-center mb-4 shadow-md shadow-teal-500/20">
              2
            </div>
            <h4 className="font-bold text-base text-slate-900 mb-1">Enter Phone & Pay</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Provide the phone number to receive the data and checkout securely with Paystack Mobile Money or Card.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-white rounded-3xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 font-extrabold text-lg flex items-center justify-center mb-4 shadow-md shadow-amber-500/20">
              3
            </div>
            <h4 className="font-bold text-base text-slate-900 mb-1">Instant Data Delivery</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Receive your telco SMS confirmation and start browsing instantly. View your live receipt anytime!
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
