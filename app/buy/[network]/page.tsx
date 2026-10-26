import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import BuyClientView from "./BuyClientView";
import DeliveryTrackerCard from "@/components/DeliveryTrackerCard";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BuyNetworkPage({
  params,
}: {
  params: Promise<{ network: string }>;
}) {
  const { network } = await params;
  const decodedNetwork = decodeURIComponent(network).toLowerCase();

  const config = await db.getAgentStoreConfig();
  const headersList = await headers();
  const host = (headersList.get("host") || "").toLowerCase();
  const customDomain = config.custom_domain?.toLowerCase().trim();
  const isMainPlatformHost =
    host.includes("vercel.app") ||
    host.includes("bundlemartgh") ||
    host.includes("bigjaydata") ||
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("0.0.0.0");

  const isWhiteLabelHost =
    !isMainPlatformHost &&
    Boolean(
      (customDomain && host.includes(customDomain)) ||
      host.includes("fastdata") ||
      host.includes("portal")
    );

  if (isWhiteLabelHost) {
    const cookieStore = await cookies();
    const lastAgent = cookieStore.get("bmgh_last_agent")?.value;
    const targetSlug = lastAgent ? encodeURIComponent(lastAgent) : "stony";
    redirect(`/${targetSlug}`);
  }

  const settings = await db.getSettings();
  let products = await db.getProducts(decodedNetwork);
  if (decodedNetwork === "netflix" && (!products || products.length === 0)) {
    products = [
      {
        id: "netflix-30-days",
        network: "netflix",
        size: "30-Day Premium Access",
        price: Number(settings.netflix_price || 25),
        is_active: settings.netflix_enabled !== false,
        created_at: new Date().toISOString(),
      },
    ];
  }

  // Omit all backend API keys and datamart configuration from client props
  const {
    datamart_api_key: _dmKey,
    datamart_api_url: _dmUrl,
    paystack_secret_key: _psSecret,
    ...safeSettings
  } = settings as any;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        storeName={settings.store_name}
        whatsappNumber={settings.whatsapp_number}
        whatsappChannelUrl={settings.whatsapp_channel_url}
      />

      <AnnouncementBanner
        text={settings.announcement_text}
        isActive={settings.announcement_active}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Live Delivery Tracker at the top */}
        <DeliveryTrackerCard />

        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Networks
          </Link>
        </div>

        {/* Client View for Selecting Packages and Opening Checkout Modal */}
        <BuyClientView
          network={decodedNetwork}
          products={products}
          settings={safeSettings}
        />
      </main>

      <WhatsAppButton
        whatsappNumber={settings.whatsapp_number}
        whatsappChannelUrl={settings.whatsapp_channel_url}
        storeName={settings.store_name}
      />

      <Footer
        storeName={settings.store_name}
        supportPhone={settings.support_phone}
        whatsappNumber={settings.whatsapp_number}
        email={settings.email}
      />
    </div>
  );
}
