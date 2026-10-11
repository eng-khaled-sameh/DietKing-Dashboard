import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OpenNext for Cloudflare handles the build output transformation.
  // Do NOT set `output: "standalone"` or `output: "export"` — OpenNext manages this.
};

export default nextConfig;
