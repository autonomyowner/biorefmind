import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Shipment photos live in Convex file storage.
    remotePatterns: [{ protocol: "https", hostname: "*.convex.cloud", pathname: "/api/storage/**" }],
  },
};

export default nextConfig;
