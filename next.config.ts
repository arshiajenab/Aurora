import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't use "standalone" on Vercel — Vercel manages the server runtime.
  // Keep it for self-hosted Docker/local-prod builds via a separate script.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.dummyjson.com",
      },
      {
        protocol: "https",
        hostname: "dummyjson.com",
      },
    ],
  },
};

export default nextConfig;
