import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-right" },
  distDir: process.env.PAGERADAR_DIST_DIR || ".next",
  output: "standalone",
};

export default nextConfig;
