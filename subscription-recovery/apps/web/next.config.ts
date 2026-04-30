import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@subscription-recovery/core"]
};

export default nextConfig;
