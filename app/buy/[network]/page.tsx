import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import BuyClientView from "./BuyClientView";
import DeliveryTrackerCard from "@/components/DeliveryTrackerCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BuyNetworkPage({
  params,
}: {
  params: Promise<{ network: string }>;
}) {
  const { network } = await params;
  const decodedNetwork = decodeURIComponent(network).toLowerCase();

  const settings = await db.getSettings();
  const products = await db.getProducts(decodedNetwork);

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
