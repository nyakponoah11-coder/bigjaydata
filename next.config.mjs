/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@whiskeysockets/baileys", "pino", "jimp"],
  typescript: {
    ignoreBuildErrors: true,
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
