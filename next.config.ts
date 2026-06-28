import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/dashboard/dividends", destination: "/dashboard/events", permanent: false }];
  },
};

export default nextConfig;
