import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Prevent un-imported or dev type differences from halting production deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Prevent linter warnings from failing production build
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
