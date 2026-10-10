import type { Metadata } from "next";
import MasterKeyPortalClient from "./MasterKeyPortalClient";

export const metadata: Metadata = {
  title: "Master Key Portal | BundleMartGh",
  description: "Developer API Master Key Access Portal",
};

export default function MasterKeyPortalPage() {
  return <MasterKeyPortalClient />;
}