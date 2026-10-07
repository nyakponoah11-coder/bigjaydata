import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ReceiptClientView from "./ReceiptClientView";
import DeliveryTrackerCard from "@/components/DeliveryTrackerCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 0;

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const decodedRef = decodeURIComponent(reference).trim();

  const settings = await db.getSettings();
  const order = await db.getOrderByReference(decodedRef);

  const safeSettings: typeof settings = {
    ...settings,
    datamart_api_key: "",
    datamart_api_url: "",
    paystack_secret_key: "",
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        storeName={settings.store_name}
        whatsappNumber={settings.whatsapp_number}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Live Delivery Tracker at top */}
        <DeliveryTrackerCard />

        <div className="mb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>
        </div>

        <ReceiptClientView
          initialOrder={order}
          reference={decodedRef}
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
