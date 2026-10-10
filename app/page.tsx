import Link from "next/link";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import WhatsAppButton from "@/components/WhatsAppButton";
import CommentsMarquee from "@/components/CommentsMarquee";
import NetworkSelectionSection from "@/components/NetworkSelectionSection";
import HowToBuyAccordion from "@/components/HowToBuyAccordion";
import BackgroundVideo from "@/components/BackgroundVideo";
import HeroActionButtons from "@/components/HeroActionButtons";
import DownloadAppBanner from "@/components/DownloadAppBanner";
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

export const dynamic = "force-dynamic";
export const revalidate = 0; // Dynamic on every request to reflect admin settings immediately

export default async function HomePage() {
  const config = await db.getAgentStoreConfig();

  // White-Label Bounce-Back Protection:
  // If the visitor accesses through the fastdata/custom agent domain, NEVER let them see BundleMart!
  const headersList = await headers();
  const host = (headersList.get("host") || "").toLowerCase();
  const customDomain = config.custom_domain?.toLowerCase().trim();
  const isWhiteLabelHost =
    (customDomain && host.includes(customDomain)) ||
    host.includes("fastdata") ||
    host.includes("portal") ||
    (!host.includes("bundlemartgh") && !host.includes("localhost") && !host.includes("127.0.0.1") && !host.includes("0.0.0.0"));

  if (isWhiteLabelHost) {
    const cookieStore = await cookies();
    const lastAgent = cookieStore.get("bmgh_last_agent")?.value;
    const targetSlug = lastAgent ? encodeURIComponent(lastAgent) : "stony";
    redirect(`/${targetSlug}`);
  }

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

  return (
    <div className="min-h-screen flex flex-col text-slate-100 relative">
      {/* Background Video from Pinterest (Auto-playing, looped, and visible) */}
      <BackgroundVideo />

      {/* Main Page Content Layer */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Navigation */}
        <Navbar
          storeName={settings.store_name}
          whatsappNumber={settings.whatsapp_number}
          whatsappChannelUrl={settings.whatsapp_channel_url}
          isAgentStoreEnabled={config.is_enabled}
        />

      {/* Customer Comments Cards with Avatars (Comes First) */}
      <CommentsMarquee />

      {/* Top Announcement Marquee Banner */}
      <AnnouncementBanner
        text={settings.announcement_text}
        isActive={settings.announcement_active}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 lg:pt-14 lg:pb-16 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Card */}
          <div className="max-w-4xl mx-auto rounded-3xl bg-slate-900/85 border-2 border-amber-400/40 shadow-2xl shadow-amber-500/10 p-6 sm:p-10 lg:p-12 text-center relative overflow-hidden backdrop-blur-md">
            {/* Subtle top glow highlight */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-amber-400/20 to-transparent blur-2xl pointer-events-none" />

            {/* Dynamic Store Headline */}
            <h1 className="relative text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-3xl mx-auto leading-tight sm:leading-tight">
              Get High-Speed Data On <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                {settings.store_name}
              </span>
            </h1>

            {/* Subtext */}
            <p className="relative mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
              The fastest, cheapest, and most trusted mobile data portal in Ghana. Buy MTN, Telecel, and AT data packages at discounted rates with automatic delivery.
            </p>

            {/* 3 Action Buttons: BUY | TRACK | HELP */}
            <HeroActionButtons
              storeName={settings.store_name}
              whatsappNumber={settings.whatsapp_number}
              whatsappChannelUrl={settings.whatsapp_channel_url}
            />
          </div>
        </div>
      </section>

      {/* MOBILE APP / APK INSTALL BANNER (ANDROID & IPHONE) */}
      <DownloadAppBanner storeName={settings.store_name} />

      {/* LAPTOP-FRIENDLY & SOLID BLACK NETWORK CARDS */}
      <NetworkSelectionSection
        products={products}
        settings={settings}
      />

      {/* HOW TO BUY DATA - DROP LIST FORM ACCORDION */}
      <HowToBuyAccordion storeName={settings.store_name} />

      {/* WHY CUSTOMERS LOVE US - POSITIONED DIRECTLY ABOVE FOOTER */}
      <section className="py-10 sm:py-14 bg-slate-900/80 border-y border-slate-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full">
              Why Customers Love Us
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Built for Speed, Reliability & Savings
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              No signups, no complicated steps. Enter your number, pay, and receive your bundle immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Automated Fast Delivery</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct integration with high-speed telecom gateways. As soon as payment completes, your bundle is pushed instantly to your phone.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
                <TrendingDown className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Unbeatable Cheap Prices</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Save significantly compared to buying standard data on telecom shortcodes. Wholesale rates passed directly to you.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-500/30 text-teal-400 flex items-center justify-center mb-3">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">24/7 Live Support</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Have questions or need assistance? Our dedicated team is online around the clock on WhatsApp and Live Chat to assist you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FLOATING WHATSAPP CHANNEL WIDGET */}
      <WhatsAppButton
        whatsappNumber={settings.whatsapp_number}
        whatsappChannelUrl={settings.whatsapp_channel_url}
        storeName={settings.store_name}
      />

      {/* FOOTER */}
      <Footer
        storeName={settings.store_name}
        supportPhone={settings.support_phone}
        whatsappNumber={settings.whatsapp_number}
        email={settings.email}
        isAgentStoreEnabled={config.is_enabled}
      />
      </div>
    </div>
  );
}

