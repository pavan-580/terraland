import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
  allowedDevOrigins: ["*.loca.lt"],
};

export default nextConfig;
