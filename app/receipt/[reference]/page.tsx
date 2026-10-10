import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ReceiptClientView from "./ReceiptClientView";
import DeliveryTrackerCard from "@/components/DeliveryTrackerCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;
  const decodedRef = decodeURIComponent(reference).trim();

  try {
    const agentOrders = await db.getAgentOrders();
    const agOrder = agentOrders.find(
      (ao) => ao.reference.toLowerCase() === decodedRef.toLowerCase()
    );
    if (agOrder) {
      const agent = await db.getAgentById(agOrder.agent_id);
      if (agent) {
        return {
          title: `${agent.store_name} | Order Receipt & Status`,
          description: `Official purchase confirmation and live dispatch tracker for ${agent.store_name}.`,
          robots: { index: false, follow: false },
        };
      }
    }
  } catch (e) {}

  return {
    title: `Order Receipt | ${decodedRef}`,
    description: "Official transaction and automated data delivery confirmation.",
    robots: { index: false, follow: false },
  };
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const decodedRef = decodeURIComponent(reference).trim();

  const settings = await db.getSettings();
  const order = await db.getOrderByReference(decodedRef);

  // Check if this order was placed on an agent storefront
  let agent = null;
  try {
    const agentOrders = await db.getAgentOrders();
    const agOrder = agentOrders.find(
      (ao) => ao.reference.toLowerCase() === decodedRef.toLowerCase()
    );
    if (agOrder) {
      agent = await db.getAgentById(agOrder.agent_id);
    } else if (order?.datamart_response && typeof order.datamart_response === "object") {
      const respAgentId = (order.datamart_response as any).agent_id;
      if (respAgentId) {
        agent = await db.getAgentById(respAgentId);
      }
    }
  } catch (err) {
    // safe fallback
  }

  // Omit all backend API keys and datamart configuration from client props
  const {
    datamart_api_key: _dmKey,
    datamart_api_url: _dmUrl,
    paystack_secret_key: _psSecret,
    ...safeSettings
  } = settings as any;

  // If this order belongs to an agent, white-label all store details to the agent
  if (agent) {
    safeSettings.store_name = agent.store_name;
    safeSettings.whatsapp_number = agent.phone;
    safeSettings.support_phone = agent.phone;
  }

  const backUrl = agent ? `/s/${agent.store_slug}` : "/";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {agent ? (
        /* 100% White-Labeled Agent Header (bundlemartgh.com completely hidden) */
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-500/20">
                {agent.store_name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">{agent.store_name}</h1>
                <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Official Data Portal</p>
              </div>
            </div>
            <Link
              href={backUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Store
            </Link>
          </div>
        </header>
      ) : (
        <Navbar
          storeName={settings.store_name}
          whatsappNumber={settings.whatsapp_number}
          whatsappChannelUrl={settings.whatsapp_channel_url}
        />
      )}

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Live Delivery Tracker at top */}
        <DeliveryTrackerCard />

        <div className="mb-2">
          <Link
            href={backUrl}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {agent ? agent.store_name : "Store"}
          </Link>
        </div>

        <ReceiptClientView
          initialOrder={order}
          reference={decodedRef}
          settings={safeSettings}
          backUrl={backUrl}
        />
      </main>

      <WhatsAppButton
        whatsappNumber={agent ? agent.phone : settings.whatsapp_number}
        whatsappChannelUrl={agent ? undefined : settings.whatsapp_channel_url}
        storeName={agent ? agent.store_name : settings.store_name}
      />

      {agent ? (
        /* White-Labeled Agent Footer */
        <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-4xl mx-auto px-4 space-y-1.5">
            <p className="font-bold text-slate-800 text-sm">{agent.store_name}</p>
            <p className="text-slate-500 text-xs">Direct High-Speed Telecom Bundles in Ghana</p>
            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 max-w-xs mx-auto">
              Automated Data Portal • Built by Stony
            </p>
          </div>
        </footer>
      ) : (
        <Footer
          storeName={settings.store_name}
          supportPhone={settings.support_phone}
          whatsappNumber={settings.whatsapp_number}
          email={settings.email}
        />
      )}
    </div>
  );
}
