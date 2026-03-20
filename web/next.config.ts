import type { NextConfig } from "next";

// Extraer el hostname del dominio público de R2 para permitirlo en next/image
const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";
let r2Hostname = "*.r2.dev"; // fallback para dominios pub-xxx.r2.dev
try {
  if (r2PublicUrl) r2Hostname = new URL(r2PublicUrl).hostname;
} catch {}

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
        hostname: r2Hostname,
      },
    ],
  },
};

export default nextConfig;
