import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",        // pub-xxx.r2.dev (acceso público R2)
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com", // endpoint directo R2
      },
    ],
  },
};

export default nextConfig;
