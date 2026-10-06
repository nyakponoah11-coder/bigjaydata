import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import TrackClientView from "./TrackClientView";

export const revalidate = 0;

export default async function TrackPage() {
  const settings = await db.getSettings();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        storeName={settings.store_name}
        whatsappNumber={settings.whatsapp_number}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <TrackClientView storeName={settings.store_name} />
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
