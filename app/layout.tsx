import type { Metadata } from "next";
import "./globals.css";
import SocialProofPopup from "@/components/SocialProofPopup";

export const metadata: Metadata = {
  title: "BIGJ DATA | Instant Mobile Data Bundles in Ghana",
  description:
    "Buy cheap MTN, Telecel, and AT data bundles instantly in Ghana. Fully automated 24/7 delivery to your phone line via Paystack.",
  keywords: "BIGJ DATA, buy data Ghana, MTN cheap data, Telecel data bundle, AT data, instant internet Ghana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
        {children}
        <SocialProofPopup />
      </body>
    </html>
  );
}
