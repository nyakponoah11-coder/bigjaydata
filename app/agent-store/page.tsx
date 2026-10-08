import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import AgentStoreClientView from "./AgentStoreClientView";

export const revalidate = 0;

export default async function AgentStorePage() {
  const settings = await db.getSettings();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        storeName={settings.store_name}
        whatsappNumber={settings.whatsapp_number}
        whatsappChannelUrl={settings.whatsapp_channel_url}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <AgentStoreClientView
          storeName={settings.store_name}
          whatsappNumber={settings.whatsapp_number}
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
