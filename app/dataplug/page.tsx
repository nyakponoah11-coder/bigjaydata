import React from "react";
import type { Metadata } from "next";
import DataPlugStoreFinder from "@/components/DataPlugStoreFinder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DataPlug Network | Find Your Agent Store",
  description: "Find your local data agent store on DataPlug. Cheap non-expiry MTN, Telecel, and AT data with instant automated delivery.",
};

export default function DataPlugPage() {
  return <DataPlugStoreFinder />;
}
