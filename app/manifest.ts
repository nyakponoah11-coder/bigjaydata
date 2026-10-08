import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Big Jay Data",
    short_name: "BigJayData",
    description: "Instant Mobile Data Bundles in Ghana — MTN, Telecel & AT",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1320",
    theme_color: "#10b981",
    orientation: "portrait",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
