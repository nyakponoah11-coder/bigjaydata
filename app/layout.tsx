import type { Metadata } from "next";
import "./globals.css";
import FreeDataBanner from "@/components/FreeDataBanner";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export const metadata: Metadata = {
  metadataBase: new URL("https://fastdata-gh.vercel.app"),
  title: "BundleMartGh | Instant Mobile Data Bundles in Ghana",
  description:
    "Buy cheap MTN, Telecel, and AT data bundles instantly in Ghana. Fully automated 24/7 delivery to your phone line via Paystack.",
  keywords: "BundleMartGh, bundlemartgh, buy data Ghana, MTN cheap data, Telecel data bundle, AT data, instant internet Ghana",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "BundleMartGh",
    description: "Instant mobile data bundles portal in Ghana with automated delivery for MTN, Telecel, and AT.",
  },
  applicationName: "My Bundle",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "My Bundle",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // The emergency link switch page must ALWAYS stay accessible so the admin can turn maintenance off!
  const isEmergencyBypass =
    pathname === "/link" ||
    pathname.startsWith("/link/") ||
    pathname.startsWith("/api/link");

  let isMaintenance = false;
  let maintenanceMessage = "";
  let supportPhone = "";

  if (!isEmergencyBypass) {
    try {
      const settings = await db.getSettings();
      isMaintenance = Boolean(settings.maintenance_mode);
      maintenanceMessage = settings.maintenance_message || "";
      supportPhone = settings.whatsapp_number || settings.support_phone || "";
    } catch (_) {}
  }

  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
        <FreeDataBanner />
        {isMaintenance ? (
          <MaintenanceScreen message={maintenanceMessage} supportPhone={supportPhone} />
        ) : (
          children
        )}
      </body>
    </html>
  );
}
