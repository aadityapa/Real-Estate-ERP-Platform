import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@propos/shared-types", "@propos/shared-utils"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
  },
};

export default nextConfig;
