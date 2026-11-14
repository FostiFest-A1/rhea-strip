import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rhea/sdk"],
  experimental: { cpus: 4, workerThreads: false },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
