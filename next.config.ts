import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const target =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_GRAPHQL_URL ||
      "http://localhost:3001/graphql";
    const destination = target.endsWith("/graphql") ? target : `${target}/graphql`;
    return [
      {
        source: "/graphql",
        destination,
      },
    ];
  },
};

export default nextConfig;
